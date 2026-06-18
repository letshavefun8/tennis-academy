#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P0-проверки артефакта questions.js.
Импортируется из run.py; сам по себе ничего не печатает и не пишет файлы.
"""

import json
import sys
import tempfile
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
QUESTIONS_JS = REPO_ROOT / "questions.js"
CONVERT_PY   = REPO_ROOT / "convert.py"

# Ожидаемые константы (зеркалируют convert.py)
EXPECTED_BLOCKS    = 17
EXPECTED_QUESTIONS = 116


def _load_questions_js(path=None):
    """
    Читает questions.js, отрезает префикс и финальную «;», возвращает dict.
    Возвращает (data, err_msg): при успехе err_msg=None.
    """
    target = Path(path) if path else QUESTIONS_JS
    try:
        raw = target.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None, f"Файл не найден: {target}"

    # Отрезаем JS-обёртку: «const QUESTION_BANK = » … «;»
    # Файл может начинаться с однострочного комментария — ищем маркер по всему тексту
    prefix = "const QUESTION_BANK = "
    idx = raw.find(prefix)
    if idx == -1:
        return None, "Не найдена строка 'const QUESTION_BANK = ' в файле"
    json_str = raw[idx + len(prefix):].strip()
    if json_str.endswith(";"):
        json_str = json_str[:-1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        return None, f"Ошибка JSON: {e}"
    return data, None


def _get_parse_from_convert():
    """
    Возвращает данные из convert.parse() без записи файлов.
    Fallback: subprocess во временную папку с подменой OUTPUT_FILE.
    Возвращает (data, err_msg).
    """
    # Сначала пробуем прямой импорт parse() — она не пишет файлов
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("convert", CONVERT_PY)
        mod  = importlib.util.module_from_spec(spec)
        # Подменяем SOURCE_FILE/OUTPUT_FILE чтобы не было side-эффектов
        spec.loader.exec_module(mod)
        data = mod.parse()
        return data, None
    except Exception as e:
        pass  # fallback ниже

    # Fallback: subprocess с переопределённым OUTPUT_FILE во временный файл
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_output = Path(tmpdir) / "questions_tmp.js"
            env_patch = f"""
