# -*- coding: utf-8 -*-
"""
Почасовой сторож «Академии тенниса» (Yandex Cloud Function).

Запускается таймер-триггером раз в час. Дёргает /leaderboard и МОЛЧИТ при
успехе. Шлёт алерт в Telegram ТОЛЬКО при проблеме (код != 200, таймаут,
битый JSON). Без зависимостей — только стандартная библиотека.

Зачем в Yandex, а не в облачной routine: песочница облачного агента режет
исходящие к api.telegram.org, поэтому алерт о сбое не дошёл бы как раз тогда,
когда нужен. Здесь связность с Telegram и бэкендом гарантирована.

Env (задаются при деплое, в репо НЕ хранятся):
  TELEGRAM_BOT_TOKEN — токен бота-сторожа
  TELEGRAM_CHAT_ID   — chat_id получателя
  CHECK_URL          — URL проверяемого эндпоинта (по умолчанию /leaderboard)
"""
import os
import json
import time
import urllib.parse
import urllib.request

CHECK_URL = os.environ.get(
    "CHECK_URL",
    "https://d5devrobt9pb45srhc84.628pfjdx.apigw.yandexcloud.net/leaderboard",
)
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]


def _alert(text):
    data = urllib.parse.urlencode({"chat_id": CHAT_ID, "text": text}).encode()
    req = urllib.request.Request(
        "https://api.telegram.org/bot%s/sendMessage" % BOT_TOKEN, data=data
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def handler(event, context):
    t0 = time.time()
    try:
        with urllib.request.urlopen(CHECK_URL, timeout=15) as r:
            code = r.getcode()
            body = r.read().decode("utf-8")
        latency = time.time() - t0
        json.loads(body)  # тело должно парситься как JSON
        healthy = code == 200
    except Exception as e:  # сеть/таймаут/битый JSON
        _alert(
            "🚨 Академия тенниса: бэкенд не отвечает корректно. "
            "Ошибка: %s: %s" % (type(e).__name__, e)
        )
        return {"statusCode": 200, "body": "alert sent"}

    if healthy:
        return {"statusCode": 200, "body": "OK %.2fs" % latency}

    snippet = body[:200]
    _alert(
        "🚨 Академия тенниса: бэкенд не отвечает корректно. "
        "Код: %s. Задержка: %.2f c. Тело: %s" % (code, latency, snippet)
    )
    return {"statusCode": 200, "body": "alert sent"}
