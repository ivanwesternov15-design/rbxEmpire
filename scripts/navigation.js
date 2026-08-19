/**
 * Навигация: 5 разделов, «слайм»-индикатор (растягивается под ширину активной
 * категории, как iOS 26), bottom-sheet выбора категории, SPA-переходы с fade+slide.
 */
const Nav = (function () {
  const SECTIONS = ["home", "cards", "referrals", "tasks", "profile"];
  const LABEL_KEYS = ["nav.home", "nav.cards", "nav.referrals", "nav.tasks", "nav.profile"];
  const ICONS = ["home", "cards", "referrals", "tasks", "profile"];
  const ACCENTS = {
    home: ["#38BDF8", "#0E7490"],
    cards: ["#A78BFA", "#6D28D9"],
    referrals: ["#FBBF24", "#B45309"],
    tasks: ["#34D399", "#047857"],
    profile: ["#F472B6", "#BE185D"],
  };

  let current = "home";
  let busy = false;
  let suppressClick = false;

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
    const pad = 10;
    const left = active.offsetLeft;
    const width = active.offsetWidth;
    const center = left + width / 2;
    indicator.style.left = (center - (width - pad * 2) / 2) + "px";
    indicator.style.width = (width - pad * 2) + "px";
    const acc = ACCENTS[current] || ACCENTS.home;
    indicator.style.setProperty("--nav-color", acc[0]);
    indicator.style.setProperty("--nav-color-2", acc[1]);
    indicator.style.setProperty("--nav-glow", hexToRgba(acc[0], 0.4));
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function bindLongPress(node, cb) {
    let timer = null;
    let dragged = false;
    const start = (e) => {
      dragged = false;
      timer = setTimeout(() => {
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 600);
        cb();
      }, 450);
    };
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };
    node.addEventListener("pointerdown", start);
    node.addEventListener("pointerup", cancel);
    node.addEventListener("pointerleave", cancel);
    node.addEventListener("pointermove", (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 10) {
        dragged = true;
        cancel();
      }
    });
    node.addEventListener("click", (e) => {
      if (suppressClick || dragged) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  }

  function switchTo(name, opts = {}) {
    if (busy && !opts.force) return;
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

    busy = true;
    setTimeout(() => (busy = false), 420);

    if (prev) {
      prev.classList.remove("active");
      prev.classList.add("sec-out");
      setTimeout(() => prev.classList.remove("sec-out"), 260);
    }
    next.classList.remove("sec-out", "sec-in-left");
    next.classList.add("active");
    void next.offsetWidth;
    next.classList.add(forward ? "sec-in-left" : "sec-in");
    setTimeout(() => next.classList.remove("sec-in-left", "sec-in"), 400);

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