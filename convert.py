#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертер банка вопросов по теннису.
Читает tennis_question_bank.md и генерирует questions.js с данными.
Запуск: /usr/local/bin/python3.13 convert.py
"""

import re
import json
import sys
from pathlib import Path

SOURCE_FILE = Path(__file__).parent / "tennis_question_bank.md"
OUTPUT_FILE = Path(__file__).parent / "questions.js"

EXPECTED_QUESTIONS = 116
EXPECTED_BLOCKS = 17

# Регулярные выражения (проверены планировщиком)
RE_BLOCK = re.compile(r'^## (.+)$')
RE_TOPIC = re.compile(r'^### (.+)$')
RE_QUESTION = re.compile(r'^\*\*(\d+)\.\s+(.+?)\*\*\s+`\[(.+?) · (.+?) · (.+?)\]`\s*$')
RE_CORRECT = re.compile(r'^- ✅ \*\*А\)\s*(.+?)\*\*$')
RE_OPTION = re.compile(r'^- ([БВГ])\)\s*(.+)$')
RE_EXPLANATION = re.compile(r'^> \*(.+)\*$')
RE_SUMMARY = re.compile(r'^\*\d+ вопросов')


def err(msg):
    """Завершить работу с сообщением об ошибке."""
    print(f"ОШИБКА: {msg}", file=sys.stderr)
    sys.exit(1)


def parse():
    """Разобрать markdown-файл и вернуть словарь с блоками и вопросами."""
    text = SOURCE_FILE.read_text(encoding="utf-8")
    lines = text.splitlines()

    blocks = []          # список {"id": N, "title": "...", "questionCount": M}
    questions = []       # список вопросов

    current_block = None        # {"id": N, "title": "..."}
    current_topic = None        # текущая подтема (### ...)
    collecting = None           # собираемый вопрос-черновик
    skip_contents = True        # пропускаем всё до первого содержательного ##

    def close_question():
        """Проверить и закрыть текущий собираемый вопрос."""
        nonlocal collecting
        if collecting is None:
            return
        q = collecting
        collecting = None

        # Валидация вариантов
        if len(q["options"]) != 4:
            err(f"Вопрос {q['id']}: ожидается ровно 4 варианта, найдено {len(q['options'])}")
        for i, opt in enumerate(q["options"]):
            if not opt.strip():
                err(f"Вопрос {q['id']}: вариант {i} пустой")
        if not q.get("correct_set"):
            err(f"Вопрос {q['id']}: не найден правильный ответ (✅ А)")
        if not q.get("explanation"):
            err(f"Вопрос {q['id']}: не найдено объяснение")
        if not q.get("type"):
            err(f"Вопрос {q['id']}: не найден тип")
        if not q.get("phase"):
            err(f"Вопрос {q['id']}: не найдена фаза")
        if q["difficulty"] not in ("Б", "С", "П"):
            err(f"Вопрос {q['id']}: сложность должна быть Б/С/П, найдено '{q['difficulty']}'")
        if q["blockId"] is None:
            err(f"Вопрос {q['id']}: не определён блок")

        questions.append({
            "id": q["id"],
            "blockId": q["blockId"],
            "topic": q["topic"],
            "text": q["text"],
            "type": q["type"],
            "difficulty": q["difficulty"],
            "phase": q["phase"],
            "options": q["options"],
            "correctIndex": 0,  # правильный всегда первый (А) в исходнике
            "explanation": q["explanation"]
        })

    for lineno, line in enumerate(lines, 1):
        # Проверяем блок
        m_block = RE_BLOCK.match(line)
        if m_block:
            title = m_block.group(1).strip()
            if title == "Содержание":
                skip_contents = True
                continue
            # Любой другой ## — содержательный блок
            skip_contents = False
            close_question()
            block_id = len(blocks)
            current_block = {"id": block_id, "title": title}
            blocks.append({"id": block_id, "title": title, "questionCount": 0})
            current_topic = None
            continue

        if skip_contents:
            continue

        # Подтема
        m_topic = RE_TOPIC.match(line)
        if m_topic:
            close_question()
            current_topic = m_topic.group(1).strip()
            continue

        # Строка-сводка блока или разделитель — пропустить
        if RE_SUMMARY.match(line) or line.strip() == "---":
            continue

        # Начало нового вопроса
        m_q = RE_QUESTION.match(line)
        if m_q:
            close_question()
            if current_block is None:
                err(f"Строка {lineno}: вопрос вне блока")
            q_id = int(m_q.group(1))
            q_text = m_q.group(2).strip()
            q_type = m_q.group(3).strip()
            q_diff = m_q.group(4).strip()
            q_phase = m_q.group(5).strip()
            collecting = {
                "id": q_id,
                "blockId": current_block["id"],
                "topic": current_topic or "",
                "text": q_text,
                "type": q_type,
                "difficulty": q_diff,
                "phase": q_phase,
                "options": [],
                "correct_set": False,
                "explanation": ""
            }
            # Засчитываем вопрос в текущий блок
            blocks[current_block["id"]]["questionCount"] += 1
            continue

        if collecting is None:
            continue

        # Правильный вариант А)
        m_correct = RE_CORRECT.match(line)
        if m_correct:
            text = m_correct.group(1).strip()
            collecting["options"].insert(0, text)
            collecting["correct_set"] = True
            continue

        # Варианты Б), В), Г)
        m_opt = RE_OPTION.match(line)
        if m_opt:
            text = m_opt.group(2).strip()
            collecting["options"].append(text)
            continue

        # Объяснение
        m_exp = RE_EXPLANATION.match(line)
        if m_exp:
            collecting["explanation"] = m_exp.group(1).strip()
            close_question()
            continue

    # Закрыть последний вопрос (если нет строки после последнего объяснения)
    close_question()

    return {"blocks": blocks, "questions": questions}


def validate(data):
    """Валидация распарсенных данных."""
    blocks = data["blocks"]
    questions = data["questions"]

    # Количество блоков
    if len(blocks) != EXPECTED_BLOCKS:
        err(f"Ожидается {EXPECTED_BLOCKS} блоков, найдено {len(blocks)}")

    # Количество вопросов
    if len(questions) != EXPECTED_QUESTIONS:
        err(f"Ожидается {EXPECTED_QUESTIONS} вопросов, найдено {len(questions)}")

    # ID вопросов 1..116 без пропусков и дублей
    ids = sorted(q["id"] for q in questions)
    expected_ids = list(range(1, EXPECTED_QUESTIONS + 1))
    if ids != expected_ids:
        missing = set(expected_ids) - set(ids)
        dupes = [i for i in ids if ids.count(i) > 1]
        err(f"Нарушение ID вопросов. Пропущены: {missing}, дубликаты: {set(dupes)}")

    # Сумма questionCount == 116
    total = sum(b["questionCount"] for b in blocks)
    if total != EXPECTED_QUESTIONS:
        err(f"Сумма questionCount по блокам = {total}, ожидается {EXPECTED_QUESTIONS}")

    # Дополнительные проверки каждого вопроса
    for q in questions:
        if len(q["options"]) != 4:
            err(f"Вопрос {q['id']}: ровно 4 варианта обязательны")
        for opt in q["options"]:
            if not opt:
                err(f"Вопрос {q['id']}: есть пустой вариант")
        if q["correctIndex"] != 0:
            err(f"Вопрос {q['id']}: correctIndex должен быть 0")
        if not q["explanation"]:
            err(f"Вопрос {q['id']}: пустое объяснение")
        if q["difficulty"] not in ("Б", "С", "П"):
            err(f"Вопрос {q['id']}: недопустимая сложность '{q['difficulty']}'")

    print(f"Валидация пройдена: {len(questions)} вопросов, {len(blocks)} блоков, сумма={total}")


def write_output(data):
    """Сформировать и записать questions.js."""
    header = (
        "// Файл сгенерирован автоматически скриптом convert.py, не редактировать вручную\n"
        "const QUESTION_BANK = "
    )
    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    content = header + json_str + ";\n"
    OUTPUT_FILE.write_text(content, encoding="utf-8")


def main():
    if not SOURCE_FILE.exists():
        err(f"Исходный файл не найден: {SOURCE_FILE}")

    data = parse()
    validate(data)
    write_output(data)
    print(f"OK: {len(data['questions'])} вопросов, {len(data['blocks'])} блоков")
    print(f"Файл записан: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
