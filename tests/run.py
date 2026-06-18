#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Единая точка входа в тест-харнес Академии тенниса.

Запуск:
    python3 tests/run.py

Выход: 0 — все тесты прошли, 1 — есть падения.
"""

import sys
from pathlib import Path

# Добавляем папку tests/ в путь для импорта
sys.path.insert(0, str(Path(__file__).parent))
import validate_questions


def run():
    results = validate_questions.check_all()

    passed = 0
    failed = 0

    for ok, msg in results:
        status = "PASS" if ok else "FAIL"
        print(f"{status}: {msg}")
        if ok:
            passed += 1
        else:
            failed += 1

    print()
    print(f"{passed} passed, {failed} failed")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run()
