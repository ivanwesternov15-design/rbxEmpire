/**
 * Админ-панель (только для владельца/админов).
 * Категории: Пользователи, Задания, Карточки, Магазин, Стейкинг, Система.
 * Рендерится как под-экран Профиля (window.ADMIN_OPEN) или как отдельная страница admin.html.
 */
const Views = window.Views || {};
window.Views = Views;

(function () {
  const DUR_KEYS = ["12h", "24h", "3d", "7d"];
  const DUR_LABELS = { "12h": "12 ч", "24h": "24 ч", "3d": "3 дн", "7d": "7 дн" };
  const CAT_KEYS = ["subs", "ach", "friends"];
  const CAT_LABELS = { subs: () => I18N.t("task.cat.subs"), ach: () => I18N.t("task.cat.ach"), friends: () => I18N.t("task.cat.friends") };
  const TASK_TYPES = [
    { v: "collect", l: "task.t.collect" },
    { v: "collect5", l: "task.t.collect5" },
    { v: "streak", l: "task.t.streak3" },
    { v: "staking", l: "task.t.staking1" },
    { v: "invite", l: "task.t.invite" },
    { v: "robux", l: "task.t.robux500" },
    { v: "daily", l: "task.t.daily" },
    { v: "custom", l: "task.t.custom" },
  ];
  let activeTab = "users";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function rarityOptions(sel) {
    return State.RARITIES.map((r) => `<option value="${r}" ${sel === r ? "selected" : ""}>${I18N.t("r." + r)}</option>`).join("");
  }
  function balSet(id, type, isMe) {
    const idAttr = isMe ? "" : `data-user-id="${id}"`;
    return `
      <input class="au-set-in" type="number" inputmode="numeric" min="0" placeholder="0" data-bal-type="${type}" ${idAttr}>
      <button class="au-set-btn" data-bal-save data-bal-type="${type}" ${idAttr}>${Icons.get("check")}</button>`;
  }

  /* ================= ПОЛЬЗОВАТЕЛИ ================= */
  function roleBadgeBig(id) {
    if (id === TG.OWNER_ID) return `<span class="au-role role-owner">${Icons.get("shield")}${I18N.t("admin.users.role.owner")}</span>`;
    if (State.isAdminId(id)) return `<span class="au-role role-admin">${Icons.get("shield")}${I18N.t("admin.users.role.admin")}</span>`;
    return `<span class="au-role">${I18N.t("admin.users.role.user")}</span>`;
  }

  function usersSection() {
    const me = TG.getUser();
    const s = State.get();
    const meName = ((me.firstName || "") + " " + (me.lastName || "")).trim() || "User";
    const isOwner = State.isOwner();
    const meRow = `
      <div class="au-hero" id="me-card">
        <div class="au-hero-glow"></div>
        <div class="au-head">
          <div class="au-ava-wrap">
            ${UI.avatarHtml(me, 54)}
            <span class="au-ava-badge">${Icons.get("verified")}</span>
          </div>
          <div class="au-meta">
            <div class="au-name">${esc(meName)}</div>
            ${roleBadgeBig(me.id)}
            <div class="au-id">ID: ${me.id}${me.username ? " · @" + esc(me.username) : ""}</div>
          </div>
        </div>
        <div class="au-bals">
          <div class="au-bal">
            <div class="au-bal-top"><span>${Icons.get("coin")}${I18N.t("admin.users.coins")}</span><b>${UI.fmt(s.balances.coins)}</b></div>
            <div class="au-set">${balSet(me.id, "coins", true)}</div>
          </div>
          <div class="au-bal">
            <div class="au-bal-top"><span>${Icons.get("robux")}${I18N.t("admin.users.robux")}</span><b>${UI.fmt(s.balances.robux)}</b></div>
            <div class="au-set">${balSet(me.id, "robux", true)}</div>
          </div>
        </div>
        <div class="au-quick">
          <button class="au-quick-btn" id="me-grant">${Icons.get("cards")}<span>${I18N.t("admin.users.grant")}</span></button>
          <button class="au-quick-btn" id="me-daily">${Icons.get("refresh")}<span>${I18N.t("admin.users.daily")}</span></button>
          <button class="au-quick-btn danger" id="me-reset">${Icons.get("trash")}<span>${I18N.t("admin.users.reset")}</span></button>
        </div>
      </div>`;

    const users = State.users();
    const merged = users.slice();
    if (Array.isArray(serverPlayers)) {
      serverPlayers.forEach((p) => {
        if (!merged.some((x) => x.id === parseInt(p.id, 10))) {
          merged.push({ id: parseInt(p.id, 10), name: p.name || "User " + p.id, username: p.username || "", coins: p.coins || 0, robux: p.robux || 0, lastSeen: p.lastSeen });
        }
      });
    }
    const list = merged.length
      ? users
          .map((u) => {
            const isOwnerU = u.id === TG.OWNER_ID;
            const isAdmin = State.isAdminId(u.id);
            return `
            <div class="admin-user">
              <div class="au-head">
                ${UI.avatarHtml({ firstName: u.name, id: u.id }, 40)}
                <div class="au-meta">
                  <div class="au-name">${esc(u.name)}</div>
                  ${roleBadgeBig(u.id)}
                  <div class="au-id">ID: ${u.id}${u.username ? " · @" + esc(u.username) : ""}</div>
                </div>
                <button class="au-switch ${isAdmin ? "on" : ""}" data-admin-toggle="${u.id}" ${isOwnerU ? "disabled" : ""} title="${isOwnerU ? "" : (isAdmin ? I18N.t("admin.users.admin.off") : I18N.t("admin.users.admin.on"))}">
                  <span class="au-switch-knob"></span>
                </button>
              </div>
              <div class="au-bals">
                <div class="au-bal">
                  <div class="au-bal-top"><span>${Icons.get("coin")}${I18N.t("admin.users.coins")}</span><b>${UI.fmt(u.coins || 0)}</b></div>
                  <div class="au-set">${balSet(u.id, "coins", false)}</div>
                </div>
                <div class="au-bal">
                  <div class="au-bal-top"><span>${Icons.get("robux")}${I18N.t("admin.users.robux")}</span><b>${UI.fmt(u.robux || 0)}</b></div>
                  <div class="au-set">${balSet(u.id, "robux", false)}</div>
                </div>
              </div>
              <div class="au-row-actions">
                <button class="btn btn-ghost" data-user-del="${u.id}" ${isOwnerU ? "disabled" : ""}>${Icons.get("trash")}${I18N.t("admin.shop.remove")}</button>
              </div>
            </div>`;
          })
          .join("")
      : `<div class="empty-state" style="padding:24px 0">${Icons.get("users")}<div class="empty-sub">${I18N.t("admin.users.empty")}</div></div>`;

    const syncNote = Array.isArray(serverPlayers)
      ? `<div class="sync-note">${Icons.get("refresh")}${I18N.t("admin.users.synced")}</div>`
      : "";

    return `
      <div class="admin-section">
        <h4>${Icons.get("shield")}${I18N.t("admin.users.me")} ${isOwner ? `<span class="badge badge-gold" style="margin-left:auto">${I18N.t("admin.users.role.owner")}</span>` : ""}</h4>
        ${meRow}
      </div>
      <div class="admin-section">
        <h4>${Icons.get("users")}${I18N.t("admin.users.list")} <span class="h4-count">${merged.length}</span></h4>
        ${list}
        ${syncNote}
        <div class="add-user-row">
          <input type="number" id="user-add-id" placeholder="123456789">
          <button class="btn btn-primary" id="user-add-btn">${Icons.get("plus")}${I18N.t("admin.users.add")}</button>
        </div>
      </div>`;
  }

  function bindUsers(root) {
    API.players()
      .then((res) => {
        if (res && Array.isArray(res.players)) {
          serverPlayers = res.players;
          render();
        }
      })
      .catch(() => {});
    root.querySelectorAll("[data-bal-save]").forEach((b) => {
      b.addEventListener("click", () => {
        const type = b.getAttribute("data-bal-type");
        const idRaw = b.getAttribute("data-user-id");
        const input = b.parentElement.querySelector(".au-set-in");
        const v = parseInt((input || {}).value, 10);
        if (!input || isNaN(v)) {
          UI.haptic("warning");
          UI.toast(I18N.t("admin.users.bad"), "info");
          return;
        }
        State.setBalance(idRaw ? parseInt(idRaw, 10) : null, type, v);
        UI.haptic("success");
        UI.toast(I18N.t("admin.users.saved"), "check");
        render();
      });
    });
    root.querySelectorAll("[data-admin-toggle]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = parseInt(b.getAttribute("data-admin-toggle"), 10);
        const on = !State.isAdminId(id);
        State.setAdminRole(id, on);
        API.setServerAdmin(id, on).catch(() => {});
        UI.haptic(on ? "success" : "light");
        UI.toast(I18N.t(on ? "admin.users.admin.granted" : "admin.users.admin.revoked"), on ? "check" : "info");
        render();
      });
    });
    root.querySelectorAll("[data-user-del]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = parseInt(b.getAttribute("data-user-del"), 10);
        State.removeUser(id);
        UI.haptic("light");
        UI.toast(I18N.t("admin.users.removed"), "info");
        render();
      });
    });
    const meDaily = root.querySelector("#me-daily");
    if (meDaily) {
      meDaily.addEventListener("click", () => {
        State.resetDaily();
        UI.haptic("success");
        UI.toast(I18N.t("admin.users.daily.ok"), "check");
      });
    }
    const meGrant = root.querySelector("#me-grant");
    if (meGrant) {
      meGrant.addEventListener("click", () => {
        const c = State.grantRandomCard();
        UI.haptic("success");
        UI.toast(`${I18N.t("admin.users.grant.ok")}: ${I18N.t("r." + c.rarity)} · ${UI.fmt(c.value)} R`, "cards");
      });
    }
    const meReset = root.querySelector("#me-reset");
    if (meReset) {
      meReset.addEventListener("click", () => {
        UI.haptic("warning");
        const m = UI.modal({
          title: I18N.t("admin.users.reset"),
          icon: "trash",
          body: `<p class="text-soft" style="margin-bottom:14px">${I18N.t("admin.users.reset.confirm")}</p>
            <div class="row">
              <button class="btn btn-ghost grow" id="reset-no">${I18N.t("common.cancel")}</button>
              <button class="btn btn-danger grow" id="reset-yes">${I18N.t("admin.users.reset")}</button>
            </div>`,
        });
        m.bodyEl.querySelector("#reset-no").addEventListener("click", () => m.close());
        m.bodyEl.querySelector("#reset-yes").addEventListener("click", () => {
          m.close();
          State.resetUserProgress(TG.getUser().id);
          UI.haptic("success");
          UI.toast(I18N.t("admin.users.reset.done"), "check");
          render();
          if (window.ADMIN_OPEN === false) Views.render("profile");
        });
      });
    }
    const addBtn = root.querySelector("#user-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const id = parseInt((root.querySelector("#user-add-id") || {}).value, 10);
        if (!id || id <= 0) {
          UI.toast("ID?", "info");
          return;
        }
        State.upsertUser({ id, firstName: "User " + id, username: "" });
        UI.haptic("success");
        UI.toast(I18N.t("admin.users.added"), "check");
        render();
      });
    }
  }

  /* ================= ЗАДАНИЯ ================= */
  function taskRow(t) {
    const title = t.titleKey ? I18N.t(t.titleKey) : t.title;
    const reward =
      t.reward.type === "coins"
        ? Icons.get("coin") + UI.fmt(t.reward.amount)
        : t.reward.type === "robux"
        ? Icons.get("robux") + UI.fmt(t.reward.amount)
        : Icons.get("cards") + "Card";
    const customControls =
      t.type === "custom"
        ? `<div style="display:flex;gap:6px;margin-top:8px;align-items:center">
            <span class="ai-label">${I18N.t("admin.tasks.custom.progress")}: ${t.progress}/${t.target}</span>
            <button class="btn btn-ghost" data-task-dec="${t.id}" style="padding:4px 10px;font-size:12px">−1</button>
            <button class="btn btn-ghost" data-task-inc="${t.id}" style="padding:4px 10px;font-size:12px">+1</button>
          </div>`
        : "";
    return `
      <div class="admin-card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:13.5px">${esc(title)}</span>
              <span class="badge" style="font-size:10px;padding:2px 8px">${CAT_LABELS[t.cat] ? CAT_LABELS[t.cat]() : I18N.t("task.cat.ach")}</span>
              ${t.done ? `<span class="badge badge-green" style="font-size:10px;padding:2px 8px">✓</span>` : ""}
            </div>
            <div class="text-dim" style="font-size:11.5px;margin-top:2px">${esc(t.type)} · ${I18N.t("admin.tasks.target")}: ${t.target} · ${reward}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-ghost" data-task-edit="${t.id}" style="padding:5px 10px;font-size:11.5px">${Icons.get("settings")}${I18N.t("admin.tasks.edit")}</button>
            <button class="btn ${t.done ? "btn-ghost" : "btn-green"}" data-task-force="${t.id}" style="padding:5px 10px;font-size:11.5px">
              ${t.done ? I18N.t("admin.tasks.unforce") : I18N.t("admin.tasks.force")}
            </button>
            <button class="btn btn-danger" data-task-del="${t.id}" style="padding:5px 10px;font-size:11.5px">${Icons.get("trash")}</button>
          </div>
        </div>
        ${customControls}
      </div>`;
  }

  function tasksSection() {
    const s = State.get();
    const list = s.tasks.map(taskRow).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("tasks")}${I18N.t("admin.tasks")}</h4>
        ${list || `<div class="text-dim" style="font-size:13px;padding:8px 0">${I18N.t("cards.shop.empty")}</div>`}
        <button class="btn btn-gold" id="task-add-btn" style="width:100%;margin-top:8px">${Icons.get("plus")}${I18N.t("admin.tasks.add")}</button>
      </div>`;
  }

  function taskModal(task) {
    const t = task || { title: "", desc: "", cat: "ach", type: "custom", target: 1, reward: { type: "coins", amount: 100 } };
    const typeOptions = TASK_TYPES.map((tt) => `<option value="${tt.v}" ${tt.v === t.type ? "selected" : ""}>${I18N.t(tt.l)}</option>`).join("");
    const catOptions = CAT_KEYS.map((c) => `<option value="${c}" ${c === t.cat ? "selected" : ""}>${CAT_LABELS[c]()}</option>`).join("");
    const body = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="field"><label>${I18N.t("admin.tasks.title")}</label><input id="tm-title" type="text" value="${esc(t.titleKey ? I18N.t(t.titleKey) : t.title)}"></div>
        <div class="field"><label>${I18N.t("admin.tasks.desc")}</label><input id="tm-desc" type="text" value="${esc(t.desc || "")}"></div>
        <div class="field"><label>${I18N.t("admin.tasks.cat")}</label><select id="tm-cat">${catOptions}</select></div>
        <div class="field"><label>${I18N.t("admin.tasks.type")}</label><select id="tm-type">${typeOptions}</select></div>
        <div class="field"><label>${I18N.t("admin.tasks.target")}</label><input id="tm-target" type="number" step="1" value="${t.target}"></div>
        <div class="field">
          <label>${I18N.t("admin.tasks.reward.type")}</label>
          <select id="tm-reward-type">
            <option value="coins" ${t.reward.type === "coins" ? "selected" : ""}>Coins</option>
            <option value="robux" ${t.reward.type === "robux" ? "selected" : ""}>Robux</option>
            <option value="card" ${t.reward.type === "card" ? "selected" : ""}>Card</option>
          </select>
        </div>
        <div class="field"><label>${I18N.t("admin.tasks.reward.amount")}</label><input id="tm-reward-amount" type="number" step="1" value="${t.reward.type === "card" ? "" : t.reward.amount || 0}"></div>
        <button class="btn btn-primary" id="tm-save" style="width:100%">${Icons.get("check")}${task ? I18N.t("admin.tasks.save") : I18N.t("admin.tasks.add.btn")}</button>
      </div>`;
    const m = UI.modal({ title: task ? I18N.t("admin.tasks.edit") : I18N.t("admin.tasks.add"), icon: "tasks", body, center: false });
    const save = () => {
      const title = (m.querySelector("#tm-title").value || "").trim();
      const desc = (m.querySelector("#tm-desc").value || "").trim();
      const patch = {
        title: title || "task",
        desc,
        cat: m.querySelector("#tm-cat").value,
        type: m.querySelector("#tm-type").value,
        target: parseInt(m.querySelector("#tm-target").value, 10) || 1,
        reward:
          m.querySelector("#tm-reward-type").value === "card"
            ? { type: "card", rarity: "gold" }
            : { type: m.querySelector("#tm-reward-type").value, amount: parseInt(m.querySelector("#tm-reward-amount").value, 10) || 0 },
      };
      if (task) State.updateTask(task.id, patch);
      else State.addTask(patch);
      UI.haptic("success");
      UI.toast(I18N.t("admin.tasks.saved"), "check");
      m.close();
      render();
    };
    m.querySelector("#tm-save").addEventListener("click", save);
    m.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); }));
  }

  function bindTasks(root) {
    root.querySelectorAll("[data-task-edit]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = State.get().tasks.find((x) => x.id === b.getAttribute("data-task-edit"));
        if (t) taskModal(t);
      });
    });
    root.querySelectorAll("[data-task-del]").forEach((b) => {
      b.addEventListener("click", () => {
        State.removeTask(b.getAttribute("data-task-del"));
        UI.toast(I18N.t("admin.tasks.removed"), "info");
        render();
      });
    });
    root.querySelectorAll("[data-task-force]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-force");
        const t = State.get().tasks.find((x) => x.id === id);
        if (!t) return;
        const granted = State.forceTask(id, !t.done);
        if (granted) {
          UI.popup("+" + (granted.coins || granted.robux) + (granted.coins ? " " + I18N.t("stats.coins") : " " + I18N.t("stats.robux")), granted.coins ? "coin" : "robux");
        }
        render();
      });
    });
    root.querySelectorAll("[data-task-inc]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-inc");
        const t = State.get().tasks.find((x) => x.id === id);
        if (t) State.setTaskProgress(id, t.progress + 1);
        render();
      });
    });
    root.querySelectorAll("[data-task-dec]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-dec");
        const t = State.get().tasks.find((x) => x.id === id);
        if (t) State.setTaskProgress(id, t.progress - 1);
        render();
      });
    });
    const addBtn = root.querySelector("#task-add-btn");
    if (addBtn) addBtn.addEventListener("click", () => taskModal(null));
  }

  /* ================= КАРТОЧКИ ================= */
  function cardsSection() {
    const ch = State.get().admin.chances;
    const sum = State.RARITIES.reduce((s, r) => s + (Number(ch[r]) || 0), 0);
    const chanceRows = State.RARITIES.map(
      (r) => `
        <div class="admin-inline">
          <span class="ai-label" style="color:var(--rarity-color-${r});min-width:64px">${I18N.t("r." + r)}</span>
          <input type="number" step="1" value="${ch[r] || 0}" data-chance="${r}">
          <span class="ai-unit">%</span>
        </div>`
    ).join("");
    const v = State.get().admin.values;
    const valueRows = State.RARITIES.map(
      (r) => `
        <div class="admin-inline">
          <span class="ai-label" style="color:var(--rarity-color-${r});min-width:64px">${I18N.t("r." + r)}</span>
          <input type="number" step="1" value="${v[r][0]}" data-value-min="${r}">
          <span class="ai-unit">–</span>
          <input type="number" step="1" value="${v[r][1]}" data-value-max="${r}">
          <span class="ai-unit">R</span>
        </div>`
    ).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("sparkles")}${I18N.t("admin.cards.chances")}</h4>
        <div class="admin-card">
          ${chanceRows}
          <div class="admin-sum ${sum === 100 ? "ok" : ""}" id="chance-sum">${I18N.t("admin.chances.sum")}: <b>${sum}%</b></div>
        </div>
        <button class="btn btn-primary" id="admin-save-chances" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>
      <div class="admin-section">
        <h4>${Icons.get("robux")}${I18N.t("admin.cards.values")}</h4>
        <div class="admin-card">${valueRows}</div>
        <button class="btn btn-primary" id="admin-save-values" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>
      <div class="admin-section">
        <h4>${Icons.get("gamepad")}${I18N.t("admin.cards.test")}</h4>
        <div class="admin-card">
          <button class="btn btn-gold" id="roll-test" style="width:100%">${Icons.get("cards")}${I18N.t("admin.cards.test.btn")}</button>
          <div class="text-dim" id="roll-result" style="font-size:13px;text-align:center;margin-top:10px"></div>
        </div>
      </div>`;
  }

  function bindCards(root) {
    const cBtn = root.querySelector("#admin-save-chances");
    if (cBtn) {
      cBtn.addEventListener("click", () => {
        const chances = {};
        State.RARITIES.forEach((r) => {
          chances[r] = parseInt(root.querySelector(`[data-chance="${r}"]`).value, 10) || 0;
        });
        State.setAdmin({ chances });
        UI.haptic("success");
        UI.toast(I18N.t("admin.saved"), "check");
      });
      root.querySelectorAll("[data-chance]").forEach((inp) => {
        inp.addEventListener("input", () => {
          const sum = State.RARITIES.reduce((acc, r) => {
            const el = root.querySelector(`[data-chance="${r}"]`);
            return acc + (parseInt(el.value, 10) || 0);
          }, 0);
          const el = root.querySelector("#chance-sum");
          el.innerHTML = `${I18N.t("admin.chances.sum")}: <b>${sum}%</b>`;
          el.classList.toggle("ok", sum === 100);
        });
      });
    }
    const vBtn = root.querySelector("#admin-save-values");
    if (vBtn) {
      vBtn.addEventListener("click", () => {
        const values = {};
        State.RARITIES.forEach((r) => {
          const min = parseInt(root.querySelector(`[data-value-min="${r}"]`).value, 10) || 0;
          const max = parseInt(root.querySelector(`[data-value-max="${r}"]`).value, 10) || min;
          values[r] = [min, Math.max(min, max)];
        });
        State.setAdmin({ values });
        UI.haptic("success");
        UI.toast(I18N.t("admin.saved"), "check");
      });
    }
    const roll = root.querySelector("#roll-test");
    if (roll) {
      roll.addEventListener("click", () => {
        const r = State.rollRarity();
        const val = State.rollValue(r.rarity);
        const el = root.querySelector("#roll-result");
        el.innerHTML = `${I18N.t("admin.cards.test.result")}: <b style="color:var(--rarity-color-${r.rarity})">${I18N.t("r." + r.rarity)}</b> · ${UI.fmt(val)} ${Icons.get("robux")}`;
        UI.haptic("light");
      });
    }
  }

  /* ================= МАГАЗИН ================= */
  function shopSection() {
    const s = State.get();
    const list = s.shop.length
      ? s.shop
          .map(
            (o) => `
            <div class="shop-item" style="margin-bottom:8px">
              <div class="shop-thumb rarity-bg" style="background:var(--rarity-${o.rarity})"><img src="assets/cards/${cap(o.rarity)}.png" alt=""></div>
              <div style="flex:1;min-width:0">
                <div class="shop-name" style="color:var(--rarity-color-${o.rarity})">${I18N.t("r." + o.rarity)}</div>
                <div class="shop-price">${Icons.get("coin")}${UI.fmt(o.price)}</div>
                <div class="shop-limit">${o.qty - o.sold} / ${o.qty}</div>
              </div>
              <button class="btn btn-danger" data-shop-del="${o.id}">${Icons.get("trash")}</button>
            </div>`
          )
          .join("")
      : `<div class="text-dim" style="font-size:13px;padding:8px 0">${I18N.t("cards.shop.empty")}</div>`;
    return `
      <div class="admin-section">
        <h4>${Icons.get("shop")}${I18N.t("admin.shop")}</h4>
        ${list}
        <div class="admin-card" style="margin-top:10px">
          <div class="ac-title">${I18N.t("admin.shop.add")}</div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.rarity")}</span>
            <select id="shop-rarity">${rarityOptions("basic")}</select>
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.price")}</span>
            <input type="number" step="1" value="200" id="shop-price">
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.qty")}</span>
            <input type="number" step="1" value="3" id="shop-qty">
          </div>
          <button class="btn btn-gold" id="admin-shop-publish" style="width:100%">${Icons.get("plus")}${I18N.t("admin.shop.publish")}</button>
        </div>
      </div>`;
  }

  function bindShop(root) {
    root.querySelectorAll("[data-shop-del]").forEach((b) => {
      b.addEventListener("click", () => {
        State.removeShopOffer(b.getAttribute("data-shop-del"));
        render();
      });
    });
    const publish = root.querySelector("#admin-shop-publish");
    if (publish) {
      publish.addEventListener("click", () => {
        const rarity = root.querySelector("#shop-rarity").value;
        const price = parseInt(root.querySelector("#shop-price").value, 10) || 100;
        const qty = parseInt(root.querySelector("#shop-qty").value, 10) || 1;
        State.addShopOffer({ rarity, price, qty });
        UI.haptic("success");
        UI.toast(I18N.t("admin.shop.published"), "check");
        render();
      });
    }
  }

  /* ================= СТЕЙКИНГ ================= */
  function stakingSection() {
    const cfg = State.get().admin.staking;
    const cards = DUR_KEYS.map((k) => {
      const c = cfg[k] || { pct: 0, bonus: 0 };
      return `
        <div class="admin-card">
          <div class="ac-title">${DUR_LABELS[k]}</div>
          <div class="admin-inline">
            <span class="ai-label">%</span>
            <input type="number" step="0.1" value="${c.pct}" data-stake-pct="${k}">
          </div>
          <div class="admin-inline">
            <span class="ai-label">R</span>
            <input type="number" step="1" value="${c.bonus}" data-stake-bonus="${k}">
          </div>
        </div>`;
    }).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("clock")}${I18N.t("admin.staking")}</h4>
        <div class="admin-grid">${cards}</div>
        <button class="btn btn-primary" id="admin-save-staking" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>`;
  }

  function bindStaking(root) {
    const sBtn = root.querySelector("#admin-save-staking");
    if (sBtn) {
      sBtn.addEventListener("click", () => {
        const cfg = {};
        DUR_KEYS.forEach((k) => {
          const pct = parseFloat(root.querySelector(`[data-stake-pct="${k}"]`).value) || 0;
          const bonus = parseInt(root.querySelector(`[data-stake-bonus="${k}"]`).value, 10) || 0;
          cfg[k] = { pct, bonus };
        });
        State.setAdmin({ staking: cfg });
        UI.haptic("success");
        UI.toast(I18N.t("admin.saved"), "check");
      });
    }
  }

  /* ================= СИСТЕМА ================= */
  function systemSection() {
    return `
      <div class="admin-section">
        <h4>${Icons.get("settings")}${I18N.t("admin.system.title")}</h4>
        <div class="admin-card" style="display:flex;align-items:center;justify-content:space-between">
          <span class="ai-label">${I18N.t("admin.system.version")}</span>
          <b style="color:var(--text-main)">v1.1.12</b>
        </div>
      </div>
      <div class="admin-section">
        <h4>${Icons.get("gamepad")}${I18N.t("admin.system.tools")}</h4>
        <div class="admin-grid">
          <button class="btn btn-ghost" id="test-friend">${Icons.get("users")}${I18N.t("admin.test.friend")}</button>
          <button class="btn btn-ghost" id="test-coins">${Icons.get("coin")}${I18N.t("admin.test.coins")}</button>
          <button class="btn btn-ghost" id="test-robux">${Icons.get("robux")}${I18N.t("admin.test.robux")}</button>
        </div>
      </div>`;
  }

  function bindSystem(root) {
    const tf = root.querySelector("#test-friend");
    if (tf) {
      tf.addEventListener("click", () => {
        State.addTestFriend();
        UI.haptic("success");
        UI.toast(I18N.t("admin.test.friend.added"), "check");
      });
    }
    const tc = root.querySelector("#test-coins");
    if (tc) tc.addEventListener("click", () => { UI.haptic("light"); State.addTestCoins(); });
    const tr = root.querySelector("#test-robux");
    if (tr) tr.addEventListener("click", () => { UI.haptic("light"); State.addTestRobux(); });
  }

  /* ================= ОБЩЕЕ ================= */
  function sectionHtml() {
    switch (activeTab) {
      case "tasks":
        return tasksSection();
      case "cards":
        return cardsSection();
      case "shop":
        return shopSection();
      case "staking":
        return stakingSection();
      case "streak":
        return streakSection();
      case "system":
        return systemSection();
      default:
        return usersSection();
    }
  }
  function bindSection(root) {
    switch (activeTab) {
      case "tasks":
        bindTasks(root);
        break;
      case "cards":
        bindCards(root);
        break;
      case "shop":
        bindShop(root);
        break;
      case "staking":
        bindStaking(root);
        break;
      case "streak":
        bindStreak(root);
        break;
      case "system":
        bindSystem(root);
        break;
      default:
        bindUsers(root);
    }
  }
  /* ================= СТРИК ================= */
  function streakSection() {
    const cfg = State.streakCfg();
    const rows = cfg
      .map(
        (v, i) => `
        <div class="admin-inline">
          <span class="ai-label" style="min-width:64px">${Icons.get("flame")}${I18N.t("admin.streak.day")} ${i + 1}</span>
          <input type="number" step="1" min="0" value="${v}" data-streak-day="${i + 1}">
          <span class="ai-unit">Coins</span>
        </div>`
      )
      .join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("flame")}${I18N.t("admin.streak.title")}</h4>
        <div class="admin-card">${rows}</div>
        <button class="btn btn-primary" id="streak-save" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>`;
  }

  function bindStreak(root) {
    const save = root.querySelector("#streak-save");
    if (save) {
      save.addEventListener("click", () => {
        const arr = [];
        for (let i = 1; i <= 10; i++) {
          const inp = root.querySelector(`[data-streak-day="${i}"]`);
          arr.push(parseInt((inp || {}).value, 10) || 0);
        }
        State.setStreakCfg(arr);
        UI.haptic("success");
        UI.toast(I18N.t("admin.streak.saved"), "check");
        render();
      });
    }
  }

  function statCard(icon, value, label) {
    return `<div class="admin-stat"><span class="stat-icon">${Icons.get(icon)}</span><b>${value}</b><span>${label}</span></div>`;
  }

  /* ================= ДАШБОРД: всё по своим местам ================= */
  const CATS = [
    { id: "users", icon: "users", color: "violet" },
    { id: "tasks", icon: "tasks", color: "green" },
    { id: "cards", icon: "cards", color: "gold" },
    { id: "shop", icon: "shop", color: "amber" },
    { id: "staking", icon: "clock", color: "blue" },
    { id: "streak", icon: "flame", color: "orange" },
    { id: "system", icon: "settings", color: "slate" },
  ];
  const CAT_COLORS = { violet: "#8b5cf6", green: "#4ade80", gold: "#ffd76a", amber: "#ffb800", blue: "#38bdf8", slate: "#94a3b8", orange: "#fb923c" };
  let screen = "home";
  let serverPlayers = null;

  function catCount(id) {
    const s = State.get();
    if (id === "users") return State.users().length;
    if (id === "tasks") return s.tasks.length;
    if (id === "shop") return s.shop.length;
    return null;
  }

  function statTiles() {
    const s = State.get();
    return `
      <div class="admin-stats">
        ${statCard("cards", s.inventory.length, I18N.t("cards.title"))}
        ${statCard("users", State.users().length, I18N.t("admin.users.list"))}
        ${statCard("coin", UI.fmt(s.balances.coins), I18N.t("stats.coins"))}
        ${statCard("robux", UI.fmt(s.balances.robux), I18N.t("stats.robux"))}
      </div>`;
  }

  function homeHtml() {
    const cats = CATS.map((c) => {
      const cnt = catCount(c.id);
      return `
        <button class="admin-cat" data-open="${c.id}">
          <span class="ac-icon" style="color:${CAT_COLORS[c.color]};border-color:${CAT_COLORS[c.color]}44;background:${CAT_COLORS[c.color]}1a">${Icons.get(c.icon)}</span>
          <span class="ac-body">
            <span class="ac-name">${I18N.t("admin.tabs." + c.id)}</span>
            <span class="ac-desc">${I18N.t("admin.cat.d." + c.id)}</span>
          </span>
          ${cnt != null ? `<span class="ac-count">${cnt}</span>` : ""}
          <span class="ac-arrow">${Icons.get("arrow")}</span>
        </button>`;
    }).join("");
    return `
      <div class="admin-home">
        <div class="admin-home-head">
          <div>
            <h3>${I18N.t("admin.home.title")}</h3>
            <p>${I18N.t("admin.home.sub")}</p>
          </div>
          <span class="home-shield">${Icons.get("shield")}</span>
        </div>
        ${statTiles()}
        <div class="admin-cats">${cats}</div>
      </div>`;
  }

  function openTab(id) {
    activeTab = id;
    screen = id;
    render();
    const sub = screen === "home" ? null : document.querySelector("#admin-body");
    if (sub) sub.scrollTop = 0;
  }

  function tabScreenHtml(id) {
    const c = CATS.find((x) => x.id === id) || CATS[0];
    return `
      <div class="admin-tab-header">
        <button class="back-btn" id="cat-back">${Icons.get("arrow")}</button>
        <span class="at-icon" style="color:${CAT_COLORS[c.color]};border-color:${CAT_COLORS[c.color]}44;background:${CAT_COLORS[c.color]}1a">${Icons.get(c.icon)}</span>
        <h3>${I18N.t("admin.tabs." + c.id)}</h3>
      </div>
      <div class="admin-body" id="admin-body">${sectionHtml()}</div>`;
  }

  function render() {
    const isPage = !!document.getElementById("admin-root");
    const sub = isPage ? document.getElementById("admin-root") : document.getElementById("profile-sub");
    if (!sub) return;
    let html = "";
    if (!isPage && screen === "home") {
      html += `
        <div class="sub-header">
          <button class="back-btn" id="admin-back">${Icons.get("arrow")}${I18N.t("profile.title")}</button>
          <h3>${Icons.get("shield")}${I18N.t("admin.title")}</h3>
        </div>`;
    }
    html += screen === "home" ? homeHtml() : tabScreenHtml(screen);
    sub.innerHTML = html;

    const back = sub.querySelector("#admin-back");
    if (back) {
      back.addEventListener("click", () => {
        if (isPage) window.history.back();
        else {
          window.ADMIN_OPEN = false;
          Views.render("profile");
        }
      });
    }
    const catBack = sub.querySelector("#cat-back");
    if (catBack) {
      catBack.addEventListener("click", () => {
        UI.haptic("light");
        screen = "home";
        render();
      });
    }
    sub.querySelectorAll("[data-open]").forEach((b) => {
      b.addEventListener("click", () => {
        UI.haptic("light");
        openTab(b.getAttribute("data-open"));
      });
    });
    bindSection(sub);
  }

  Views.admin = function () {
    screen = "home";
    render();
  };
})();