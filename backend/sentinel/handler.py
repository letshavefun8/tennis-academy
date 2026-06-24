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


def _probe():
    """Одна проба эндпоинта. Возвращает (healthy, latency, detail).

    healthy=True — код 200 и тело парсится как JSON.
    detail — человекочитаемая причина сбоя (для алерта), иначе "".
    """
    t0 = time.time()
    try:
        with urllib.request.urlopen(CHECK_URL, timeout=15) as r:
            code = r.getcode()
            body = r.read().decode("utf-8")
        latency = time.time() - t0
        json.loads(body)  # тело должно парситься как JSON
        if code == 200:
            return True, latency, ""
        return False, latency, "Код: %s. Задержка: %.2f c. Тело: %s" % (
            code, latency, body[:200]
        )
    except Exception as e:  # сеть/таймаут/битый JSON
        return False, time.time() - t0, "Ошибка: %s: %s" % (type(e).__name__, e)


def handler(event, context):
    # Первая проба может словить холодный старт (поднятие контейнера +
    # переподключение к YDB) и упереться в таймаут. Поэтому при сбое ждём
    # немного и пробуем ещё раз — на тёплой функции. Алерт шлём, только если
    # упали ОБЕ пробы: так отсекаем ложные тревоги на холодном старте.
    healthy, latency, detail = _probe()
    if healthy:
        return {"statusCode": 200, "body": "OK %.2fs" % latency}

    time.sleep(3)
    healthy, latency, detail = _probe()
    if healthy:
        return {"statusCode": 200, "body": "OK on retry %.2fs" % latency}

    _alert(
        "🚨 Академия тенниса: бэкенд не отвечает корректно (2 попытки). "
        + detail
    )
    return {"statusCode": 200, "body": "alert sent"}
