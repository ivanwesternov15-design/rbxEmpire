/**
 * Точка входа: инициализация, глобальные слушатели, рендер-диспетчер.
 */
if (typeof window === "undefined") {
  // Запуск вне браузера (например, случайный `node scripts/app.js` при сборке) — выходим без ошибки.
} else {
(function () {
  const user = TG.init();
  State.load();

  /* ---------------- диспетчер рендера ---------------- */
  function renderTopbar() {
    const tb = document.getElementById("topbar");
    const inner = tb.querySelector(".topbar-inner");
    const isHome = Nav.currentSection() === "home";
    inner.classList.toggle("compact", !isHome);
    const name = ((user.firstName || "") + " " + (user.lastName || "")).trim() || "User";
    document.getElementById("topbar-avatar").innerHTML = UI.avatarHtml(user, isHome ? 46 : 38);
    document.getElementById("topbar-name").textContent = name;
    document.getElementById("topbar-id").textContent = "ID: " + user.id;
  }

  Views.render = function (name) {
    renderTopbar();
    const fn = Views[name];
    if (typeof fn === "function") fn();
  };

  /* ---------------- глобальный слушатель состояния ---------------- */
  State.on(function () {
    I18N.setLang(State.get().lang);
    I18N.applyDOM();
    const completed = State.checkTasks();
    completed.forEach((c) => {
      UI.haptic("success");
      if (c.granted.card) {
        UI.popup(I18N.t("r." + c.granted.card.rarity) + "!", "cards");
      } else {
        const amt = c.granted.coins || c.granted.robux;
        UI.popup("+" + UI.fmt(amt) + (c.granted.coins ? " " + I18N.t("stats.coins") : " " + I18N.t("stats.robux")), c.granted.coins ? "coin" : "robux");
      }
    });
    if (Nav.currentSection()) Views.render(Nav.currentSection());
    Nav.renderNav();
  });

  /* ---------------- boot ---------------- */
  I18N.setLang(State.get().lang);
  State.updateStreak();
  Nav.renderNav();
  Nav.switchTo("home", { force: true });

  // start-параметр реферальной ссылки (ref_123)
  if (State.handleStartParam()) {
    UI.toast(I18N.t("ref.welcome"), "gift");
  }

  // bio пользователя через Bot API getChat (если бэкенд доступен)
  if (Views.fetchBio) Views.fetchBio();
  // отправка отложенного реферала на бэкенд (если пользователь зашёл по ref-ссылке)
  setInterval(() => {
    State.flushPendingReferral();
  }, 20000);

  // валидация initData на бэкенде (best effort — без влияния на UI)
  if (TG.isTelegram() && TG.getInitData()) {
    API.validate(TG.getInitData()).then((res) => {
      if (!res || !res.ok) console.warn("[rbxflare] initData validation failed");
    });
  }

  window.addEventListener("resize", () => Nav.updateIndicator());
})();
}