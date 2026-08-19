/**
 * Telegram WebApp: инициализация, пользователь, haptics, шаринг.
 * Вне Telegram (локальный предпросмотр) подставляется демо-пользователь-владелец,
 * чтобы можно было тестировать админ-панель.
 */
const TG = (function () {
  const OWNER_ID = 8414792453;
  let user = null;

  /* WebApp-объект появляется после загрузки telegram-web-app.js — берём лениво */
  function getWebApp() {
    return (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) || null;
  }

  function isRealTelegram() {
    return !!getWebApp();
  }

  /* парсинг initData вручную (резерв, если initDataUnsafe не заполнен клиентом) */
  function parseInitData(raw) {
    if (!raw) return null;
    try {
      const q = new URLSearchParams(raw);
      const u = q.get("user");
      if (!u) return null;
      return JSON.parse(decodeURIComponent(u));
    } catch (e) {
      return null;
    }
  }

  function buildUser(u) {
    return {
      id: u.id,
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      username: u.username || "",
      photoUrl: u.photo_url || "",
      lang: (u.language_code || "ru").slice(0, 2),
      premium: !!u.is_premium,
      startParam: "",
    };
  }

  function init() {
    const webApp = getWebApp();
    if (webApp) {
      try {
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor && webApp.setHeaderColor("#070D13");
        webApp.setBackgroundColor && webApp.setBackgroundColor("#0B1620");
      } catch (e) {}
    }

    const raw = webApp ? webApp.initDataUnsafe : null;
    const u = (raw && raw.user) || parseInitData(webApp ? webApp.initData : "");
    const startParam = (raw && raw.start_param) || "";

    if (u && u.id) {
      user = buildUser(u);
    } else {
      // Демо-пользователь вне Telegram: нейтральный, без привязки к конкретному аккаунту
      user = {
        id: 0,
        firstName: "",
        lastName: "",
        username: "",
        photoUrl: "",
        lang: "ru",
        premium: false,
        startParam: "",
      };
    }

    // start param: tgWebAppStartParam / initDataUnsafe.start_param / query-параметр
    let param = startParam;
    if (!param) {
      const qp = new URLSearchParams(window.location.search);
      param = qp.get("startapp") || qp.get("start_param") || "";
    }
    user.startParam = param;
    return user;
  }

  /* некоторые клиенты Telegram заполняют данные чуть позже — пробуем дозагрузить */
  function retryUser() {
    const webApp = getWebApp();
    if (!webApp || !user || (user.id && user.id !== 0)) return;
    const raw = webApp.initDataUnsafe || null;
    const u = (raw && raw.user) || parseInitData(webApp.initData || "");
    if (u && u.id) {
      user = buildUser(u);
      return true;
    }
    return false;
  }

  function hasUserData() {
    return isRealTelegram() && !!user && !!user.id;
  }

  function haptic(type) {
    const webApp = getWebApp();
    if (!webApp || !webApp.HapticFeedback) return;
    try {
      if (type === "success") webApp.HapticFeedback.notificationOccurred("success");
      else if (type === "error") webApp.HapticFeedback.notificationOccurred("error");
      else if (type === "warning") webApp.HapticFeedback.notificationOccurred("warning");
      else webApp.HapticFeedback.impactOccurred(type === "heavy" ? "heavy" : "light");
    } catch (e) {}
  }

  function copyText(text, cb) {
    const done = () => cb && cb();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    done();
  }

  function isMobilePlatform() {
    const webApp = getWebApp();
    const platform = ((webApp && webApp.platform) || "").toLowerCase();
    return platform === "android" || platform === "ios";
  }

  function shareLink(url, text) {
    haptic("light");
    const webApp = getWebApp();
    // 1) нативная шторка шаринга внутри Telegram — мини-апп вообще не сворачивается
    if (webApp && webApp.shareURL) {
      try {
        webApp.shareURL(url, text);
        return;
      } catch (e) {}
    }
    // 2) Web Share API (мобильные браузеры)
    if (navigator.share && navigator.canShare) {
      try {
        navigator.share({ title: "Rbx Game", text: text, url: url });
        return;
      } catch (e) {}
    }
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text);
    // 3) мобильные клиенты: открытие внутри Telegram — мини-апп сворачивается в фон (не закрывается)
    if (webApp) {
      try {
        if (isMobilePlatform() && webApp.openTelegramLink) {
          webApp.openTelegramLink(shareUrl);
          return;
        }
        webApp.openLink(shareUrl, { try_instant_view: false });
        return;
      } catch (e) {}
    }
    window.open(shareUrl, "_blank");
  }

  function openTelegramLink(url) {
    const webApp = getWebApp();
    if (webApp) {
      try {
        // мобильные клиенты: открытие внутри Telegram, мини-апп уходит в фон (не закрывается)
        if (isMobilePlatform() && webApp.openTelegramLink) {
          webApp.openTelegramLink(url);
          return;
        }
        // десктоп / web: внешний браузер — мини-апп остаётся открытым
        webApp.openLink(url, { try_instant_view: false });
        return;
      } catch (e) {}
    }
    window.open(url, "_blank");
  }

  function getInitData() {
    const webApp = getWebApp();
    return webApp ? webApp.initData : "";
  }

  function setBgColor(color) {
    const webApp = getWebApp();
    if (webApp && webApp.setBackgroundColor) {
      try { webApp.setBackgroundColor(color); } catch (e) {}
    }
  }

  return {
    init,
    getUser: () => user,
    retryUser,
    hasUserData,
    haptic,
    copyText,
    shareLink,
    openTelegramLink,
    getInitData,
    setBgColor,
    isTelegram: () => isRealTelegram(),
    OWNER_ID,
  };
})();