#!/usr/bin/env python3
"""Конвертер: разбирает tennis_question_bank.md и создаёт questions.js —
структурированный список вопросов, который читает сайт-тренажёр."""
import json
import re

QUESTION_RE = re.compile(r"^\*\*(\d+)\. (.+)\*\* `\[(.+)\]`$")
OPTION_RE = re.compile(r"^- (✅ )?\*{0,2}([А-Г])\) (.+?)\*{0,2}$")
EXPLAIN_RE = re.compile(r"^> \*(.+)\*$")

questions = []
block = topic = None
current = None  # вопрос, который собираем сейчас

with open("tennis_question_bank.md", encoding="utf-8") as f:
    for line in f:
        line = line.rstrip()

        if line.startswith("## ") and "Содержание" not in line:
            block = line[3:].strip()
        elif line.startswith("### "):
            topic = line[4:].strip()
        elif m := QUESTION_RE.match(line):
            num, text, tag = m.groups()
            # Метка вида "Решение · С · оба сзади": тип, сложность, фаза
            qtype, difficulty, phase = [p.strip() for p in tag.split("·")]
            current = {
                "id": int(num),
                "block": block,
                "topic": topic,
                "question": text,
                "type": qtype,
                "difficulty": difficulty,
                "phase": phase,
                "options": [],
                "correct": None,  # индекс правильного варианта в options
                "explanation": "",
            }
            questions.append(current)
        elif current and (m := OPTION_RE.match(line)):
            check, letter, text = m.groups()
            if check:
                current["correct"] = len(current["options"])
            current["options"].append(text)
        elif current and (m := EXPLAIN_RE.match(line)):
            current["explanation"] = m.group(1)

# Проверки: каждая ошибка здесь — признак, что разметка где-то отличается
problems = []
for q in questions:
    if len(q["options"]) != 4:
        problems.append(f"вопрос {q['id']}: вариантов {len(q['options'])}, а не 4")
    if q["correct"] is None:
        problems.append(f"вопрос {q['id']}: не найден правильный ответ")
    if not q["explanation"]:
        problems.append(f"вопрос {q['id']}: нет объяснения")

if problems:
    print("ПРОБЛЕМЫ:")
    print("\n".join(problems))
    raise SystemExit(1)

# questions.js — данные в виде кода, чтобы сайт работал даже при открытии
# файла двойным кликом (без веб-сервера)
data = json.dumps(questions, ensure_ascii=False, indent=1)
with open("questions.js", "w", encoding="utf-8") as f:
    f.write("// Файл создан автоматически программой convert.py — не редактируйте вручную\n")
    f.write(f"const QUESTIONS = {data};\n")

blocks = {}
for q in questions:
    blocks[q["block"]] = blocks.get(q["block"], 0) + 1
print(f"Готово: {len(questions)} вопросов, {len(blocks)} блоков -> questions.js")
for name, count in blocks.items():
    print(f"  {name} — {count}")
