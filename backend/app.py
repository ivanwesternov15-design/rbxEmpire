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
import threading
import time
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
USERS_FILE = os.path.join(DATA_DIR, "users.json")
USERS_ENV_FILE = os.path.join(DATA_DIR, "users.env")
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


def check_init_data(init_data: str):
    """(ok, user, reason) — диагностика, почему initData не принят."""
    if not init_data:
        return False, None, "empty"
    if not BOT_TOKEN:
        # Режим совместимости (токен не настроен): принимаем данные клиента как есть.
        try:
            data = _parse_init_data(init_data)
            user = json.loads(data.get("user", "{}"))
            return (bool(user), user or None, "no_token_fallback")
        except Exception:
            return False, None, "bad_user"
    try:
        data = _parse_init_data(init_data)
        if "hash" not in data:
            return False, None, "no_hash"
        received_hash = data.pop("hash", "")
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calc_hash = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calc_hash, received_hash):
            return False, None, "hash_mismatch"
        auth_date = int(data.get("auth_date", 0))
        if time.time() - auth_date > 86400:
            return False, None, "expired"
        user = json.loads(data.get("user", "{}"))
        return (bool(user), user or None, "ok")
    except Exception:
        return False, None, "error"


def validate_init_data(init_data: str):
    """dict с пользователем или None, если подпись неверна или протухла."""
    ok, user, _reason = check_init_data(init_data)
    return user


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


# ---------------------------------------------------------------- игроки: PlayerDB
MAX_PLAYERS = 20000


