/**
 * HTTP-клиент к бэкенду (Python/Flask).
 * Все запросы относительные — работают на BotHost/любом домене.
 * Если бэкенд недоступен (локальный предпросмотр) — возвращаем null,
 * фронтенд работает полностью автономно на локальном кэше.
 */
const API = (function () {
  // дублируем initData в URL-параметр — страховка, если тело POST теряется
  function withInit(path, initData) {
    if (!initData) return path;
    const sep = path.indexOf("?") >= 0 ? "&" : "?";
    return path + sep + "initData=" + encodeURIComponent(initData);
  }

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
      return post(withInit("/api/validate", initData), { initData });
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
      const initData = window.TG ? TG.getInitData() : "";
      return post(withInit("/api/player/ping", initData), Object.assign({ initData }, payload || {}));
    },
    /* регистрация посетителя без авторизации — работает даже при 401 */
    seen(payload) {
      const initData = window.TG ? TG.getInitData() : "";
      return post(withInit("/api/player/seen", initData), Object.assign({ initData }, payload || {}));
    },
    players() {
      const initData = window.TG ? TG.getInitData() : "";
      return post(withInit("/api/players", initData), { initData });
    },
    removeServerPlayer(id) {
      const initData = window.TG ? TG.getInitData() : "";
      return post(withInit("/api/player/remove", initData), { initData, id });
    },
    setServerAdmin(id, on) {
      const initData = window.TG ? TG.getInitData() : "";
      return post(withInit("/api/admin/set", initData), { initData, id, on });
    },
  };
})();