import sys, pathlib
# Подменяем OUTPUT_FILE до загрузки модуля
import importlib.util
spec = importlib.util.spec_from_file_location("convert", {str(CONVERT_PY)!r})
mod  = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
# Запускаем parse без write_output
data = mod.parse()
import json
print(json.dumps(data, ensure_ascii=False))
"""
            result = subprocess.run(
                [sys.executable, "-c", env_patch],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                return None, f"subprocess convert: {result.stderr.strip()}"
            data = json.loads(result.stdout)
            return data, None
    except Exception as e:
        return None, f"Fallback subprocess: {e}"


def check_all(questions_js_path=None):
    """
    Выполняет все P0-проверки.
    Возвращает список (ok: bool, msg: str).
    """
    results = []

    def ok(msg):
        results.append((True, msg))

    def fail(msg):
        results.append((False, msg))

    # P0-1: файл парсится
    data, err = _load_questions_js(questions_js_path)
    if err:
        fail(f"P0-1 Парсинг questions.js: {err}")
        # Дальше без данных нет смысла
        return results
    ok("P0-1 Парсинг questions.js")

    blocks    = data.get("blocks", [])
    questions = data.get("questions", [])

    # P0-2: blocks.length === 17
    if len(blocks) == EXPECTED_BLOCKS:
        ok(f"P0-2 blocks.length == {EXPECTED_BLOCKS}")
    else:
        fail(f"P0-2 blocks.length: ожидается {EXPECTED_BLOCKS}, найдено {len(blocks)}")

    # P0-3: questions.length === 116
    if len(questions) == EXPECTED_QUESTIONS:
        ok(f"P0-3 questions.length == {EXPECTED_QUESTIONS}")
    else:
        fail(f"P0-3 questions.length: ожидается {EXPECTED_QUESTIONS}, найдено {len(questions)}")

    # P0-4: id вопросов = ровно 1..116
    ids = sorted(q.get("id") for q in questions)
    expected_ids = list(range(1, EXPECTED_QUESTIONS + 1))
    if ids == expected_ids:
        ok("P0-4 ID вопросов: ровно 1..116 без дублей/пропусков")
    else:
        missing = sorted(set(expected_ids) - set(ids))
        dupes   = sorted({x for x in ids if ids.count(x) > 1})
        fail(f"P0-4 ID вопросов: пропущены={missing}, дубликаты={dupes}")

    # P0-5: options.length === 4, ни один не пустой
    bad_opts = []
    for q in questions:
        opts = q.get("options", [])
        if len(opts) != 4:
            bad_opts.append(f"id={q.get('id')}: {len(opts)} вариантов")
        elif any(not str(o).strip() for o in opts):
            bad_opts.append(f"id={q.get('id')}: есть пустой вариант")
    if not bad_opts:
        ok("P0-5 options: у каждого ровно 4 непустых варианта")
    else:
        fail(f"P0-5 options: нарушения — {bad_opts[:5]}")

    # P0-6: correctIndex целый, 0 <= correctIndex < len(options)
    bad_ci = []
    for q in questions:
        ci   = q.get("correctIndex")
        opts = q.get("options", [])
        if not isinstance(ci, int) or not (0 <= ci < len(opts)):
            bad_ci.append(f"id={q.get('id')}: correctIndex={ci}")
    if not bad_ci:
        ok("P0-6 correctIndex: корректный у всех вопросов")
    else:
        fail(f"P0-6 correctIndex: нарушения — {bad_ci[:5]}")

    # P0-7: непустые text, topic, type, phase, explanation
    REQUIRED_FIELDS = ("text", "topic", "type", "phase", "explanation")
    bad_fields = []
    for q in questions:
        for f in REQUIRED_FIELDS:
            if not str(q.get(f, "")).strip():
                bad_fields.append(f"id={q.get('id')}: поле '{f}' пусто")
    if not bad_fields:
        ok(f"P0-7 Обязательные поля: text/topic/type/phase/explanation заполнены")
    else:
        fail(f"P0-7 Обязательные поля: нарушения — {bad_fields[:5]}")

    # P0-8: difficulty ∈ {"Б","С","П"}
    ALLOWED_DIFF = {"Б", "С", "П"}
    bad_diff = [f"id={q.get('id')}: '{q.get('difficulty')}'"
                for q in questions if q.get("difficulty") not in ALLOWED_DIFF]
    if not bad_diff:
        ok("P0-8 difficulty: только Б/С/П")
    else:
        fail(f"P0-8 difficulty: нарушения — {bad_diff[:5]}")

    # P0-9: blockId есть среди blocks[].id
    block_ids = {b.get("id") for b in blocks}
    bad_bid = [f"id={q.get('id')}: blockId={q.get('blockId')}"
               for q in questions if q.get("blockId") not in block_ids]
    if not bad_bid:
        ok("P0-9 blockId: каждый вопрос ссылается на существующий блок")
    else:
        fail(f"P0-9 blockId: нарушения — {bad_bid[:5]}")

    # P0-10: сумма questionCount === 116 И для каждого блока соответствует факту
    total_qc = sum(b.get("questionCount", 0) for b in blocks)
    if total_qc == EXPECTED_QUESTIONS:
        ok(f"P0-10a questionCount сумма == {EXPECTED_QUESTIONS}")
    else:
        fail(f"P0-10a questionCount сумма: ожидается {EXPECTED_QUESTIONS}, найдено {total_qc}")

    # Для каждого блока сравниваем questionCount с реальным числом вопросов
    per_block_bad = []
    for b in blocks:
        bid   = b.get("id")
        decl  = b.get("questionCount", 0)
        real  = sum(1 for q in questions if q.get("blockId") == bid)
        if decl != real:
            per_block_bad.append(f"blockId={bid}: questionCount={decl}, факт={real}")
    if not per_block_bad:
        ok("P0-10b questionCount по блокам: декларация == факту")
    else:
        fail(f"P0-10b questionCount по блокам: нарушения — {per_block_bad[:5]}")

    # P0-11: КРОСС-СВЕРКА с источником (convert.parse vs questions.js)
    src_data, src_err = _get_parse_from_convert()
    if src_err:
        fail(f"P0-11 Кросс-сверка: не удалось получить данные convert.parse() — {src_err}")
    else:
        # Нормализуем для сравнения: сортируем вопросы по id
        def norm(d):
            qs = sorted(d.get("questions", []), key=lambda q: q.get("id", 0))
            bs = sorted(d.get("blocks",    []), key=lambda b: b.get("id", 0))
            return {"blocks": bs, "questions": qs}

        if norm(src_data) == norm(data):
            ok("P0-11 Кросс-сверка: questions.js соответствует банку вопросов")
        else:
            # Найдём первое расхождение
            src_qs  = {q["id"]: q for q in src_data.get("questions", [])}
            file_qs = {q["id"]: q for q in questions}
            diff_ids = [i for i in sorted(set(src_qs) | set(file_qs))
                        if src_qs.get(i) != file_qs.get(i)]
            fail(f"P0-11 Кросс-сверка: questions.js расходится с банком. "
                 f"Отличающиеся id: {diff_ids[:10]}. Прогони convert.py.")

    return results
