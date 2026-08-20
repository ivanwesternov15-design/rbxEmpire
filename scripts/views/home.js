/**
 * Раздел «Главное».
 */
const Views = window.Views || {};
window.Views = Views;

(function () {
  let countdownTimer = null;

  function stopTimers() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  /* ---------- стрик-окно (раз в 24 часа) ---------- */
  function short(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }

  function streakTrackHtml(cfg, day) {
    let cells = "";
    for (let i = 0; i < 10; i++) {
      const n = i + 1;
      const st = n < day ? "done" : n === day ? "now" : "future";
      cells += `
        <div class="st-cell ${st}">
          <span class="st-dot">${n}</span>
          <span class="st-reward">${short(cfg[i])}</span>
        </div>`;
    }
    return `<div class="streak-track">${cells}</div>`;
  }

  Views.streakPopup = function () {
    const s = State.get();
    const day = Math.min(Math.max(s.balances.streak, 1), 10);
    const cfg = State.streakCfg();
    const body = `
      <div class="streak-popup">
        <div class="sp-icon">${Icons.get("flame")}</div>
        <div class="sp-title">${I18N.t("streak.title").replace("{n}", day)}</div>
        <div class="sp-sub">${I18N.t("streak.sub")}</div>
        ${streakTrackHtml(cfg, day)}
        <div class="sp-today">${I18N.t("streak.today").replace("{amt}", UI.fmt(cfg[day - 1]))}</div>
        <button class="btn btn-gold" id="streak-claim" style="width:100%">${Icons.get("coin")}${I18N.t("streak.claim")}</button>
        <button class="btn btn-ghost" id="streak-later" style="width:100%">${I18N.t("common.cancel")}</button>
      </div>`;
    const m = UI.modal({ title: "", icon: "", body, center: true });
    m.bodyEl.querySelector("#streak-claim").addEventListener("click", () => {
      const r = State.claimStreak();
      UI.haptic("success");
      UI.toast("+" + UI.fmt(r.amount) + " " + I18N.t("stats.coins"), "coin");
      m.close();
    });
    m.bodyEl.querySelector("#streak-later").addEventListener("click", () => m.close());
  };

  /* ---------- ежедневные карточки ---------- */
  function dailyCardBack(i) {
    return `
      <button class="daily-card daily-back" data-i="${i}">
        <span class="card-q">?</span>
        <span class="card-hint">${I18N.t("daily.back")}</span>
      </button>`;
  }

  function dailyHtml() {
    const s = State.get();
    const can = State.canPickDaily();
    const last = s.daily.lastReward;
    const isLocked = !can;
    const slot = s.daily.pickedSlot == null ? 0 : s.daily.pickedSlot;
    let cards = "";
    for (let i = 0; i < 3; i++) {
      if (isLocked && last && i === slot) {
        const r = last.rarity;
        cards += `
          <div class="daily-card revealed rarity-bg" style="background:var(--rarity-${r})">
            <img src="assets/cards/${cap(r)}.png" alt="${I18N.t("r." + r)}">
            <span class="daily-rarity" style="color:#fff;text-shadow:0 0 10px rgba(0,0,0,.6)">${I18N.t("r." + r)}</span>
          </div>`;
      } else if (isLocked) {
        cards += `
          <div class="daily-card locked">
            <span class="card-q">?</span>
            <span class="card-lock">${Icons.get("lock")}</span>
          </div>`;
      } else {
        cards += dailyCardBack(i);
      }
    }
    let countdown = "";
    if (isLocked) {
      countdown = `
        <div class="daily-countdown">
          ${Icons.get("clock")}<span>${I18N.t("daily.countdown")}:</span><b id="daily-cd">--:--:--</b>
        </div>`;
    }
    return `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("daily")}${I18N.t("daily.title")}</h2>
        </div>
        <div class="daily-grid">${cards}</div>
        ${countdown}
        <div class="daily-info">${Icons.get("info")}<span>${I18N.t("daily.info")}</span></div>
      </div>`;
  }

  function startCountdown() {
    stopTimers();
    const el = document.getElementById("daily-cd");
    if (!el) return;
    const tick = () => {
      el.textContent = UI.fmtCountdown(State.timeToNextDaily());
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  /* ---------- быстрые действия ---------- */
  function quickHtml() {
    const items = [
      { icon: "tasks", key: "quick.tasks", go: "tasks" },
      { icon: "clock", key: "quick.staking", go: "cards" },
      { icon: "referrals", key: "quick.referrals", go: "referrals" },
      { icon: "wallet", key: "quick.withdraw", go: "profile" },
    ];
    const grid = items
      .map(
        (it) => `
        <button class="quick-item" data-go="${it.go}">
          <span class="quick-icon">${Icons.get(it.icon)}</span>
          <span class="quick-text">${I18N.t(it.key)}</span>
        </button>`
      )
      .join("");
    return `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("bolt")}${I18N.t("quick.title")}</h2>
        </div>
        <div class="quick-grid">${grid}</div>
      </div>`;
  }

  /* ---------- выбор карточки (лотерея) ---------- */
  function openPickModal() {
    const body = `
      <div class="daily-grid" style="margin-bottom:14px">
        ${[0, 1, 2].map((i) => dailyCardBack(i)).join("")}
      </div>
      <p class="text-dim" style="font-size:13px;text-align:center;margin-bottom:14px">${I18N.t("daily.choose")}</p>
      <button class="btn btn-primary" id="daily-confirm" style="width:100%" disabled>${I18N.t("daily.confirm")}</button>`;
    const m = UI.modal({ title: I18N.t("daily.pick"), icon: "daily", body, center: false });
    m.onSwipeDown(() => {});
    const backs = m.bodyEl.querySelectorAll(".daily-back");
    let chosen = null;
    backs.forEach((b) => {
      b.addEventListener("click", () => {
        UI.haptic("light");
        backs.forEach((x) => {
          x.style.borderColor = "var(--glass-border-strong)";
          x.style.boxShadow = "none";
        });
        b.style.borderColor = "rgba(255,215,106,.7)";
        b.style.boxShadow = "0 0 20px rgba(255,215,106,.35)";
        chosen = Number(b.getAttribute("data-i"));
        m.bodyEl.querySelector("#daily-confirm").disabled = false;
      });
    });
    m.bodyEl.querySelector("#daily-confirm").addEventListener("click", () => {
      if (chosen === null) return;
      UI.haptic("heavy");
      m.close();
      openRevealModal(chosen);
    });
  }

  function openRevealModal(slot) {
    const body = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0 4px">
        <div class="flip-scene">
          <div class="flip-card" id="flip-card">
            <div class="face face-back">
              <span class="card-q" style="font-size:44px;color:rgba(204,208,207,.5)">?</span>
            </div>
            <div class="face face-front rarity-bg" id="flip-front" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
              <img id="flip-img" style="width:78%;height:auto;border-radius:8px;margin-top:10px" src="" alt="">
              <span id="flip-rarity" style="font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#fff;text-shadow:0 0 10px rgba(0,0,0,.7);margin-top:-8px"></span>
            </div>
          </div>
        </div>
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:800" id="reveal-title">${I18N.t("daily.reveal.title")}</div>
          <div class="reward-line" id="reveal-value" style="justify-content:center;margin-top:6px"></div>
          <div class="text-dim" style="font-size:12.5px;margin-top:4px">${I18N.t("daily.reveal.sub")}</div>
        </div>
        <button class="btn btn-gold" id="reveal-take" style="width:100%">${I18N.t("daily.reveal.take")}</button>
      </div>`;
    const m = UI.modal({ title: "", icon: "", body, center: true });
    const card = State.pickDaily();
    if (!card) {
      m.close(false);
      return;
    }
    const front = m.bodyEl.querySelector("#flip-front");
    const img = m.bodyEl.querySelector("#flip-img");
    const rName = m.bodyEl.querySelector("#flip-rarity");
    img.src = "assets/cards/" + cap(card.rarity) + ".png";
    front.style.background = "var(--rarity-" + card.rarity + ")";
    rName.textContent = I18N.t("r." + card.rarity);
    m.bodyEl.querySelector("#reveal-value").innerHTML =
      Icons.get("robux") + "<span>" + UI.fmt(card.value) + " Robux</span>";

    setTimeout(() => {
      m.bodyEl.querySelector("#flip-card").classList.add("flipped");
    }, 500);
    setTimeout(() => {
      UI.confetti(m.bodyEl.querySelector(".flip-scene"), 30);
      UI.haptic("success");
    }, 1400);

    m.bodyEl.querySelector("#reveal-take").addEventListener("click", () => {
      m.close();
    });
    m.onSwipeDown(() => {});
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- рендер ---------- */
  Views.home = function () {
    stopTimers();
    const sec = document.getElementById("sec-home");
    sec.innerHTML = dailyHtml() + quickHtml();

    // ежедневные карточки
    if (State.canPickDaily()) {
      sec.querySelectorAll(".daily-back").forEach((b) => {
        b.addEventListener("click", () => {
          UI.haptic("light");
          openPickModal();
        });
      });
    } else {
      startCountdown();
    }

    // быстрые действия
    sec.querySelectorAll(".quick-item").forEach((q) => {
      q.addEventListener("click", () => {
        UI.haptic("light");
        Nav.switchTo(q.getAttribute("data-go"));
      });
    });
  };
})();