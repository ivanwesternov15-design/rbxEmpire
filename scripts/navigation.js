/**
 * Навигация: 5 разделов, анимированный индикатор, bottom-sheet выбора категории,
 * SPA-переходы с fade+slide.
 */
const Nav = (function () {
  const SECTIONS = ["home", "cards", "referrals", "tasks", "profile"];
  const LABEL_KEYS = ["nav.home", "nav.cards", "nav.referrals", "nav.tasks", "nav.profile"];
  const ICONS = ["home", "cards", "referrals", "tasks", "profile"];

  let current = "home";

  function sectionEl(name) {
    return document.getElementById("sec-" + name);
  }

  function renderNav() {
    const nav = document.getElementById("bottomnav");
    const items = nav.querySelectorAll(".nav-item");
    items.forEach((item, i) => {
      item.innerHTML = Icons.get(ICONS[i]) + `<span class="nav-label">${I18N.t(LABEL_KEYS[i])}</span>`;
      if (!item.dataset.bound) {
        item.dataset.bound = "1";
        item.addEventListener("click", () => switchTo(SECTIONS[i]));
        bindLongPress(item, () => openCategorySheet());
      }
    });
    updateIndicator();
  }

  function updateIndicator() {
    const nav = document.getElementById("bottomnav");
    const indicator = document.getElementById("nav-indicator");
    const active = nav.querySelector('.nav-item[data-section="' + current + '"]');
    if (!active) return;
    const center = active.offsetLeft + active.offsetWidth / 2;
    indicator.style.left = center + "px";
    indicator.style.transform = "translateX(-50%)";
  }

  function bindLongPress(node, cb) {
    let timer = null;
    const start = () => {
      timer = setTimeout(() => cb(), 450);
    };
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };
    node.addEventListener("pointerdown", start);
    node.addEventListener("pointerup", cancel);
    node.addEventListener("pointerleave", cancel);
    node.addEventListener("pointermove", (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 12) cancel();
    });
  }

  function switchTo(name, opts = {}) {
    if (name === current && !opts.force) {
      sectionEl(name) && sectionEl(name).scrollTo(0, 0);
      return;
    }
    const fromIdx = SECTIONS.indexOf(current);
    const toIdx = SECTIONS.indexOf(name);
    if (toIdx < 0) return;
    const prev = sectionEl(current);
    const next = sectionEl(name);
    const forward = toIdx > fromIdx;

    if (prev) {
      prev.classList.remove("active");
      prev.classList.add("sec-out");
      setTimeout(() => prev.classList.remove("sec-out"), 220);
    }
    next.classList.remove("sec-out");
    next.classList.add("active");
    void next.offsetWidth;
    next.classList.add(forward ? "sec-in-left" : "sec-in-left");
    setTimeout(() => next.classList.remove("sec-in-left"), 280);

    current = name;
    document.querySelectorAll(".nav-item").forEach((it) => {
      const on = it.getAttribute("data-section") === name;
      it.classList.toggle("active", on);
      if (on && State.get().haptics) TG.haptic("light");
    });
    updateIndicator();

    const topbar = document.getElementById("topbar");
    if (name === "profile") topbar.classList.add("hidden");
    else topbar.classList.remove("hidden");

    Views.render(name);
  }

  function openCategorySheet() {
    const body = SECTIONS.map((s, i) => {
      const on = s === current ? "active-cat" : "";
      return `<button class="cat-card ${on}" data-go="${s}">
        <span class="cat-icon">${Icons.get(ICONS[i])}</span>
        <span class="cat-info">
          <span class="cat-title">${I18N.t(LABEL_KEYS[i])}</span>
          <span class="cat-desc">${I18N.t("cat." + s + ".desc")}</span>
        </span>
      </button>`;
    }).join("");
    const m = UI.modal({ title: I18N.t("cat.title"), icon: "grid", body });
    m.onSwipeDown(() => {});
    m.bodyEl.querySelectorAll(".cat-card").forEach((c) => {
      c.addEventListener("click", () => {
        m.close();
        switchTo(c.getAttribute("data-go"));
      });
    });
  }

  function currentSection() {
    return current;
  }

  function refreshCurrent() {
    Views.render(current);
    renderNav();
  }

  return { renderNav, switchTo, openCategorySheet, currentSection, refreshCurrent, updateIndicator };
})();