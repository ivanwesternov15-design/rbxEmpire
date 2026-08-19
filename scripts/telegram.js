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

  function init() {
    isRealTelegram = !!webApp;
    if (webApp) {
      try {
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor && webApp.setHeaderColor("#0B1620");
        webApp.setBackgroundColor && webApp.setBackgroundColor("#0B1620");
      } catch (e) {}
    }

    const raw = webApp ? webApp.initDataUnsafe : null;
    const u = (raw && raw.user) || null;
    const startParam = (raw && raw.start_param) || "";

    if (u) {
      user = {
        id: u.id,
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        username: u.username || "",
        photoUrl: u.photo_url || "",
        lang: (u.language_code || "ru").slice(0, 2),
        premium: !!u.is_premium,
      };
    } else {
      // Демо-пользователь вне Telegram (владелец — для доступа к админ-панели)
      user = {
        id: OWNER_ID,
        firstName: "Senku",
        lastName: "",
        username: "qzysl",
        photoUrl: "",
        lang: "ru",
        premium: true,
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
    if (webApp && webApp.openTelegramLink) {
      try { webApp.openTelegramLink(url); return; } catch (e) {}
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