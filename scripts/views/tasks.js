/**
 * Раздел «Задания».
 */
(function () {
  let lastDoneIds = null;

  function taskIcon(type) {
    const map = { collect: "cards", collect5: "cards", streak: "flame", staking: "clock", invite: "referrals", robux: "robux", daily: "daily", custom: "sparkles" };
    return map[type] || "tasks";
  }

  function rewardText(task) {
    const r = task.reward;
    if (r.type === "coins") return "+" + UI.fmt(r.amount) + " " + I18N.t("stats.coins");
    if (r.type === "robux") return "+" + UI.fmt(r.amount) + " " + I18N.t("stats.robux");
    if (r.type === "card") return I18N.t("r." + (r.rarity || "gold")) + " " + I18N.t("tasks.reward.card");
    return "";
  }

  function taskCardHtml(task, idx) {
    const title = task.titleKey ? I18N.t(task.titleKey) : task.title || I18N.t("tasks.title");
    const desc = task.descKey ? I18N.t(task.descKey) : task.desc || "";
    const pct = Math.min(100, Math.round((task.progress / task.target) * 100));
    const justDone = task.done && lastDoneIds && !lastDoneIds.includes(task.id) ? "just-done" : "";
    const rewardIcon = task.reward.type === "coins" ? "coin" : task.reward.type === "robux" ? "robux" : "cards";
    const showProgress = !task.done && task.target > 1;
    return `
      <div class="task-card ${task.done ? "done" : ""} ${justDone}" data-id="${task.id}" style="animation-delay:${Math.min(idx * 45, 300)}ms">
        <div class="task-head">
          <span class="task-icon ${task.done ? "done-icon" : ""}">${Icons.get(task.done ? "check" : taskIcon(task.type))}</span>
          <span style="flex:1;min-width:0">
            <span class="task-title" style="display:block">${title}</span>
            ${desc ? `<span class="task-desc" style="display:block">${desc}</span>` : ""}
          </span>
          <span class="task-reward-chip ${task.done ? "earned" : ""}">
            ${Icons.get(rewardIcon)}${rewardText(task)}
          </span>
        </div>
        <div class="task-body">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="task-progress-num">
            ${task.done
              ? `<span class="tick">${Icons.get("check")}</span> ${I18N.t("tasks.reward.earned")}`
              : showProgress
              ? `${UI.fmt(task.progress)} / ${UI.fmt(task.target)} · ${pct}%`
              : I18N.t("tasks.status.waiting")}
          </div>
        </div>
      </div>`;
  }

  Views.tasks = function () {
    const s = State.get();
    const sec = document.getElementById("sec-tasks");
    const tasks = s.tasks;
    if (!tasks.length) {
      sec.innerHTML = `<div class="panel glass-panel"><div class="empty-state">${Icons.get("tasks")}<div class="empty-title">${I18N.t("tasks.empty")}</div></div></div>`;
      return;
    }
    const doneCount = tasks.filter((t) => t.done).length;
    const totalCount = tasks.length;
    const donePct = Math.round((doneCount / totalCount) * 100);

    const CATS = [
      { key: "subs", icon: "send" },
      { key: "ach", icon: "trophy" },
      { key: "friends", icon: "users" },
    ];

    const catHtml = CATS.map((cat) => {
      const list = tasks.filter((t) => (t.cat || "ach") === cat.key);
      if (!list.length) return "";
      const active = list.filter((t) => !t.done);
      const done = list.filter((t) => t.done);
      const group = (items, doneFlag) => items.map((t) => taskCardHtml(t, doneFlag)).join("");
      return `
        <div class="task-group-title">${Icons.get(cat.icon)}${I18N.t("task.cat." + cat.key)}</div>
        <div class="task-cat-desc">${I18N.t("task.cat." + cat.key + ".desc")}</div>
        ${group(active, false)}
        ${group(done, true)}`;
    }).join("");

    sec.innerHTML = `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("tasks")}${I18N.t("tasks.title")}</h2>
          <span class="task-done-count ${doneCount === totalCount ? "all" : ""}">${doneCount}/${totalCount}</span>
        </div>
        <div class="progress-track" style="margin-bottom:10px"><div class="progress-fill" style="width:${donePct}%"></div></div>
        <div class="task-summary">
          ${Icons.get("sparkles")}
          <span>${I18N.t("tasks.summary").replace("{done}", doneCount).replace("{total}", totalCount)}</span>
        </div>
        <div class="task-tip">
          ${Icons.get("info")}
          <span>${I18N.t("tasks.tip")}</span>
        </div>
      </div>
      ${catHtml}`;

    // запомнить выполнившиеся для следующего рендера (анимация just-done)
    const nowDone = tasks.filter((t) => t.done).map((t) => t.id);
    const newlyDone = lastDoneIds ? tasks.filter((t) => t.done && !lastDoneIds.includes(t.id)) : [];
    lastDoneIds = nowDone;

    newlyDone.forEach(() => {
      UI.haptic("success");
    });

    if (newlyDone.length) {
      // отрисовка конфетти для свежевыполненных
      newlyDone.forEach((t) => {
        const el = sec.querySelector('.task-card[data-id="' + t.id + '"]');
        if (el) UI.confetti(el, 18);
      });
    }
  };
})();