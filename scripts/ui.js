/**
 * UI-хелперы: модалки, тосты, попапы, конфетти, счётчики, форматирование.
 */
const UI = (function () {
  /* ---------------- форматирование ---------------- */
  function fmt(n) {
    return Number(n || 0).toLocaleString("ru-RU").replace(/,/g, " ");
  }
  function fmtDate(ts) {
    const d = new Date(ts);
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + String(d.getFullYear()).slice(2);
  }
  function fmtFullDate(ts) {
    const d = new Date(ts);
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " г.";
  }
  function fmtDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return d + " " + I18N.t("h.days") + " " + h + " " + I18N.t("h.hours");
    if (h > 0) return h + " " + I18N.t("h.hours") + " " + m + " " + I18N.t("h.min");
    return m + " " + I18N.t("h.min") + " " + sec + " " + I18N.t("h.sec");
  }
  function fmtCountdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(sec);
  }
  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function daysAgo(ts) {
    return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  }

  /* ---------------- DOM ---------------- */
  function el(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  function bind(root, selector, event, fn) {
    const node = typeof root === "string" ? document.querySelector(root) : root;
    if (!node) return;
    node.addEventListener(event, (e) => {
      const t = e.target.closest(selector);
      if (t && node.contains(t)) fn(t, e);
    });
  }

  function ripple(e, node) {
    const rect = node.getBoundingClientRect();
    const r = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = e.clientX - rect.left - size / 2 + "px";
    r.style.top = e.clientY - rect.top - size / 2 + "px";
    node.appendChild(r);
    setTimeout(() => r.remove(), 520);
  }

  /* ---------------- модалки ---------------- */
  function modal({ title = "", icon = "info", body = "", center = false, onClose = null }) {
    const root = document.getElementById("modal-root");
    const header = title
      ? `<div class="modal-header">
            <h3>${icon ? Icons.get(icon) : ""}${title}</h3>
            <button class="icon-btn modal-close">${Icons.get("close")}</button>
          </div>`
      : `<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button class="icon-btn modal-close">${Icons.get("close")}</button></div>`;
    const overlay = el(
      `<div class="modal-overlay">
        <div class="modal ${center ? "modal-center" : ""}">
          ${center ? "" : '<div class="modal-grabber"></div>'}
          ${header}
          <div class="modal-body">${body}</div>
        </div>
      </div>`
    );
    const close = (animate = true) => {
      if (!animate) {
        overlay.remove();
        document.documentElement.classList.remove("no-scroll");
        return;
      }
      overlay.classList.add("closing");
      overlay.querySelector(".modal").classList.add("closing");
      setTimeout(() => {
        overlay.remove();
        if (!root.querySelector(".modal-overlay")) document.documentElement.classList.remove("no-scroll");
      }, 240);
      if (onClose) onClose();
    };
    // блокируем свайп подложки: если модалка сама не скроллится — глушим жест
    overlay.addEventListener(
      "touchmove",
      (e) => {
        const sheet = overlay.querySelector(".modal");
        if (!sheet || sheet.scrollHeight <= sheet.clientHeight + 2) e.preventDefault();
      },
      { passive: false }
    );
    document.documentElement.classList.add("no-scroll");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector(".modal-close").addEventListener("click", () => close());
    root.appendChild(overlay);
    return {
      close,
      overlay,
      bodyEl: overlay.querySelector(".modal-body"),
      onSwipeDown(fn) {
        let startY = null;
        const sheet = overlay.querySelector(".modal");
        sheet.addEventListener("touchstart", (e) => (startY = e.touches[0].clientY), { passive: true });
        sheet.addEventListener("touchmove", (e) => {
          if (startY === null) return;
          const dy = e.touches[0].clientY - startY;
          if (dy > 0) sheet.style.transform = "translateY(" + Math.min(dy, 160) + "px)";
        }, { passive: true });
        sheet.addEventListener("touchend", (e) => {
          const dy = e.changedTouches[0].clientY - (startY || 0);
          startY = null;
          sheet.style.transform = "";
          if (dy > 90) {
            close();
            fn && fn();
          }
        }, { passive: true });
      },
    };
  }

  function closeAllModals() {
    const root = document.getElementById("modal-root");
    root.innerHTML = "";
    document.documentElement.classList.remove("no-scroll");
  }

  /* ---------------- тост ---------------- */
  function toast(text, icon = "check") {
    const root = document.getElementById("toast-root");
    const t = el(`<div class="toast">${Icons.get(icon)}<span></span></div>`);
    t.querySelector("span").textContent = text;
    root.appendChild(t);
    setTimeout(() => {
      t.classList.add("leaving");
      setTimeout(() => t.remove(), 220);
    }, 1800);
  }

  /* ---------------- поп-ап награды ---------------- */
  function popup(text, icon = "coin") {
    const root = document.getElementById("popup-root");
    const p = el(`<div class="reward-popup">${Icons.get(icon)}<span></span></div>`);
    p.querySelector("span").textContent = text;
    root.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }

  /* ---------------- конфетти ---------------- */
  function confetti(container, count = 26, colors = null) {
    const rect = container.getBoundingClientRect();
    const palette = colors || ["#ffd76a", "#4ade80", "#00d4ff", "#ec4899", "#a855f7", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.8 + "px";
      piece.style.top = rect.top + rect.height / 2 + "px";
      piece.style.background = palette[Math.floor(Math.random() * palette.length)];
      piece.style.setProperty("--dx", (Math.random() - 0.5) * 220 + "px");
      piece.style.setProperty("--dy", (80 + Math.random() * 160) + "px");
      piece.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      piece.style.setProperty("--dur", (0.9 + Math.random() * 0.8) + "s");
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1800);
    }
  }

  /* ---------------- счётчик ---------------- */
  function countUp(node, from, to, duration = 700, suffix = "") {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * ease);
      node.textContent = fmt(val) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- история ---------------- */
  function historyRowsHtml() {
    const s = State.get();
    if (!s.history.length) {
      return `<div class="empty-state" style="padding:28px 16px">${Icons.get("history")}<div class="empty-title">${I18N.t("profile.history.empty")}</div></div>`;
    }
    const iconMap = { card: "cards", stake: "coin", buy: "shop", task: "medal", daily: "daily" };
    return s.history
      .map((h) => {
        const icon = iconMap[h.icon] || "info";
        const amount =
          h.amountType === "coins"
            ? `<span class="hist-amount" style="color:var(--accent-gold)">+${fmt(h.amount)} C</span>`
            : h.amountType === "robux"
            ? `<span class="hist-amount" style="color:var(--text-main)">+${fmt(h.amount)} R</span>`
            : "";
        return `
          <div class="list-row history-row">
            <span class="hist-icon">${Icons.get(icon)}</span>
            <span style="flex:1;min-width:0">
              <div class="hist-text">${I18N.t(h.text)}</div>
              <div class="hist-date">${new Date(h.ts).toLocaleDateString("ru-RU")} ${new Date(h.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
            </span>
            ${amount}
          </div>`;
      })
      .join("");
  }

  /* ---------------- тактильная отдача ---------------- */
  function haptic(type) {
    const st = State && State.get ? State.get() : null;
    if (st && !st.haptics) return;
    TG.haptic(type);
  }

  /* ---------------- аватар ---------------- */
  function avatarHtml(user, size, extraClass) {
    const name = (user.firstName || "") + " " + (user.lastName || "");
    const initials = (name.trim()[0] || "?").toUpperCase();
    const style = size ? `style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px"` : "";
    if (user.photoUrl) {
      return `<div class="avatar ${extraClass || ""}" ${style}><img src="${user.photoUrl}" alt="" onerror="this.parentElement.classList.add('avatar-initials');this.remove()"></div>`;
    }
    return `<div class="avatar avatar-initials ${extraClass || ""}" ${style}>${initials}</div>`;
  }

  return {
    fmt,
    fmtDate,
    fmtFullDate,
    fmtDuration,
    fmtCountdown,
    daysAgo,
    el,
    bind,
    ripple,
    modal,
    closeAllModals,
    toast,
    popup,
    confetti,
    countUp,
    haptic,
    avatarHtml,
    historyRowsHtml,
  };
})();