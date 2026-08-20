/**
 * SVG-иконки в стиле минимализма 2026 (stroke 1.8, round caps).
 * Используются инлайном через Icons.get(name).
 */
const Icons = (function () {
  const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    home: `<svg ${S}><path d="M3 11.5 12 3l9 8.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`,
    cards: `<svg ${S}><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><rect x="6" y="6.5" width="12" height="11" rx="1.5"/><path d="m12 8.2.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2z"/><path d="M7 15.5c1.4 1.6 3.2 2.4 5 2.4s3.6-.8 5-2.4"/></svg>`,
    referrals: `<svg ${S}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8"/><path d="M18.5 15.4c1.5.9 2.6 2.4 3 4.6"/></svg>`,
    tasks: `<svg ${S}><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 8h7"/><path d="M8.5 12h7"/><path d="m9 16 1.8 1.8L14.5 14"/></svg>`,
    profile: `<svg ${S}><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>`,
    daily: `<svg ${S}><path d="m12 2 8 4.5-8 4.5-8-4.5L12 2z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/></svg>`,
    info: `<svg ${S}><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.2v.1"/></svg>`,
    clock: `<svg ${S}><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.5"/></svg>`,
    gift: `<svg ${S}><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8v13"/><path d="M12 8s-1.5-5-4-5c-2 0-2.5 2-1 3.5S12 8 12 8z"/><path d="M12 8s1.5-5 4-5c2 0 2.5 2 1 3.5S12 8 12 8z"/></svg>`,
    share: `<svg ${S}><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="m8.3 10.8 6.9-4"/><path d="m8.3 13.2 6.9 4"/></svg>`,
    copy: `<svg ${S}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
    check: `<svg ${S}><path d="m4.5 12.5 5 5 10-11"/></svg>`,
    close: `<svg ${S}><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`,
    shop: `<svg ${S}><path d="M4 8h16l-1.2 12a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/></svg>`,
    settings: `<svg ${S}><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09c.27.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/></svg>`,
    history: `<svg ${S}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 3.5V6l2.5 0"/><path d="M12 7.5V12l3 2"/></svg>`,
    support: `<svg ${S}><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4" height="6" rx="2"/><rect x="17.5" y="13" width="4" height="6" rx="2"/><path d="M19 19a3 3 0 0 1-3 3h-3"/></svg>`,
    chat: `<svg ${S}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20.5l1.8-4.8A8.5 8.5 0 1 1 21 11.5z"/><path d="M8 9.5h8"/><path d="M8 13h5"/></svg>`,
    about: `<svg ${S}><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.2v.1"/></svg>`,
    shield: `<svg ${S}><path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 7.8 7.5 9.5 4.3-1.7 7.5-5 7.5-9.5v-6L12 2.5z"/><path d="m9 11.5 2.2 2.2L15.5 9"/></svg>`,
    verified: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 14.2 4.8l3.3-.4.9 3.2 2.9 1.7-1.1 3.2 1.1 3.2-2.9 1.7-.9 3.2-3.3-.4L12 21.5l-2.2-2.3-3.3.4-.9-3.2-2.9-1.7 1.1-3.2-1.1-3.2 2.9-1.7.9-3.2 3.3.4z" fill="currentColor" stroke="none"/><path d="m8.4 12.1 2.4 2.4 4.8-4.9" stroke="#0B1620" stroke-width="2.6"/></svg>`,
    globe: `<svg ${S}><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.8 2.7 4.2 6 4.2 9.5s-1.4 6.8-4.2 9.5c-2.8-2.7-4.2-6-4.2-9.5s1.4-6.8 4.2-9.5z"/></svg>`,
    robux: `<svg ${S}><path d="M12 2l7.5 4.5v9L12 20l-7.5-4.5v-9L12 2z"/><path d="M12 2v9l7.5 4.5"/><path d="M12 11 4.5 6.5"/></svg>`,
    coin: `<svg ${S}><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5v11"/><path d="M15 9c-.7-1-1.8-1.5-3-1.5-1.6 0-3 .9-3 2.4 0 3.1 6 1.4 6 4.5 0 1.5-1.4 2.4-3 2.4-1.2 0-2.3-.5-3-1.5"/></svg>`,
    flame: `<svg ${S}><path d="M12 22c4 0 6.5-2.5 6.5-6 0-3.5-2.5-5.5-4.5-8-.5 1.5-1.5 2.5-3 3C11 9 10.5 7.5 10.5 5.5 7.5 7.5 5.5 10 5.5 14c0 3.5 2.5 6 6.5 6z"/><path d="M12 22c-1.6 0-2.5-1-2.5-2.5C9.5 17.5 12 16.5 12 15c1.7 1.5 2.5 2.5 2.5 4.5 0 1.5-1 2.5-2.5 2.5z"/></svg>`,
    star: `<svg ${S}><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z"/></svg>`,
    lock: `<svg ${S}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`,
    plus: `<svg ${S}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    trash: `<svg ${S}><path d="M4 7h16"/><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/><path d="M6.5 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/></svg>`,
    arrow: `<svg ${S}><path d="M4 12h16"/><path d="m13 5 7 7-7 7"/></svg>`,
    sparkles: `<svg ${S}><path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/></svg>`,
    bolt: `<svg ${S}><path d="M13 2.5 4.5 13.5H11L10 21.5l8.5-11H13L13 2.5z"/></svg>`,
    medal: `<svg ${S}><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21.5l5-2.5 5 2.5-1.5-8"/></svg>`,
    refresh: `<svg ${S}><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v4.5h-4.5"/></svg>`,
    users: `<svg ${S}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8"/><path d="M18.5 15.4c1.5.9 2.6 2.4 3 4.6"/></svg>`,
    trophy: `<svg ${S}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 5H4.5a2 2 0 0 0 0 4H7"/><path d="M17 5h2.5a2 2 0 0 1 0 4H17"/><path d="M12 13v4"/><path d="M9 21h6"/><path d="M10 17h4l.8 4H9.2l.8-4z"/></svg>`,
    send: `<svg ${S}><path d="m3 11 18-8-8 18-2.5-7.5L3 11z"/><path d="M21 3 10.5 13.5"/></svg>`,
    wallet: `<svg ${S}><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 9.5h18"/><path d="M16.5 14.5h.01"/></svg>`,
    gamepad: `<svg ${S}><rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7 10.5v4"/><path d="M5 12.5h4"/><circle cx="16" cy="10.5" r="0.8"/><circle cx="18.5" cy="13.5" r="0.8"/></svg>`,
    grid: `<svg ${S}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
  };
  return {
    get(name) {
      return icons[name] || icons.info;
    },
    names: Object.keys(icons),
  };
})();