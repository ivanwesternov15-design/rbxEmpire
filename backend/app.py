"""
rbxflare — минимальный бэкенд. Только стандартная библиотека Python (без pip-зависимостей).

1. Валидация Telegram initData (HMAC-SHA256, свежесть <= 24ч).
2. Отдача статики фронтенда (index.html, styles/, scripts/, assets/).
3. bio пользователя через Bot API getChat.
4. Рефералы: запись друга + выдача списка (real-time между устройствами).

Запуск: python main.py (поднимает и HTTP-сервер, и поллинг бота).
"""
import hashlib
import hmac
import json
import os
import time
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
USERS_FILE = os.path.join(DATA_DIR, "users.json")
PLAYERS_FILE = os.path.join(DATA_DIR, "players.json")
ADMINS_FILE = os.path.join(DATA_DIR, "admins.json")


# ---------------------------------------------------------------- env
def _load_dotenv(path: str) -> dict:
    out = {}
    if not os.path.exists(path):
        return out
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip()
    return out


_LOCAL_ENV = _load_dotenv(os.path.join(BASE_DIR, ".env"))


def env(key: str, default: str = "") -> str:
    return os.getenv(key, _LOCAL_ENV.get(key, default))


BOT_TOKEN = env("BOT_TOKEN")
OWNER_ID = env("OWNER_ID", "8414792453").strip()


# ---------------------------------------------------------------- initData
def _parse_init_data(init_data: str) -> dict:
    data = {}
    for pair in init_data.split("&"):
        if "=" not in pair:
            continue
        key, _, value = pair.partition("=")
        data[key] = urllib.parse.unquote_plus(value)
    return data


def validate_init_data(init_data: str):
    """dict с пользователем или None, если подпись неверна или протухла."""
    if not init_data or not BOT_TOKEN:
        return None
    try:
        data = _parse_init_data(init_data)
        received_hash = data.pop("hash", "")
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calc_hash = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calc_hash, received_hash):
            return None
        auth_date = int(data.get("auth_date", 0))
        if time.time() - auth_date > 86400:
            return None
        user = json.loads(data.get("user", "{}"))
        return user or None
    except Exception:
        return None


