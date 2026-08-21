/**
 * Morph — локальный ванильный порт движка morphicons (MIT, guillermolg00/morphicons).
 * Универсальный морфинг stroke-иконок: parse → normalize → resample(N=48) →
 * correspondence → 2D Procrustes → polar interpolation → spring driver.
 * Без зависимостей, без сборки. Используется для анимированных иконок всего аппа.
 */
(function () {
  "use strict";
  var N = 48; // точек на подпуть при ресемплинге

  /* ============================== ПАРСЕР ============================== */
  // d-строка -> массив подпутей: { segs:[[x0,y0,c1x,c1y,c2x,c2y,x3,y3]...], closed:bool }
  function parsePath(d) {
    if (!d) return [];
    var subs = [];
    var cur = null;
    var cx = 0, cy = 0, sx = 0, sy = 0;
    var lcx = 0, lcy = 0, lx = 0, ly = 0; // последние точка и c2 (для S/T)
    var re = /([MmLlHhVvCcSsQqTtAaZz])((?:[^MmLlHhVvCcSsQqTtAaZz]+|$))/g;
    var m, mm;
    function nums(s) {
      var out = [], r = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
      while ((mm = r.exec(s))) out.push(parseFloat(mm[0]));
      return out;
    }
    function startSub(x, y) {
      if (cur && cur.segs.length) subs.push(cur);
      cur = { segs: [], closed: false };
      cx = x; cy = y; sx = x; sy = y; lx = x; ly = y;
      lcx = x; lcy = y;
    }
    while ((m = re.exec(d))) {
      var cmd = m[1], args = nums(m[2]);
      var rel = cmd === cmd.toLowerCase();
      var C = cmd.toUpperCase();
      var i = 0;
      if (C === "Z") { if (cur) cur.closed = true; cur = null; continue; }
      // повторяем, пока есть аргументы (неявное повторение команды)
      while (i < args.length) {
        var x, y;
        if (C === "M" || C === "L") {
          if (!cur) startSub(0, 0);
          x = args[i] + (rel ? cx : 0); y = args[i + 1] + (rel ? cy : 0);
          if (C === "M") { startSub(x, y); }
          else { cur.segs.push([cx, cy, (cx + x) / 2, (cy + y) / 2, (x + cx) / 2, (y + cy) / 2, x, y]); }
          cx = x; cy = y; lx = x; ly = y; lcx = x; lcy = y; i += 2;
        } else if (C === "H") {
          x = args[i] + (rel ? cx : 0);
          cur.segs.push([cx, cy, (cx + x) / 2, cy, (x + cx) / 2, cy, x, cy]);
          cx = x; lx = x; i += 1;
        } else if (C === "V") {
          y = args[i] + (rel ? cy : 0);
          cur.segs.push([cx, cy, cx, (cy + y) / 2, cx, (y + cy) / 2, cx, y]);
          cy = y; ly = y; i += 1;
        } else if (C === "C") {
          if (!cur) startSub(0, 0);
          var c1x = args[i] + (rel ? cx : 0), c1y = args[i + 1] + (rel ? cy : 0);
          var c2x = args[i + 2] + (rel ? cx : 0), c2y = args[i + 3] + (rel ? cy : 0);
          var px = args[i + 4] + (rel ? cx : 0), py = args[i + 5] + (rel ? cy : 0);
          cur.segs.push([cx, cy, c1x, c1y, c2x, c2y, px, py]);
          cx = px; cy = py; lcx = c2x; lcy = c2y; lx = px; ly = py; i += 6;
        } else if (C === "S") {
          if (!cur) startSub(0, 0);
          var rc1x = 2 * cx - lcx, rc1y = 2 * cy - lcy;
          var c2x2 = args[i] + (rel ? cx : 0), c2y2 = args[i + 1] + (rel ? cy : 0);
          var px2 = args[i + 2] + (rel ? cx : 0), py2 = args[i + 3] + (rel ? cy : 0);
          cur.segs.push([cx, cy, rc1x, rc1y, c2x2, c2y2, px2, py2]);
          cx = px2; cy = py2; lcx = c2x2; lcy = c2y2; lx = px2; ly = py2; i += 4;
        } else if (C === "Q") {
          var q1x = args[i] + (rel ? cx : 0), q1y = args[i + 1] + (rel ? cy : 0);
          var qx = args[i + 2] + (rel ? cx : 0), qy = args[i + 3] + (rel ? cy : 0);
          var c1qx = cx + (2 / 3) * (q1x - cx), c1qy = cy + (2 / 3) * (q1y - cy);
          var c2qx = qx + (2 / 3) * (q1x - qx), c2qy = qy + (2 / 3) * (q1y - qy);
          cur.segs.push([cx, cy, c1qx, c1qy, c2qx, c2qy, qx, qy]);
          cx = qx; cy = qy; lcx = q1x; lcy = q1y; lx = qx; ly = qy; i += 4;
        } else if (C === "T") {
          var rq1x = 2 * cx - lcx, rq1y = 2 * cy - lcy;
          var tx = args[i] + (rel ? cx : 0), ty = args[i + 1] + (rel ? cy : 0);
          var c1tx = cx + (2 / 3) * (rq1x - cx), c1ty = cy + (2 / 3) * (rq1y - cy);
          var c2tx = tx + (2 / 3) * (rq1x - tx), c2ty = ty + (2 / 3) * (rq1y - ty);
          cur.segs.push([cx, cy, c1tx, c1ty, c2tx, c2ty, tx, ty]);
          cx = tx; cy = ty; lcx = rq1x; lcy = rq1y; lx = tx; ly = ty; i += 2;
        } else if (C === "A") {
          if (!cur) startSub(0, 0);
          var rx = args[i], ry = args[i + 1];
          var fa = args[i + 3] ? 1 : 0, fs = args[i + 4] ? 1 : 0;
          var ex = args[i + 5] + (rel ? cx : 0), ey = args[i + 6] + (rel ? cy : 0);
          arcToCubics(cur, cx, cy, rx, ry, args[i + 2] * Math.PI / 180, fa, fs, ex, ey);
          cx = ex; cy = ey; lcx = ex; lcy = ey; lx = ex; ly = ey; i += 7;
        } else break;
      }
    }
    if (cur && cur.segs.length) subs.push(cur);
    return subs;
  }

  function arcToCubics(sub, x1, y1, rx, ry, phi, fa, fs, x2, y2) {
    if (rx === 0 || ry === 0) { sub.segs.push([x1, y1, (x1 + x2) / 2, (y1 + y2) / 2, (x2 + x1) / 2, (y2 + y1) / 2, x2, y2]); return; }
    var cp = Math.cos(phi), sp = Math.sin(phi);
    var dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    var x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    var lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    var sign = (fa === fs) ? -1 : 1;
    var num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    var den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    var co = sign * Math.sqrt(Math.max(0, num / den));
    var cxp = co * (rx * y1p) / ry, cyp = -co * (ry * x1p) / rx;
    var cx0 = cp * cxp - sp * cyp + (x1 + x2) / 2;
    var cy0 = sp * cxp + cp * cyp + (y1 + y2) / 2;
    function ang(ux, uy, vx, vy) {
      var d = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
      d = Math.max(-1, Math.min(1, d));
      var a = Math.acos(d);
      if (ux * vy - uy * vx < 0) a = -a;
      return a;
    }
    var th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    var dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dth > 0) dth -= 2 * Math.PI;
    if (fs && dth < 0) dth += 2 * Math.PI;
    var steps = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2)));
    for (var s = 0; s < steps; s++) {
      var a0 = th1 + (dth * s) / steps, a1 = th1 + (dth * (s + 1)) / steps;
      var k = (4 / 3) * Math.tan((a1 - a0) / 4);
      function pt(a) {
        return [rx * Math.cos(a), ry * Math.sin(a)];
      }
      var e0 = pt(a0), e1 = pt(a1);
      var t0 = [-(rx * Math.sin(a0)) * k / 3 * 3, (ry * Math.cos(a0)) * k / 3 * 3];
      var t1 = [-(rx * Math.sin(a1)) * k / 3 * 3, (ry * Math.cos(a1)) * k / 3 * 3];
      var p0x = cp * e0[0] - sp * e0[1] + cx0, p0y = sp * e0[0] + cp * e0[1] + cy0;
      var p1x = cp * e1[0] - sp * e1[1] + cx0, p1y = sp * e1[0] + cp * e1[1] + cy0;
      var c1x = p0x - (cp * t0[0] - sp * t0[1]), c1y = p0y - (sp * t0[0] + cp * t0[1]);
      var c2x = p1x + (cp * t1[0] - sp * t1[1]), c2y = p1y + (sp * t1[0] + cp * t1[1]);
      sub.segs.push([p0x, p0y, c1x, c1y, c2x, c2y, p1x, p1y]);
    }
  }

  /* ============================== РЕСЕМПЛИНГ ============================== */
  // подпуть -> Float64Array(2N) с угловой привязкой
  function resample(sub) {
    // полилиния: сэмплируем каждую кубическую на 18 точек
    var pts = [];
    var segs = sub.segs;
    for (var s = 0; s < segs.length; s++) {
      var g = segs[s];
      for (var t = 0; t <= 18; t++) {
        var u = t / 18;
        var mu = 1 - u;
        var x = mu * mu * mu * g[0] + 3 * mu * mu * u * g[2] + 3 * mu * u * u * g[4] + u * u * u * g[6];
        var y = mu * mu * mu * g[1] + 3 * mu * mu * u * g[3] + 3 * mu * u * u * g[5] + u * u * u * g[7];
        if (!(s === 0 && t === 0)) pts.push([x, y]);
      }
    }
    if (!pts.length) return new Float64Array(0);
    // длины
    var lens = [0], tot = 0;
    for (var k = 1; k < pts.length; k++) {
      tot += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      lens.push(tot);
    }
    if (tot < 1e-6) tot = 1e-6;
    // углы (разрыв касательной) -> привязка точек
    var corners = new Set();
    for (var c = 1; c < pts.length; c++) {
      var ax = pts[c][0] - pts[c - 1][0], ay = pts[c][1] - pts[c - 1][1];
      var bx = (pts[c + 1] ? pts[c + 1][0] - pts[c][0] : ax), by = (pts[c + 1] ? pts[c + 1][1] - pts[c][1] : ay);
      var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      if (la < 1e-4 || lb < 1e-4) continue;
      var dot = (ax * bx + ay * by) / (la * lb);
      var ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (ang > 0.55) corners.add(c);
    }
    // раскидываем N точек равномерно по длине, привязывая к углам
    var out = new Float64Array(2 * N);
    var ci = 0, cornerArr = Array.from(corners).sort(function (a, b) { return a - b; });
    for (var n = 0; n < N; n++) {
      var target = (n + 0.5) / N * tot;
      // найти ближайший угол и привязать
      var skip = false;
      while (ci < cornerArr.length && lens[cornerArr[ci]] < target) ci++;
      if (ci < cornerArr.length && Math.abs(lens[cornerArr[ci]] - target) < tot / N / 2) {
        var idxC = cornerArr[ci];
        out[2 * n] = pts[idxC][0]; out[2 * n + 1] = pts[idxC][1]; skip = true;
      }
      if (skip) continue;
      // иначе линейно по полилинии
      var lo = 0, hi = lens.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (lens[mid] < target) lo = mid + 1; else hi = mid; }
      var i2 = Math.max(1, lo);
      var segLen = lens[i2] - lens[i2 - 1] || 1e-6;
      var f = (target - lens[i2 - 1]) / segLen;
      out[2 * n] = pts[i2 - 1][0] + (pts[i2][0] - pts[i2 - 1][0]) * f;
      out[2 * n + 1] = pts[i2 - 1][1] + (pts[i2 - 1][1 + 0] ? 0 : 0);
      out[2 * n + 1] = pts[i2 - 1][1] + (pts[i2][1] - pts[i2 - 1][1]) * f;
    }
    return out;
  }

  /* ============================== СООТВЕТСТВИЕ ============================== */
  function centroid(arr) { var x = 0, y = 0; for (var i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; } var n = arr.length / 2; return [x / n, y / n]; }
  function subLen(arr) { var L = 0; for (var i = 0; i < arr.length - 2; i += 2) L += Math.hypot(arr[i + 2] - arr[i], arr[i + 3] - arr[i + 1]); return L; }
  function reverse(arr) { var r = new Float64Array(arr.length); for (var i = 0; i < arr.length; i += 2) { var j = arr.length - 2 - i; r[i] = arr[j]; r[i + 1] = arr[j + 1]; } return r; }

  function matchSubs(A, B) {
    // возвращает массив пар [iA, iB]
    var pairs = [];
    var usedB = {};
    if (A.length === B.length) {
      // минимальная перестановка (жадно по расстоянию центроидов)
      var idx = B.map(function (_, k) { return k; });
      for (var pass = 0; pass < B.length; pass++) {
        var best = -1, bestJ = -1, bd = 1e18;
        for (var a = 0; a < A.length; a++) {
          var ca = centroid(A[a]);
          for (var b = 0; b < idx.length; b++) {
            var cb = centroid(B[idx[b]]);
            var d = Math.hypot(ca[0] - cb[0], ca[1] - cb[1]) + Math.abs(subLen(A[a]) - subLen(B[idx[b]])) * 0.2;
            if (d < bd) { bd = d; best = a; bestJ = b; }
          }
        }
        if (bestJ >= 0) { pairs.push([best, idx[bestJ]]); idx.splice(bestJ, 1); }
      }
      return pairs;
    }
    // неравное число: каждый подпуть B -> ближайший A (сюръекция)
    for (var j2 = 0; j2 < B.length; j2++) {
      var bestI = -1, bd2 = 1e18;
      for (var i2 = 0; i2 < A.length; i2++) {
        var d2 = Math.hypot(centroid(A[i2])[0] - centroid(B[j2])[0], centroid(A[i2])[1] - centroid(B[j2])[1]) + Math.abs(subLen(A[i2]) - subLen(B[j2])) * 0.2;
        if (d2 < bd2) { bd2 = d2; bestI = i2; }
      }
      pairs.push([bestI, j2]);
      usedB[j2] = true;
    }
    // лишние подпути A -> дублируем на ближайший B
    for (var i3 = 0; i3 < A.length; i3++) {
      if (!pairs.some(function (p) { return p[0] === i3; })) {
        var bd3 = 1e18, bj = 0;
        for (var j3 = 0; j3 < B.length; j3++) {
          var d3 = Math.hypot(centroid(A[i3])[0] - centroid(B[j3])[0], centroid(A[i3])[1] - centroid(B[j3])[1]);
          if (d3 < bd3) { bd3 = d3; bj = j3; }
        }
        pairs.push([i3, bj]);
      }
    }
    return pairs;
  }

  /* ============================== ПРОКРУСТ + ИНТЕРПОЛЯЦИЯ ============================== */
  function planPair(a, b) {
    // обе ориентации b
    var best = null;
    [b, reverse(b)].forEach(function (bb) {
      var ca = centroid(a), cb = centroid(bb);
      var Sxx = 0, Sxy = 0, Syx = 0, Syy = 0, na = 0;
      for (var i = 0; i < a.length; i += 2) {
        var ax = a[i] - ca[0], ay = a[i + 1] - ca[1];
        var bx = bb[i] - cb[0], by = bb[i + 1] - cb[1];
        Sxx += ax * bx; Sxy += ax * by; Syx += ay * bx; Syy += ay * by;
      }
      var theta = Math.atan2(Sxy - Syx, Sxx + Syy);
      var norm = 0; for (var k = 0; k < a.length; k += 2) norm += a[k] * a[k] + a[k + 1] * a[k + 1];
      var sigma = (Math.cos(theta) * (Sxx + Syy) + Math.sin(theta) * (Sxy - Syx)) / (norm || 1);
      // невязка
      var res = 0;
      for (var m2 = 0; m2 < a.length; m2 += 2) {
        var rx = sigma * (Math.cos(theta) * (a[m2] - ca[0]) - Math.sin(theta) * (a[m2 + 1] - ca[1])) + cb[0] - bb[m2];
        var ry = sigma * (Math.sin(theta) * (a[m2] - ca[0]) + Math.cos(theta) * (a[m2 + 1] - ca[1])) + cb[1] - bb[m2 + 1];
        res += rx * rx + ry * ry;
      }
      var score = Math.sqrt(res / (a.length / 2));
      var flip = (bb !== b);
      if (!best || score + 0.0001 * Math.abs(theta) / Math.PI < best.score + 0.0001 * Math.abs(best.theta) / Math.PI) {
        best = { a: a, b: bb, ca: ca, cb: cb, theta: theta, sigma: sigma, score: score, flip: flip };
      }
    });
    return best;
  }

  function interp(p, t, out) {
    var ct = Math.cos(p.theta * t), st = Math.sin(p.theta * t);
    var sig = Math.pow(p.sigma, t);
    for (var i = 0; i < p.a.length; i += 2) {
      var ax = p.a[i] - p.ca[0], ay = p.a[i + 1] - p.ca[1];
      var bx = p.b[i] - p.cb[0], by = p.b[i + 1] - p.cb[1];
      var ix = (1 - t) * ax + t * bx;
      var iy = (1 - t) * ay + t * by;
      var rx = sig * (ct * ix - st * iy) + p.ca[0] + t * (p.cb[0] - p.ca[0]);
      var ry = sig * (st * ix + ct * iy) + p.ca[1] + t * (p.cb[1] - p.ca[1]);
      out[i] = rx; out[i + 1] = ry;
    }
  }

  function serialize(arr, closed) {
    var s = "M" + arr[0].toFixed(2) + " " + arr[1].toFixed(2);
    for (var i = 2; i < arr.length; i += 2) s += "L" + arr[i].toFixed(2) + " " + arr[i + 1].toFixed(2);
    if (closed) s += "Z";
    return s;
  }

  /* ============================== ДРАЙВЕР (пружина) ============================== */
  var instances = [];
  var rafId = null;
  function loop() {
    var active = false;
    for (var i = 0; i < instances.length; i++) {
      var o = instances[i];
      if (!o.running) continue;
      active = true;
      var h = 1 / 240, steps = Math.max(1, Math.round((o.lastT ? 0 : 1) * 0));
      // интегрируем до текущего времени (полшага)
      var now = (Date.now() - o.t0) / 1000;
      while (o.t < now && o.t < 1.2) {
        var a = o.k * (1 - o.x) - o.c * o.v;
        o.v += a * h; o.x += o.v * h; o.t += h;
      }
      var tt = Math.min(1.2, Math.max(0, o.x));
      for (var p = 0; p < o.plans.length; p++) {
        interp(o.plans[p], tt, o.out[p]);
        o.el.setAttribute("d", serialize(o.out[p], o.closed[p]));
      }
      if (o.x >= 1 - 0.001 && Math.abs(o.v) < 0.02) {
        o.running = false;
        for (var p2 = 0; p2 < o.plans.length; p2++) o.el.setAttribute("d", serialize(o.bSampled[p2], o.closed[p2]));
      }
    }
    if (active) rafId = (window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); })(loop);
    else { rafId = null; }
  }
  function ensureLoop() { if (rafId == null) rafId = (window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); })(loop); }

  /* ============================== API ============================== */
  function create(pathEl, d, opts) {
    opts = opts || {};
    var stiffness = opts.stiffness || 420, damping = opts.damping || 30;
    var o = {
      el: pathEl, d: d, running: false, x: 0, v: 0, t: 0, t0: 0,
      k: stiffness, c: damping, plans: [], out: [], bSampled: [], closed: [], lastT: 0
    };
    pathEl.setAttribute("d", d || "");
    // предрассчитываем подпути целевой иконки
    var subsB = parsePath(d);
    o.bSubs = subsB;
    o.bSampled = subsB.map(resample);
    o.closed = subsB.map(function (s) { return s.closed; });
    o.out = o.bSampled.map(function (a) { return new Float64Array(a.length); });

    function morphTo(d2) {
      var subsA = parsePath(o.el.getAttribute("d") || o.d);
      // если текущий путь пустой/невалиден — просто устанавливаем
      if (!subsA.length) { set(d2); return; }
      var aS = subsA.map(resample);
      var bS = parsePath(d2).map(resample);
      var pairs = matchSubs(aS, bS);
      o.plans = pairs.map(function (pr) { return planPair(aS[pr[0]], bS[pr[1]]); });
      o.bSampled = bS; o.closed = bS.map(function (s) { return s.closed; });
      o.out = bS.map(function (a) { return new Float64Array(a.length); });
      o.x = 0; o.v = o.v * 0.3; o.t = 0; o.t0 = Date.now(); o.running = true;
      o.d = d2; o.el.setAttribute("d", o.el.getAttribute("d") || d2);
      ensureLoop();
    }
    function set(d2) {
      o.d = d2;
      var subs = parsePath(d2);
      o.bSampled = subs.map(resample);
      o.closed = subs.map(function (s) { return s.closed; });
      o.out = o.bSampled.map(function (a) { return new Float64Array(a.length); });
      o.el.setAttribute("d", d2);
      o.running = false;
    }
    o.morphTo = morphTo; o.set = set;
    return o;
  }

  // глобальный cleanup draw-in анимации
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("animationend", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("mi-path")) {
        e.target.classList.add("mi-done");
      }
    });
  }

  window.Morph = { create: create, parsePath: parsePath };
})();
