#!/usr/bin/env python3
"""
PreToolUse-привратник для Claude Code (детерминированный, без LLM).

Логика:
  - read-only / заведомо безопасное            -> allow (молча)
  - заведомо разрушительное                    -> deny  (блок + причина)
  - редактирование файлов внутри проекта        -> allow (кроме чувствительных)
  - всё остальное / непонятное                  -> обычный поток (молчим -> Claude спросит)

Принцип: allow только когда УВЕРЕНЫ, что безопасно; deny только когда УВЕРЕНЫ,
что разрушительно; во всех сомнительных случаях — отдаём решение пользователю.
Никогда не «фейлит-опен»: при любой ошибке разбора молчит -> обычный поток.

ВАЖНО: deny анализирует ВЕДУЩУЮ КОМАНДУ каждого сегмента цепочки, а не подстроку,
чтобы не блокировать безобидные команды, где опасный текст лежит в кавычках/аргументах
(напр. echo "rm -rf /", git rm --cached, claude -p "...rm -rf...").
"""
import sys, json, re, os

def emit(decision, reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }}))
    sys.exit(0)

def passthrough():
    sys.exit(0)

try:
    data = json.load(sys.stdin)
except Exception:
    passthrough()

tool = data.get("tool_name", "")
inp = data.get("tool_input", {}) or {}
cwd = data.get("cwd", "") or os.getcwd()

# ---------- разбор сегментов и ведущей команды ----------
def sanitize(cmd):
    """Убираем ДАННЫЕ (тело heredoc, содержимое кавычек), чтобы анализировать только
    реальные команды. Иначе опасные строки внутри echo/heredoc/аргументов ложно
    срабатывают (напр. python3 <<'PY' ... rm -rf / ... PY, или echo \"rm -rf /\")."""
    cmd = re.split(r'<<-?\s*[\'"]?\w+', cmd, maxsplit=1)[0]   # всё после <<MARKER — это данные
    cmd = re.sub(r'"[^"]*"', '""', cmd)               # содержимое двойных кавычек
    cmd = re.sub(r"'[^']*'", "''", cmd)               # содержимое одинарных кавычек
    return cmd

def split_segments(cmd):
    return [s for s in re.split(r'\|\||&&|\||;|\n', cmd) if s.strip()]

def lead_token(seg):
    """Ведущий бинарь сегмента: снимаем env-префиксы VAR=val, sudo, timeout N, command/nice/nohup."""
    toks = seg.strip().split()
    i = 0
    while i < len(toks) and re.match(r'^[A-Za-z_][A-Za-z0-9_]*=', toks[i]):
        i += 1
    while i < len(toks) and toks[i] in ("sudo", "command", "nice", "nohup", "stdbuf", "time", "env"):
        i += 1
        if i < len(toks) and toks[i-1] == "sudo" and toks[i] in ("-u", "-g"):
            i += 2
    if i < len(toks) and toks[i] == "timeout":
        i += 2
    if i >= len(toks):
        return "", []
    return toks[i].split("/")[-1], toks[i+1:]

# ---------- безопасные (read-only) команды ----------
SAFE_CMDS = {
    "cd",
    "ls","cat","head","tail","wc","grep","egrep","fgrep","rg","pwd","echo","which","type",
    "file","stat","date","tree","df","du","env","printenv","ps","whoami","uname","hostname",
    "sort","uniq","cut","tr","column","basename","dirname","realpath","sleep","true","false",
    "test","nl","tac","rev","seq","id","less","more","diff","cmp","comm","jq","shasum",
    "sha256sum","md5sum","printf",
}
GIT_RO = {"status","log","diff","show","branch","tag","remote","ls-files","ls-remote",
          "rev-parse","describe","blame","shortlog","cat-file","for-each-ref","reflog",
          "stash","worktree","config"}
GH_RO = {"pr","issue","run","repo","release","api","auth","workflow","browse","search","status"}

def segment_is_safe(seg):
    cmd, rest = lead_token(seg)
    if not cmd:
        return False
    if cmd in SAFE_CMDS:
        return True
    if cmd == "find":
        bad = {"-delete","-exec","-execdir","-ok","-okdir","-fprint","-fls","-files0-from"}
        return not any(t in bad for t in rest)
    if cmd == "sed":
        return "-i" not in rest and not any(t.startswith("-i") for t in rest)
    if cmd == "git":
        sub = next((t for t in rest if not t.startswith("-")), "")
        if sub not in GIT_RO:
            return False
        if sub == "config" and not any(t in ("--get","--get-all","--list","-l","--get-regexp") for t in rest):
            return False
        if sub in ("stash","worktree") and "list" not in rest:
            return False
        return True
    if cmd == "gh":
        sub = next((t for t in rest if not t.startswith("-")), "")
        if sub not in GH_RO:
            return False
        after = rest[rest.index(sub)+1:] if sub in rest else []
        verb = next((t for t in after if not t.startswith("-")), "")
        if sub == "api":
            return not any(re.match(r'(-X|--method)', t) for t in rest)
        return verb in ("view","list","diff","checks","status","")
    if cmd == "node":
        return "--check" in rest or "-v" in rest or "--version" in rest
    if cmd in ("python3", "python"):
        # генератор вопросов
        if rest[:1] == ["convert.py"]:
            return True
        # тест-харнес проекта: python3 tests/<...>.py
        if rest[:1] and rest[0].startswith("tests/") and rest[0].endswith(".py"):
            return True
        # локальный статик-сервер для браузерных тестов
        if rest[:2] == ["-m", "http.server"]:
            return True
        return False
    if cmd == "curl":
        # разрешаем только read-only HTTP GET: без отправки данных и без смены
        # метода на мутирующий (POST/PUT/DELETE/PATCH). GET к любому хосту ок.
        if any(t.startswith("--data") or t in ("-d","-F","--form","-T","--upload-file","--upload")
               for t in rest):
            return False
        for i, t in enumerate(rest):
            if t in ("-X", "--request"):
                method = rest[i+1].upper() if i + 1 < len(rest) else ""
                if method and method != "GET":
                    return False
        return True
    return False

