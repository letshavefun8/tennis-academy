# =====================================================
# handler.py — серверная функция «Академии тенниса» для Yandex Cloud Functions
# Бэкенд на замену Firebase (недоступен в РФ).
# Хранилище — YDB Document API (DynamoDB-совместимый) через boto3.
# Своя авторизация: имя+ПИН -> серверная проверка хеша -> подписанный токен (HMAC).
# Секреты (ключи доступа, APP_SECRET) приходят из переменных окружения функции.
# Комментарии на русском.
# =====================================================

import os
import json
import time
import hmac
import hashlib
import base64
import random
import string
import datetime
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

# --- Подключение к базе (Document API) ---
ENDPOINT = os.environ["DOCAPI_ENDPOINT"]
SECRET = os.environ["APP_SECRET"].encode()

_dynamodb = boto3.resource("dynamodb", endpoint_url=ENDPOINT, region_name="ru-central1")
T_PLAYERS = _dynamodb.Table("players")
T_NAMES = _dynamodb.Table("names")
T_FEED = _dynamodb.Table("feed")

ALLOWED_FEED_TYPES = ("block_stars", "rank_up", "daily_done")
TOKEN_TTL = 60 * 60 * 24 * 365  # год

# =====================================================
# ВСПОМОГАТЕЛЬНЫЕ
# =====================================================

def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        "body": json.dumps(body, ensure_ascii=False, default=_dec),
    }


def _dec(o):
    # Decimal из DynamoDB -> int/float для JSON
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError


def _num(v, default=0):
    try:
        if isinstance(v, Decimal):
            return int(v)
        return int(v)
    except Exception:
        return default


def normalize_name(name):
    s = (name or "").strip().lower().replace("ё", "е")
    s = " ".join(s.split())
    return s


def hash_pin(uid, pin):
    return hashlib.sha256((uid + ":" + pin + ":").encode() + SECRET).hexdigest()


def make_token(uid):
    payload = json.dumps({"uid": uid, "exp": int(time.time()) + TOKEN_TTL}).encode()
    p = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig = hmac.new(SECRET, p.encode(), hashlib.sha256).hexdigest()
    return p + "." + sig


def verify_token(token):
    try:
        p, sig = token.split(".")
        expect = hmac.new(SECRET, p.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expect):
            return None
        pad = "=" * (-len(p) % 4)
        payload = json.loads(base64.urlsafe_b64decode(p + pad))
        if payload["exp"] < int(time.time()):
            return None
        return payload["uid"]
    except Exception:
        return None


def gen_uid():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=20))


def week_key():
    y, w, _ = datetime.datetime.utcnow().isocalendar()
    return "%d-W%02d" % (y, w)


def valid_name(name):
    return isinstance(name, str) and 1 <= len(name.strip()) <= 20


def valid_pin(pin):
    return isinstance(pin, str) and len(pin) == 4 and pin.isdigit()


# =====================================================
# ЭНДПОИНТЫ
# =====================================================

def register(body):
    name = body.get("name", "")
    pin = str(body.get("pin", ""))
    if not valid_name(name):
        return _resp(200, {"ok": False, "code": "bad-name", "error": "Имя 1–20 символов"})
    if not valid_pin(pin):
        return _resp(200, {"ok": False, "code": "bad-pin", "error": "ПИН — 4 цифры"})

    name_key = normalize_name(name)
    uid = gen_uid()
    now = int(time.time() * 1000)

    # Резервируем имя атомарно (уникальность)
    try:
        T_NAMES.put_item(
            Item={"name_key": name_key, "uid": uid},
            ConditionExpression="attribute_not_exists(name_key)",
        )
    except Exception:
        return _resp(200, {"ok": False, "code": "name-taken",
                           "error": "Это имя уже занято"})

    pts = _num(body.get("points"), 0)
    item = {
        "uid": uid,
        "name": name.strip(),
        "name_key": name_key,
        "pin_hash": hash_pin(uid, pin),
        "points": pts,
        "rank_name": body.get("rankName", ""),
        "block_stars": json.dumps(body.get("blockStars", {})),
        "best_streak": _num(body.get("bestStreakEver"), 0),
        "days_count": _num(body.get("daysCount"), 0),
        "weekly_points": 0,
        "week_key": week_key(),
        "created_at": now,
        "updated_at": now,
    }
    T_PLAYERS.put_item(Item=item)
    return _resp(200, {"ok": True, "uid": uid, "name": name.strip(),
                       "token": make_token(uid)})


def login(body):
    name = body.get("name", "")
    pin = str(body.get("pin", ""))
    if not valid_name(name) or not valid_pin(pin):
        return _resp(200, {"ok": False, "code": "bad-input",
                           "error": "Проверь имя и ПИН"})

    name_key = normalize_name(name)
    n = T_NAMES.get_item(Key={"name_key": name_key}).get("Item")
    if not n:
        return _resp(200, {"ok": False, "code": "not-found",
                           "error": "Игрок не найден"})

    uid = n["uid"]
    p = T_PLAYERS.get_item(Key={"uid": uid}).get("Item")
    if not p or not hmac.compare_digest(p.get("pin_hash", ""), hash_pin(uid, pin)):
        return _resp(200, {"ok": False, "code": "wrong-pin",
                           "error": "ПИН не подошёл"})

    return _resp(200, {
        "ok": True, "uid": uid, "name": p.get("name", name.strip()),
        "token": make_token(uid),
        "player": _public_player(p),
    })