def _read_json_file(path: str):
    """dict при успехе, {} если файла нет, None если файл битый."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except FileNotFoundError:
        return {}
    except Exception:
        return None


# ---------------------------------------------------------------- UsersDB (users.env)
class UsersDB:
    """Хранилище пользователей в файле users.env.

    Формат — таблица KEY=VALUE в стиле .env, но безопасно отделён от
    backend/.env (где лежит BOT_TOKEN). Каждая запись — одна строка:

        <telegram_id> = urlencoded(k=v&k=v&...)

    Админы хранятся как отдельные строки admin:<id> = 1.

    - кэш в памяти + блокировка (HTTP-сервер многопоточный);
    - атомарная запись: tmp -> os.replace, предыдущая версия в .bak;
    - миграция из старых players.json/admins.json при первом запуске.
    """

    def __init__(self, path: str):
        self.path = path
        self.lock = threading.RLock()
        self._users = None
        self._admins = None

    # ----- парсинг / сериализация -----
    def _parse(self, text: str):
        users, admins = {}, []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip()
            if key.startswith("admin:"):
                admins.append(key.split(":", 1)[1])
            else:
                try:
                    rec = dict(urllib.parse.parse_qsl(urllib.parse.unquote_plus(val), keep_blank_values=True))
                except Exception:
                    rec = {}
                rec["id"] = key
                users[key] = rec
        return users, admins

    def _render(self, users: dict, admins: list) -> str:
        out = []
        out.append("# rbxflare users table — managed automatically, do not edit while bot runs")
        out.append("# <telegram_id> = urlencoded(k=v&k=v&...)  |  admin:<id> = 1")
        for uid in sorted(users.keys(), key=lambda x: int(x) if x.isdigit() else 0):
            rec = users[uid]
            fields = {
                "name": rec.get("name", ""),
                "username": rec.get("username", ""),
                "photo": rec.get("photo", ""),
                "coins": int(rec.get("coins", 0) or 0),
                "robux": int(rec.get("robux", 0) or 0),
                "streak": int(rec.get("streak", 0) or 0),
                "firstSeen": int(rec.get("firstSeen", 0) or 0),
                "lastSeen": int(rec.get("lastSeen", 0) or 0),
                "verified": "1" if rec.get("verified") else "0",
                "source": rec.get("source", "webapp"),
            }
            q = urllib.parse.urlencode(fields)
            out.append(f"{uid} = {q}")
        for a in admins:
            out.append(f"admin:{a} = 1")
        out.append("")
        return "\n".join(out)

    def _migrate_once(self) -> None:
        # импорт из старых форматов при самом первом запуске
        users, admins = {}, []
        old_players = _read_json_file(os.path.join(os.path.dirname(self.path), "players.json"))
        for uid, rec in (old_players or {}).items():
            users[uid] = {
                "name": rec.get("name", ""),
                "username": rec.get("username", ""),
                "photo": rec.get("photo", ""),
                "coins": rec.get("coins", 0),
                "robux": rec.get("robux", 0),
                "streak": rec.get("streak", 0),
                "firstSeen": rec.get("firstSeen", 0),
                "lastSeen": rec.get("lastSeen", 0),
                "verified": rec.get("verified", False),
                "source": rec.get("source", "webapp"),
            }
        old_admins = _read_json_file(os.path.join(os.path.dirname(self.path), "admins.json"))
        for a in (old_admins or {}).get("ids", []):
            if str(a) not in admins:
                admins.append(str(a))
        self._users, self._admins = users, admins
        self._persist()

    def _load(self):
        if self._users is None:
            if os.path.exists(self.path):
                with open(self.path, "r", encoding="utf-8") as f:
                    self._users, self._admins = self._parse(f.read())
            elif os.path.exists(self.path + ".bak"):
                try:
                    with open(self.path + ".bak", "r", encoding="utf-8") as f:
                        self._users, self._admins = self._parse(f.read())
                except Exception:
                    self._migrate_once()
            else:
                self._migrate_once()
        return self._users, self._admins

    def _persist(self) -> None:
        users, admins = self._users or {}, self._admins or []
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(self._render(users, admins))
            f.flush()
            os.fsync(f.fileno())
        if os.path.exists(self.path):
            try:
                os.replace(self.path, self.path + ".bak")
            except OSError:
                pass
        os.replace(tmp, self.path)

    @staticmethod
    def _clean(uid, name, username):
        uid = str(uid).strip()
        if not uid.isdigit() or int(uid) <= 0 or int(uid) > 10**12:
            return None, "", ""
        return uid, str(name or "")[:64], str(username or "").lstrip("@")[:32]

    def upsert_seen(self, uid, name="", username="", photo="", source="webapp", verified=False):
        uid, name, username = self._clean(uid, name, username)
        if not uid:
            return None
        now = int(time.time())
        with self.lock:
            users, admins = self._load()
            rec = users.get(uid)
            if rec is None:
                if len(users) >= MAX_PLAYERS:
                    return None
                rec = {
                    "id": uid, "name": "", "username": "", "photo": "",
                    "coins": 0, "robux": 0, "streak": 0,
                    "firstSeen": now, "lastSeen": now,
                    "verified": False, "source": source,
                }
                users[uid] = rec
            changed = rec.get("lastSeen", 0) < now - 45
            if name and (verified or not rec.get("verified") or not rec.get("name")):
                if rec.get("name") != name:
                    rec["name"] = name
                    changed = True
            if username and (verified or not rec.get("verified") or not rec.get("username")):
                if rec.get("username") != username:
                    rec["username"] = username
                    changed = True
            if photo and (verified or not rec.get("photo")):
                if rec.get("photo") != photo:
                    rec["photo"] = photo
                    changed = True
            if verified and not rec.get("verified"):
                rec["verified"] = True
                rec["source"] = source
                changed = True
            if rec.get("lastSeen", 0) < now - 20:
                rec["lastSeen"] = now
                changed = True
            if changed:
                self._persist()
            return rec

    def update_player(self, uid, coins=None, robux=None, streak=None, name="", username="", photo=""):
        uid, name, username = self._clean(uid, name, username)
        if not uid:
            return None
        now = int(time.time())
        with self.lock:
            users, admins = self._load()
            rec = users.get(uid)
            if rec is None:
                rec = {
                    "id": uid, "name": "", "username": "", "photo": "",
                    "coins": 0, "robux": 0, "streak": 0,
                    "firstSeen": now, "lastSeen": now,
                    "verified": False, "source": "webapp",
                }
                users[uid] = rec
            if name:
                rec["name"] = name
            if username:
                rec["username"] = username
            if photo:
                rec["photo"] = photo
            if coins is not None:
                rec["coins"] = max(0, int(coins))
            if robux is not None:
                rec["robux"] = max(0, int(robux))
            if streak is not None:
                rec["streak"] = max(0, int(streak))
            rec["verified"] = True
            rec["source"] = "webapp"
            rec["lastSeen"] = now
            self._persist()
            return rec

    def remove(self, uid) -> bool:
        uid = str(uid).strip()
        with self.lock:
            users, admins = self._load()
            changed = False
            if uid in users:
                del users[uid]
                changed = True
            if uid in admins:
                admins.remove(uid)
                changed = True
            if changed:
                self._persist()
            return changed

    def all(self) -> list:
        with self.lock:
            users, admins = self._load()
            recs = [dict(r) for r in users.values()]
        for r in recs:
            r["coins"] = int(r.get("coins", 0) or 0)
            r["robux"] = int(r.get("robux", 0) or 0)
            r["streak"] = int(r.get("streak", 0) or 0)
            r["verified"] = bool(r.get("verified"))
        recs.sort(key=lambda r: int(r.get("lastSeen", 0) or 0), reverse=True)
        return recs

    def count(self) -> int:
        with self.lock:
            users, _ = self._load()
            return len(users)

    def admins(self) -> list:
        with self.lock:
            _, admins = self._load()
            return list(admins)

    def set_admin(self, uid, on: bool) -> None:
        uid = str(uid).strip()
        with self.lock:
            users, admins = self._load()
            if on and uid not in admins:
                admins.append(uid)
                self._persist()
            elif not on and uid in admins:
                admins.remove(uid)
                self._persist()


USERS_DB = UsersDB(USERS_ENV_FILE)


def _load_json(path: str):
    data = _read_json_file(path)
    return data if isinstance(data, dict) else {}


def _save_json(path: str, obj) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def _load_admins() -> list:
    return _load_json(ADMINS_FILE).get("ids", [])


def _save_admins(ids: list) -> None:
    _save_json(ADMINS_FILE, {"ids": ids})


def _is_admin(uid) -> bool:
    if OWNER_ID and str(uid) == str(OWNER_ID):
        return True
    return str(uid) in USERS_DB.admins()


def save_player_seen(uid, name="", username="", photo="", source="bot", verified=True):
    """Совместимость: запись игрока ботом при /start (до открытия WebApp)."""
    rec = USERS_DB.upsert_seen(uid, name, username, photo=photo, source=source, verified=verified)
    return rec is not None


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
def _user_name(u):
    return ((u.get("first_name") or "") + " " + (u.get("last_name") or "")).strip()


def _resolve_init_data(body, query):
    """Возвращает initData из тела или (фолбэк) из URL-параметра."""
    raw = body.get("initData", "") or ""
    if not raw and query:
        qs = urllib.parse.parse_qs(query)
        raw = (qs.get("initData") or [""])[0]
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "ignore")
    return raw or ""


def handle_api(method: str, path: str, body_bytes: bytes, query: str = ""):
    """Возвращает (status, dict) для JSON-ответа."""
    if method == "POST" and path == "/api/validate":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        init = _resolve_init_data(body, query)
        ok, user, reason = check_init_data(init)
        if not ok or not user:
            return 401, {"ok": False, "error": reason}
        USERS_DB.upsert_seen(
            user.get("id", ""),
            _user_name(user),
            user.get("username") or "",
            photo=user.get("photo_url") or "",
            source="webapp",
            verified=True,
        )
        return 200, {"ok": True, "user": user}

    # Регистрация посетителя БЕЗ авторизации: игрок попадает в список,
    # даже если initData не прошёл проверку (чужой бот, протухшая сессия).
    if method == "POST" and path == "/api/player/seen":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        uid = body.get("id")
        if not uid and query:
            try:
                quser = json.loads(_parse_init_data(_resolve_init_data(body, query)).get("user", "{}")) or {}
                uid = quser.get("id")
                body.setdefault("name", _user_name(quser))
                body.setdefault("username", quser.get("username") or "")
                body.setdefault("photo", quser.get("photo_url") or "")
            except Exception:
                pass
        rec = USERS_DB.upsert_seen(
            uid, body.get("name"), body.get("username"), photo=body.get("photo", ""), source="webapp"
        )
        if rec is None:
            return 400, {"ok": False, "error": "bad id"}
        return 200, {"ok": True, "total": USERS_DB.count()}

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
        init = _resolve_init_data(body, query)
        ok, user, reason = check_init_data(init)
        if not ok or not user:
            # даже при непринятой подписи фиксируем визит (без балансов),
            # чтобы человек всё равно появился в списке админки
            seen_user = user
            if seen_user is None and init:
                try:
                    seen_user = json.loads(_parse_init_data(init).get("user", "{}")) or None
                except Exception:
                    seen_user = None
            if seen_user:
                USERS_DB.upsert_seen(
                    seen_user.get("id", ""),
                    _user_name(seen_user),
                    seen_user.get("username") or "",
                    photo=seen_user.get("photo_url") or "",
                    source="webapp",
                )
            return 401, {"ok": False, "error": reason}
        uid = str(user.get("id", ""))
        if not uid:
            return 400, {"ok": False, "error": "bad uid"}
        USERS_DB.update_player(
            uid,
            coins=body.get("coins"),
            robux=body.get("robux"),
            streak=body.get("streak"),
            name=_user_name(user),
            username=user.get("username") or "",
            photo=user.get("photo_url") or "",
        )
        return 200, {"ok": True}

    if method == "POST" and path == "/api/players":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        init = _resolve_init_data(body, query)
        ok, user, reason = check_init_data(init)
        if not ok or not user:
            return 401, {"ok": False, "error": reason}
        if not _is_admin(user.get("id")):
            return 403, {"ok": False, "error": "forbidden"}
        return 200, {
            "ok": True,
            "players": USERS_DB.all(),
            "admins": USERS_DB.admins(),
            "total": USERS_DB.count(),
        }

    if method == "POST" and path == "/api/player/remove":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        init = _resolve_init_data(body, query)
        ok, user, reason = check_init_data(init)
        if not ok or not user:
            return 401, {"ok": False, "error": reason}
        if not _is_admin(user.get("id")):
            return 403, {"ok": False, "error": "forbidden"}
        target = str(body.get("id", ""))
        if not target:
            return 400, {"ok": False, "error": "bad id"}
        if str(user.get("id")) == target:
            return 400, {"ok": False, "error": "cannot remove self"}
        USERS_DB.remove(target)
        return 200, {"ok": True, "removed": target}

    if method == "POST" and path == "/api/admin/set":
        try:
            body = json.loads(body_bytes or b"{}")
        except Exception:
            body = {}
        init = _resolve_init_data(body, query)
        ok, user, reason = check_init_data(init)
        if not ok or not user:
            return 401, {"ok": False, "error": reason}
        if not (OWNER_ID and str(user.get("id", "")) == str(OWNER_ID)):
            return 403, {"ok": False, "error": "forbidden"}
        target = str(body.get("id", ""))
        if not target:
            return 400, {"ok": False, "error": "bad id"}
        USERS_DB.set_admin(target, bool(body.get("on")))
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