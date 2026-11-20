(function () {
  "use strict";

  var canvas = document.getElementById("water-canvas");
  var ctx = canvas.getContext("2d");
  var toggle = document.getElementById("motion-toggle");
  var root = document.documentElement;
  var MAX_RIPPLES = 24;
  var ripples = [];
  var dpr = 1, w = 0, h = 0, raf = null, lastMove = 0;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // --- Motion preference ---------------------------------------------------
  function loadPref() {
    try { return localStorage.getItem("water-motion"); } catch (e) { return null; }
  }
  function savePref(v) {
    try { localStorage.setItem("water-motion", v); } catch (e) { /* ignore */ }
  }

  function isCalm() { return root.classList.contains("calm"); }

  function setCalm(calm) {
    root.classList.toggle("calm", calm);
    toggle.textContent = calm ? "Moving water" : "Still water";
    toggle.setAttribute("aria-pressed", String(calm));
    if (calm) { stop(); ripples.length = 0; clear(); } else { start(); }
  }

  var saved = loadPref();
  var startCalm = saved ? saved === "calm" : reduceQuery.matches;
  toggle.addEventListener("click", function () {
    var next = !isCalm();
    savePref(next ? "calm" : "motion");
    setCalm(next);
  });

  // --- Canvas --------------------------------------------------------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clear() { ctx.clearRect(0, 0, w, h); }

  function addRipple(x, y, strong) {
    if (isCalm()) return;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x: x, y: y, t0: performance.now(), life: strong ? 2600 : 1800, max: strong ? 260 : 120, a: strong ? 0.35 : 0.16 });
    start();
  }

  function frame(now) {
    raf = null;
    clear();
    ripples = ripples.filter(function (r) { return now - r.t0 < r.life; });
    ripples.forEach(function (r) {
      var p = (now - r.t0) / r.life;
      var ease = 1 - Math.pow(1 - p, 3);
      var radius = r.max * ease;
      var alpha = r.a * (1 - p);
      for (var i = 0; i < 3; i++) {
        var rr = radius - i * 14;
        if (rr <= 0) continue;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(143, 211, 232, " + (alpha * (1 - i * 0.3)).toFixed(3) + ")";
        ctx.lineWidth = 1.5 - i * 0.4;
        ctx.stroke();
      }
    });
    if (ripples.length && !document.hidden && !isCalm()) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf === null && ripples.length && !document.hidden && !isCalm()) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }

  // --- Nearby tiles sway on a click ---------------------------------------
  function nudgeTiles(x, y) {
    if (isCalm()) return;
    document.querySelectorAll(".tile").forEach(function (tile) {
      var b = tile.getBoundingClientRect();
      var dx = Math.max(b.left - x, 0, x - b.right);
      var dy = Math.max(b.top - y, 0, y - b.bottom);
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 300) return;
      tile.style.setProperty("--bd", (dist / 600).toFixed(2) + "s");
      tile.classList.remove("bump");
      void tile.offsetWidth; // restart animation
      tile.classList.add("bump");
    });
  }
  document.addEventListener("animationend", function (e) {
    if (e.animationName === "bump") e.target.classList.remove("bump");
  });

  // --- Input: listeners on the document, canvas never blocks clicks -------
  document.addEventListener("click", function (e) {
    addRipple(e.clientX, e.clientY, true);
    nudgeTiles(e.clientX, e.clientY);
  });

  document.addEventListener("pointermove", function (e) {
    var now = performance.now();
    if (now - lastMove < 260) return;
    // Only react on empty background, not over tiles, links or buttons.
    if (e.target.closest && e.target.closest(".tile, a, button")) return;
    lastMove = now;
    addRipple(e.clientX, e.clientY, false);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener("resize", resize);
  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", function (e) { if (!loadPref()) setCalm(e.matches); });
  }

  window.addEventListener("beforeprint", function () { stop(); clear(); });

  resize();
  setCalm(startCalm);
})();
