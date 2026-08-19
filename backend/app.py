"""
rbxflare — минимальный бэкенд (Python 3.11 + Flask).

Назначение на этом этапе:
1. Валидация Telegram initData (проверка подписи HMAC-SHA256).
2. Отдача статики фронтенда (index.html, styles/, scripts/, assets/).
3. Получение bio пользователя через Bot API getChat.
4. Рефералы: запись друга + выдача списка друзей (реальное время между устройствами).

Запуск:
    cd backend
    pip install -r requirements.txt
    python app.py
"""
import hashlib
import hmac
import json
import os
import time
import urllib.parse

from dotenv import load_dotenv
from flask import Flask, jsonify, request
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

load_dotenv(os.path.join(BASE_DIR, ".env"))
BOT_TOKEN = os.getenv("BOT_TOKEN", "")


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
    """Возвращает dict с данными пользователя или None, если подпись неверна/протухла."""
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
        if time.time() - auth_date > 86400:  # старше суток — не принимаем
            return None
        user = json.loads(data.get("user", "{}"))
        return user or None
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


app = Flask(__name__, static_folder=FRONT_DIR, static_url_path="")


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.post("/api/validate")
def api_validate():
    body = request.get_json(silent=True) or {}
    user = validate_init_data(body.get("initData", ""))
    if not user:
        return jsonify({"ok": False, "error": "invalid initData"}), 401
    return jsonify({"ok": True, "user": user})


@app.get("/api/user/<int:uid>/bio")
def api_bio(uid):
    if not BOT_TOKEN:
        return jsonify({"ok": False, "bio": ""})
    try:
        resp = requests.get(
            f"https://api.telegram.org/bot{BOT_TOKEN}/getChat",
            params={"chat_id": uid},
            timeout=8,
        )
        data = resp.json()
        if data.get("ok"):
            return jsonify({"ok": True, "bio": data.get("result", {}).get("bio", "")})
    except Exception:
        pass
    return jsonify({"ok": False, "bio": ""})


@app.get("/api/referrals/<int:uid>")
def api_referrals(uid):
    users = _load_users()
    friends = users.get(str(uid), {}).get("friends", [])
    return jsonify({"ok": True, "friends": friends})


@app.post("/api/referral")
def api_referral():
    body = request.get_json(silent=True) or {}
    referrer_id = body.get("referrerId")
    friend = body.get("friend") or {}
    if not referrer_id or not friend.get("id"):
        return jsonify({"ok": False, "error": "missing fields"}), 400
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
    return jsonify({"ok": True})


@app.errorhandler(404)
def not_found(_e):
    return jsonify({"ok": False, "error": "not found"}), 404


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=False)