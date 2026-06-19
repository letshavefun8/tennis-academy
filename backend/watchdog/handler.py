# -*- coding: utf-8 -*-
"""
Суточный сторож «Академии тенниса» (Yandex Cloud Function).

Запускается таймер-триггером раз в сутки (09:00 Стамбул = 06:00 UTC).
Дёргает публичный /wall, детерминированно собирает сводку и шлёт ОДНО
сообщение в Telegram. Никаких зависимостей — только стандартная библиотека.

Зачем в Yandex, а не в облачной routine: песочница облачного агента режет
исходящие запросы к api.telegram.org, поэтому сводка не доходила. Здесь же и
данные, и доступ к Telegram гарантированы (Telegram в РФ не блокируется).

Env (задаются при деплое, в репо НЕ хранятся):
  TELEGRAM_BOT_TOKEN — токен бота-сторожа
  TELEGRAM_CHAT_ID   — chat_id получателя
  WALL_URL           — URL эндпоинта /wall (по умолчанию прод)
"""
import os
import re
import json
import time
import urllib.parse
import urllib.request

WALL_URL = os.environ.get(
    "WALL_URL",
    "https://d5devrobt9pb45srhc84.628pfjdx.apigw.yandexcloud.net/wall",
)
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

DAY_MS = 86_400_000


def _send(text):
    """Отправить одно сообщение в Telegram."""
    data = urllib.parse.urlencode({"chat_id": CHAT_ID, "text": text}).encode()
    req = urllib.request.Request(
        "https://api.telegram.org/bot%s/sendMessage" % BOT_TOKEN, data=data
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def _build_summary(data, latency):
    """Собрать текст сводки из ответа /wall."""
    events = data.get("events", []) or []
    players = data.get("players", []) or []
    cutoff = int(time.time() * 1000) - DAY_MS
    recent = [e for e in events if (e.get("ts") or 0) >= cutoff]

    per = {}
    lessons = stars = 0
    for e in recent:
        name = e.get("name", "?")
        p = per.setdefault(name, {"lessons": 0, "stars": 0, "points": 0})
        if e.get("type") == "lesson_done":
            p["lessons"] += 1
            lessons += 1
            m = re.search(r"\+(\d+)", e.get("text", ""))
            if m:
                p["points"] += int(m.group(1))
        elif e.get("type") == "block_stars":
            p["stars"] += 1
            stars += 1

    lines = ["\U0001F3BE Академия тенниса — сводка за сутки"]
    cold = " (возможен холодный старт)" if latency > 3 else ""
    lines.append("Сервер: жив ✅ (код 200, %.1f c)%s" % (latency, cold))

    if recent:
        lines.append(
            "Активность 24ч: %d уроков, %d★ блоков, %d активных"
            % (lessons, stars, len(per))
        )
        for name, p in sorted(per.items(), key=lambda kv: -kv[1]["points"]):
            seg = "• %s — %d урок(ов)" % (name, p["lessons"])
            if p["points"]:
                seg += ", +%d \U0001F3BE" % p["points"]
            if p["stars"]:
                seg += ", %d★" % p["stars"]
            lines.append(seg)
    else:
        lines.append("Активность 24ч: тихо, никто не играл")

    top = sorted(players, key=lambda x: -(x.get("weeklyPoints") or 0))[:3]
    if top:
        lines.append(
            "Топ недели: "
            + " · ".join(
                "%d) %s %d" % (i + 1, p.get("name", "?"), p.get("weeklyPoints") or 0)
                for i, p in enumerate(top)
            )
        )

    if len(events) >= 30:
        lines.append("(лента обрезана до 30)")

    return "\n".join(lines)


def handler(event, context):
    t0 = time.time()
    try:
        with urllib.request.urlopen(WALL_URL, timeout=20) as r:
            code = r.getcode()
            body = r.read().decode("utf-8")
        latency = time.time() - t0
        data = json.loads(body)
    except Exception as e:  # сеть/таймаут/битый JSON
        _send("⚠️ Сервер: проблема (%s: %s)" % (type(e).__name__, e))
        return {"statusCode": 200, "body": "alert sent"}

    if code != 200 or not data.get("ok"):
        _send("⚠️ Сервер: проблема (код %s)" % code)
        return {"statusCode": 200, "body": "alert sent"}

    _send(_build_summary(data, latency))
    return {"statusCode": 200, "body": "summary sent"}