# ---------- разрушительные команды (по ведущей команде сегмента) ----------
DANGER_TARGETS = {"/", "/*", "~", "~/", "$HOME", "${HOME}", "*", ".", "./", ".."}

def segment_deny_reason(seg):
    cmd, rest = lead_token(seg)
    # fork-бомба
    if re.search(r':\s*\(\s*\)\s*\{', seg):
        return "fork-бомба"
    if not cmd:
        return None
    if cmd == "rm":
        flags = "".join(t[1:] for t in rest if t.startswith("-") and not t.startswith("--"))
        recursive = ("r" in flags or "R" in flags or "--recursive" in rest)
        force = ("f" in flags or "--force" in rest)
        targets = [t for t in rest if not t.startswith("-")]
        # опасно: рекурсивно по корню/дому/'*' или по системному пути верхнего уровня (/etc, /usr…)
        top_level = any(t.startswith("/") and t.rstrip("/").count("/") <= 1 for t in targets)
        if recursive and (any(t in DANGER_TARGETS for t in targets) or top_level):
            return "rm -r по корню/домашней папке/'*'/системному пути"
        return None  # обычный rm -rf по проектному пути -> уйдёт в ask, не deny
    if cmd == "mkfs" or cmd.startswith("mkfs."):
        return "форматирование ФС (mkfs)"
    if cmd == "dd" and any(t.startswith("of=/dev/") for t in rest):
        return "dd запись в устройство"
    if cmd in ("chmod", "chown"):
        if ("-R" in rest or "--recursive" in rest) and any(t == "/" for t in rest):
            return f"рекурсивный {cmd} по корню"
    if cmd == "git":
        sub = next((t for t in rest if not t.startswith("-")), "")
        if sub == "push" and any(t in ("--force","-f","--force-with-lease") for t in rest):
            return "git push --force (перезапись истории remote)"
        if sub == "reset" and "--hard" in rest:
            return "git reset --hard (потеря изменений)"
        if sub == "clean" and any(re.match(r'-[a-zA-Z]*f', t) for t in rest):
            return "git clean -f (удаление неотслеживаемых файлов)"
    if cmd == "crontab" and "-r" in rest:
        return "crontab -r (удаление расписания)"
    # перезапись устройства/shell-конфига именно через редирект этого сегмента
    if re.search(r'>\s*/dev/(sd|nvme|disk|hd)', seg):
        return "перезапись блочного устройства"
    return None

# =========================================================
#  BASH
# =========================================================
if tool == "Bash":
    raw = inp.get("command", "") or ""
    cmd = sanitize(raw)
    segs = split_segments(cmd)
    # 1) deny — если ведущая команда любого сегмента разрушительна
    for s in segs:
        why = segment_deny_reason(s)
        if why:
            emit("deny", f"Заблокировано привратником: {why}. Если осознанно — запусти вручную.")
    # 2) скачивание-и-исполнение из сети (структура pipe curl/wget -> shell)
    if re.search(r'\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b', cmd):
        emit("deny", "Заблокировано привратником: скачивание и исполнение скрипта из сети (curl|sh).")
    # 3) allow — только если НЕТ подстановки команд $(...)/`...` И все сегменты безопасны.
    #    Подстановку проверяем по СЫРОЙ строке: $(...) может прятаться и внутри кавычек.
    if segs and "$(" not in raw and "`" not in raw and all(segment_is_safe(s) for s in segs):
        emit("allow", "Read-only / безопасная команда (детерминированный привратник).")
    passthrough()

# =========================================================
#  EDIT / WRITE / MULTIEDIT / NOTEBOOK
# =========================================================
if tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
    fp = inp.get("file_path") or inp.get("notebook_path") or ""
    if not fp:
        passthrough()
    ap = os.path.realpath(fp)
    proj = os.path.realpath(cwd)
    SENSITIVE = (r'/\.git/', r'\.env($|\.)', r'-key\.json$', r'\.pem$', r'id_rsa',
                 r'/\.ssh/', r'secret', r'\.claude/settings')
    if any(re.search(p, ap) for p in SENSITIVE):
        passthrough()
    if ap == proj or ap.startswith(proj + os.sep):
        emit("allow", "Правка файла внутри проекта (детерминированный привратник).")
    passthrough()

# прочие инструменты — не вмешиваемся
passthrough()
