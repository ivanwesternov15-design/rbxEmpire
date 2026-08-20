/**
 * HTTP-клиент к бэкенду (Python/Flask).
 * Все запросы относительные — работают на BotHost/любом домене.
 * Если бэкенд недоступен (локальный предпросмотр) — возвращаем null,
 * фронтенд работает полностью автономно на локальном кэше.
 */
const API = (function () {
  async function get(path, timeoutMs = 6000) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(path, { headers: { Accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) {
        let err = "";
        try { err = (await r.json()).error || ""; } catch (e) {}
        return { ok: false, status: r.status, error: err, network: false };
      }
      return await r.json();
    } catch (e) {
      return null; // сеть недоступна / таймаут
    }
  }

  async function post(path, body, timeoutMs = 6000) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        let err = "";
        try { err = (await r.json()).error || ""; } catch (e) {}
        return { ok: false, status: r.status, error: err, network: false };
      }
      return await r.json();
    } catch (e) {
      return null; // сеть недоступна / таймаут
    }
  }

  return {
    validate(initData) {
      return post("/api/validate", { initData });
    },
    bio(uid) {
      return get("/api/user/" + uid + "/bio");
    },
    friends(uid) {
      return get("/api/referrals/" + uid);
    },
    addReferral(body) {
      return post("/api/referral", body);
    },
    pingPlayer(payload) {
      return post("/api/player/ping", Object.assign({ initData: window.TG ? TG.getInitData() : "" }, payload || {}));
    },
    players() {
      return post("/api/players", { initData: window.TG ? TG.getInitData() : "" });
    },
    removeServerPlayer(id) {
      return post("/api/player/remove", { initData: window.TG ? TG.getInitData() : "", id });
    },
    setServerAdmin(id, on) {
      return post("/api/admin/set", { initData: window.TG ? TG.getInitData() : "", id, on });
    },
  };
})();