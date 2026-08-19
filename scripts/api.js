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
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
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
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
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
  };
})();