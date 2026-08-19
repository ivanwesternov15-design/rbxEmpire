/**
 * Telegram WebApp: инициализация, пользователь, haptics, шаринг.
 * Вне Telegram (локальный предпросмотр) подставляется демо-пользователь-владелец,
 * чтобы можно было тестировать админ-панель.
 */
const TG = (function () {
  const webApp = (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) || null;
  const OWNER_ID = 8414792453;
  let user = null;
  let isRealTelegram = false;

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
    isRealTelegram = !!webApp;
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
    if (!webApp || !isRealTelegram || !user || (user.id && user.id !== 0)) return;
    const raw = webApp.initDataUnsafe || null;
    const u = (raw && raw.user) || parseInitData(webApp.initData || "");
    if (u && u.id) {
      user = buildUser(u);
      return true;
    }
    return false;
  }

  function hasUserData() {
    return isRealTelegram && !!user && !!user.id;
  }

  function haptic(type) {
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

  function shareLink(url, text) {
    haptic("light");
    if (webApp && webApp.shareURL) {
      try {
        webApp.shareURL(url, text);
        return;
      } catch (e) {}
    }
    if (webApp && webApp.openTelegramLink) {
      try {
        webApp.openTelegramLink(
          "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text)
        );
        return;
      } catch (e) {}
    }
    window.open("https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text), "_blank");
  }

  function openTelegramLink(url) {
    if (webApp) {
      try {
        // мобильные клиенты: открытие ссылки внутри Telegram сворачивает апп в фон (не закрывает)
        const platform = (webApp.platform || "").toLowerCase();
        const mobile = platform === "android" || platform === "ios";
        if (mobile) {
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
    return webApp ? webApp.initData : "";
  }

  function setBgColor(color) {
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
    isTelegram: () => isRealTelegram,
    OWNER_ID,
  };
})();