# ---------------------------------------------------------------- Telegram API (urllib)
def tg_api(method: str, params: dict = None, payload: dict = None):
    """Возвращает распарсенный JSON ответа Bot API или None при ошибке."""
    if not BOT_TOKEN:
        return None
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    if payload is not None:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
    else:
        qs = urllib.parse.urlencode(params or {})
        req = urllib.request.Request(url + (("?" + qs) if qs else ""), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


# ---------------------------------------------------------------- данные
def _load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_users(users: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------- игроки и админы
def _load_json(path: str):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_json(path: str, obj) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def _load_players() -> dict:
    return _load_json(PLAYERS_FILE)


def _load_admins() -> list:
    return _load_json(ADMINS_FILE).get("ids", [])


def _save_admins(ids: list) -> None:
    _save_json(ADMINS_FILE, {"ids": ids})


def _is_admin(uid) -> bool:
    if OWNER_ID and str(uid) == str(OWNER_ID):
        return True
    return str(uid) in _load_admins()


def save_referral(referrer_id, friend_id) -> bool:
    """Запись реферала напрямую с сервера (бот видит payload из /start).

    В личном чате Telegram chat.id совпадает с user.id, поэтому friend_id
    известен ещё до открытия WebApp — реферал сохраняется сразу при /start.
    """
    try:
        referrer_id = int(referrer_id)
        friend_id = int(friend_id)
    except (TypeError, ValueError):
        return False
    if not referrer_id or not friend_id or referrer_id == friend_id:
        return False
    users = _load_users()
    record = users.setdefault(str(referrer_id), {"friends": []})
    fid = str(friend_id)
    if any(f.get("id") == fid for f in record["friends"]):
        return True
    name = "Friend"
    chat = tg_api("getChat", params={"chat_id": friend_id})
    if chat and chat.get("ok"):
        r = chat.get("result", {})
        name = r.get("first_name") or r.get("username") or "Friend"
    record["friends"].append(
        {
            "id": fid,
            "name": name,
            "avatar": "",
            "joinedAt": int(time.time()),
            "progress": 0,
        }
    )
    _save_users(users)
    return True


# ---------------------------------------------------------------- API-эндпоинты
def handle_api(method: str, path: str, body_bytes: bytes):
    """Возвращает (status, dict) для JSON-ответа."""
    if method == "POST" and path == "/api/validate":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        user = validate_init_data(body.get("initData", ""))
        if not user:
            return 401, {"ok": False, "error": "invalid initData"}
        return 200, {"ok": True, "user": user}

    if method == "POST" and path == "/api/referral":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        referrer_id = body.get("referrerId")
        friend = body.get("friend") or {}
        if not referrer_id or not friend.get("id"):
            return 400, {"ok": False, "error": "missing fields"}
        users = _load_users()
        record = users.setdefault(str(referrer_id), {"friends": []})
        fid = str(friend["id"])
        if not any(f.get("id") == fid for f in record["friends"]):
            record["friends"].append(
                {
                    "id": fid,
                    "name": friend.get("name", ""),
                    "avatar": friend.get("avatar", ""),
                    "joinedAt": int(time.time()),
                    "progress": 0,
                }
            )
            _save_users(users)
        return 200, {"ok": True}

    if method == "GET" and path.startswith("/api/user/") and path.endswith("/bio"):
        uid = path[len("/api/user/") : -len("/bio")]
        if not uid.isdigit():
            return 400, {"ok": False, "error": "bad uid"}
        data = tg_api("getChat", params={"chat_id": uid})
        if data and data.get("ok"):
            return 200, {"ok": True, "bio": data.get("result", {}).get("bio", "")}
        return 200, {"ok": False, "bio": ""}

    if method == "GET" and path.startswith("/api/referrals/"):
        uid = path[len("/api/referrals/") :]
        if not uid.isdigit():
            return 400, {"ok": False, "error": "bad uid"}
        users = _load_users()
        friends = users.get(uid, {}).get("friends", [])
        return 200, {"ok": True, "friends": friends}

    if method == "POST" and path == "/api/player/ping":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        user = validate_init_data(body.get("initData", ""))
        if not user:
            return 401, {"ok": False, "error": "invalid initData"}
        uid = str(user.get("id", ""))
        if not uid:
            return 400, {"ok": False, "error": "bad uid"}
        players = _load_players()
        rec = players.setdefault(
            uid,
            {"id": uid, "name": "", "username": "", "coins": 0, "robux": 0, "firstSeen": int(time.time())},
        )
        rec["name"] = (
            ((user.get("first_name") or "") + " " + (user.get("last_name") or "")).strip()
            or rec.get("name", "")
        )
        rec["username"] = user.get("username") or rec.get("username", "")
        rec["coins"] = max(0, int(body.get("coins", rec.get("coins", 0)) or 0))
        rec["robux"] = max(0, int(body.get("robux", rec.get("robux", 0)) or 0))
        rec["lastSeen"] = int(time.time())
        _save_json(PLAYERS_FILE, players)
        return 200, {"ok": True}

    if method == "POST" and path == "/api/players":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        user = validate_init_data(body.get("initData", ""))
        if not user:
            return 401, {"ok": False, "error": "invalid initData"}
        if not _is_admin(user.get("id")):
            return 403, {"ok": False, "error": "forbidden"}
        players = _load_players()
        return 200, {"ok": True, "players": list(players.values())}

    if method == "POST" and path == "/api/admin/set":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        user = validate_init_data(body.get("initData", ""))
        if not user:
            return 401, {"ok": False, "error": "invalid initData"}
        if not (OWNER_ID and str(user.get("id", "")) == str(OWNER_ID)):
            return 403, {"ok": False, "error": "forbidden"}
        target = str(body.get("id", ""))
        if not target:
            return 400, {"ok": False, "error": "bad id"}
        admins = _load_admins()
        if body.get("on"):
            if target not in admins:
                admins.append(target)
        else:
            admins = [a for a in admins if a != target]
        _save_admins(admins)
        return 200, {"ok": True}

    return 404, {"ok": False, "error": "not found"}


# ---------------------------------------------------------------- статика
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
    ".md": "text/plain; charset=utf-8",
}


def serve_static(path: str):
    """Возвращает (status, body_bytes, content_type)."""
    if path in ("", "/"):
        path = "/index.html"
    rel = urllib.parse.unquote(path.lstrip("/"))
    full = os.path.abspath(os.path.join(FRONT_DIR, rel))
    if full != FRONT_DIR and not full.startswith(FRONT_DIR + os.sep):
        return 403, b"", "text/plain"
    if not os.path.isfile(full):
        return 404, b"", "text/plain"
    ext = os.path.splitext(full)[1].lower()
    with open(full, "rb") as f:
        return 200, f.read(), MIME.get(ext, "application/octet-stream")