def sync(body):
    uid = verify_token(body.get("token", ""))
    if not uid:
        return _resp(200, {"ok": False, "code": "unauth", "error": "Нужен вход"})

    cur = T_PLAYERS.get_item(Key={"uid": uid}).get("Item")
    if not cur:
        return _resp(200, {"ok": False, "code": "no-player"})

    pts = _num(body.get("points"), _num(cur.get("points")))
    wk_now = week_key()
    session_points = _num(body.get("sessionPoints"), 0)

    if cur.get("week_key") == wk_now:
        prev = _num(cur.get("points"))
        weekly = _num(cur.get("weekly_points")) + max(0, pts - prev)
    else:
        weekly = session_points

    T_PLAYERS.update_item(
        Key={"uid": uid},
        UpdateExpression=("SET points=:p, rank_name=:r, block_stars=:b, "
                          "best_streak=:s, days_count=:d, weekly_points=:w, "
                          "week_key=:wk, updated_at=:u"),
        ExpressionAttributeValues={
            ":p": pts,
            ":r": body.get("rankName", cur.get("rank_name", "")),
            ":b": json.dumps(body.get("blockStars", {})),
            ":s": _num(body.get("bestStreakEver"), _num(cur.get("best_streak"))),
            ":d": _num(body.get("daysCount"), _num(cur.get("days_count"))),
            ":w": weekly,
            ":wk": wk_now,
            ":u": int(time.time() * 1000),
        },
    )
    return _resp(200, {"ok": True})


def post_feed(body):
    uid = verify_token(body.get("token", ""))
    if not uid:
        return _resp(200, {"ok": False, "code": "unauth"})

    ftype = body.get("type", "")
    if ftype not in ALLOWED_FEED_TYPES:
        return _resp(200, {"ok": False, "code": "bad-type"})
    text = str(body.get("text", ""))[:200]
    emoji = str(body.get("emoji", ""))[:8]
    name = str(body.get("name", ""))[:40]
    ts = int(time.time() * 1000)
    ts_id = "%020d#%s" % (ts, "".join(random.choices(string.hexdigits, k=6)))

    T_FEED.put_item(Item={
        "bucket": "all", "ts_id": ts_id, "uid": uid,
        "name": name, "type": ftype, "text": text, "emoji": emoji, "ts": ts,
    })
    return _resp(200, {"ok": True})


def get_feed():
    r = T_FEED.query(
        KeyConditionExpression=Key("bucket").eq("all"),
        ScanIndexForward=False,
        Limit=30,
    )
    events = [{
        "uid": it.get("uid"), "name": it.get("name"), "type": it.get("type"),
        "text": it.get("text"), "emoji": it.get("emoji"), "ts": _num(it.get("ts")),
    } for it in r.get("Items", [])]
    return _resp(200, {"ok": True, "events": events})


def leaderboard():
    wk_now = week_key()
    r = T_PLAYERS.scan(
        ProjectionExpression="uid, #n, weekly_points, week_key, rank_name, points",
        ExpressionAttributeNames={"#n": "name"},
    )
    players = []
    for it in r.get("Items", []):
        wp = _num(it.get("weekly_points")) if it.get("week_key") == wk_now else 0
        players.append({
            "uid": it.get("uid"), "name": it.get("name"),
            "weeklyPoints": wp, "rankName": it.get("rank_name", ""),
            "points": _num(it.get("points")),
        })
    players.sort(key=lambda x: x["weeklyPoints"], reverse=True)
    return _resp(200, {"ok": True, "players": players[:20]})


def get_player(params):
    uid = (params or {}).get("uid", "")
    if not uid:
        return _resp(200, {"ok": False, "code": "bad-uid"})
    p = T_PLAYERS.get_item(Key={"uid": uid}).get("Item")
    if not p:
        return _resp(200, {"ok": False, "code": "not-found"})
    return _resp(200, {"ok": True, "player": _public_player(p)})


def _public_player(p):
    # Публичные поля профиля (без pin_hash)
    return {
        "uid": p.get("uid"),
        "name": p.get("name"),
        "points": _num(p.get("points")),
        "rankName": p.get("rank_name", ""),
        "blockStars": _parse_json(p.get("block_stars")),
        "bestStreakEver": _num(p.get("best_streak")),
        "daysCount": _num(p.get("days_count")),
        "weeklyPoints": _num(p.get("weekly_points")),
        "weekKey": p.get("week_key", ""),
    }


def _parse_json(s):
    try:
        return json.loads(s) if s else {}
    except Exception:
        return {}


# =====================================================
# ВХОДНАЯ ТОЧКА
# =====================================================

def _route_of(event):
    # API Gateway с greedy-путём /{path+} кладёт реальный путь в pathParams['path'],
    # а в event['path'] может быть шаблон. Берём последний сегмент устойчиво.
    pp = event.get("pathParams") or {}
    seg = pp.get("path") or event.get("path") or event.get("url") or ""
    seg = seg.split("?")[0].strip("/")
    return seg.rsplit("/", 1)[-1].lower()


def handler(event, context):
    method = event.get("httpMethod", "GET")
    route = _route_of(event)

    if method == "OPTIONS":
        return _resp(200, {"ok": True})

    body = {}
    if event.get("body"):
        try:
            raw = event["body"]
            if event.get("isBase64Encoded"):
                raw = base64.b64decode(raw).decode()
            body = json.loads(raw)
        except Exception:
            body = {}
    params = event.get("queryStringParameters") or {}

    try:
        if route == "register":
            return register(body)
        if route == "login":
            return login(body)
        if route == "sync":
            return sync(body)
        if route == "feed" and method == "POST":
            return post_feed(body)
        if route == "feed":
            return get_feed()
        if route == "leaderboard":
            return leaderboard()
        if route == "player":
            return get_player(params)
        return _resp(404, {"ok": False, "error": "not found", "route": route})
    except Exception as e:
        return _resp(500, {"ok": False, "error": "server", "detail": str(e)})
