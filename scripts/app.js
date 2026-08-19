/**
 * Точка входа: инициализация, глобальные слушатели, рендер-диспетчер.
 */
if (typeof window === "undefined") {
  // Бот-хостинг запускает проект через node (start command: scripts/app.js).
  // Настоящий бэкенд — Python: проверяем зависимости и поднимаем его как дочерний процесс.
  const { spawn, spawnSync } = require("child_process");
  const path = require("path");
  const backendDir = path.join(__dirname, "..", "backend");
  const py = process.env.PYTHON || (spawnSync("python3", ["--version"]).error ? "python" : "python3");

  const deps = spawnSync(py, ["-c", "import flask, requests, dotenv"], { encoding: "utf8" });
  if (deps.status !== 0) {
    process.stdout.write("[rbxflare] установка зависимостей backend/requirements.txt...\n");
    const inst = spawnSync(py, ["-m", "pip", "install", "-r", path.join(backendDir, "requirements.txt")], { stdio: "inherit" });
    if (inst.status !== 0) {
      process.stderr.write("[rbxflare] pip install завершился с ошибкой\n");
    }
  }

  const child = spawn(py, ["main.py"], { cwd: backendDir, stdio: "inherit" });
  child.on("error", (e) => {
    process.stderr.write("[rbxflare] не удалось запустить python: " + e.message + "\n");
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code == null ? 0 : code));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
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