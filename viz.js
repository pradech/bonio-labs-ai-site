// ภาพเคลื่อนไหวใน section #viz: จุดแทนงาน 14 งานไหลเข้าแกน AI แล้วออกมาเป็นกราฟแท่งเรียงตามความคุ้มค่า
// วาดด้วย Canvas 2D ไม่ใช้ไลบรารี หยุดเองเมื่อเลื่อนพ้นจอ และแสดงภาพนิ่งถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว
(function () {
  "use strict";

  var canvas = document.getElementById("viz-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var N = 14;            // จำนวนงาน
  var TOP = 3;           // จำนวนงานอันดับแรกที่เน้น
  var LOOP = 11;         // ความยาวหนึ่งรอบ (วินาที)
  var IN = 1.3;          // เวลาที่จุดวิ่งเข้าแกน
  var GAP = 0.2;         // เวลาที่อยู่ในแกน
  var OUT = 1.0;         // เวลาที่จุดวิ่งออกไปที่แท่ง
  var GROW = 0.7;        // เวลาที่แท่งโตเต็ม
  var HIGHLIGHT_AT = 8.0;
  var FADE_AT = 10.2;
  var STATIC_T = 9.4;    // เฟรมที่ใช้เป็นภาพนิ่ง

  // ความสูงของแท่งเรียงจากมากไปน้อย และอันดับที่งานแต่ละจุดจะได้
  var VALUES = [1, 0.86, 0.74, 0.56, 0.5, 0.44, 0.39, 0.34, 0.29, 0.25, 0.21, 0.17, 0.13, 0.1];
  var RANK_OF_NODE = [5, 0, 9, 3, 12, 1, 7, 10, 2, 13, 6, 4, 11, 8];

  // ตัวสุ่มแบบกำหนด seed เพื่อให้ตำแหน่งจุดเหมือนเดิมทุกครั้ง
  var seed = 11;
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  var nodes = [];
  for (var i = 0; i < N; i++) {
    nodes.push({
      x: 0.07 + (i % 3) * 0.085 + (rand() - 0.5) * 0.03,
      y: 0.17 + Math.floor(i / 3) * 0.16 + (rand() - 0.5) * 0.05,
      phase: rand() * Math.PI * 2,
      appear: 0.15 + i * 0.05,
      launch: 1.0 + i * 0.26,
      rank: RANK_OF_NODE[i]
    });
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function bezier(a, c, b, p) {
    var q = 1 - p;
    return { x: q * q * a.x + 2 * q * p * c.x + p * p * b.x, y: q * q * a.y + 2 * q * p * c.y + p * p * b.y };
  }

  var width = 0, height = 0;

  // สีหลักอ่านจากตัวแปร --blue ของหน้าเว็บ แล้วผสมกับขาวเป็นเฉดอ่อนสำหรับแสงและเส้น
  var accent = { base: "14, 48, 226", mid: "70, 100, 240", soft: "130, 160, 255", light: "170, 190, 255", pale: "200, 212, 255" };
  var probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);

  function mix(rgb, amount) {
    return rgb.map(function (c) { return Math.round(c + (255 - c) * amount); }).join(", ");
  }

  function readAccent() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim();
    if (!raw) return;
    probe.style.color = "";
    probe.style.color = raw;
    var m = getComputedStyle(probe).color.match(/[\d.]+/g);
    if (!m || m.length < 3) return;
    var rgb = [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
    accent = { base: rgb.join(", "), mid: mix(rgb, 0.24), soft: mix(rgb, 0.48), light: mix(rgb, 0.65), pale: mix(rgb, 0.78) };
  }
  readAccent();
  window.addEventListener("bonio:design-change", function () {
    readAccent();
    if (reduceMotion) draw(STATIC_T, 0);
  });

  function trail(from, ctrl, to, progress, color, size, alpha) {
    for (var j = 0; j < 10; j++) {
      var p = progress - j * 0.025;
      if (p < 0) break;
      var pos = bezier(from, ctrl, to, p);
      ctx.globalAlpha = alpha * (1 - j / 10);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(0.6, size - j * size * 0.08), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(t, clock) {
    var W = width, H = height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    var master = clamp01(t / 0.6) * (1 - clamp01((t - FADE_AT) / (LOOP - FADE_AT)));
    var unit = Math.max(0.7, Math.min(1.25, W / 900));
    var core = { x: W * 0.5, y: H * 0.5 };
    var R = Math.min(W * 0.11, H * 0.2);
    var baseY = H * 0.82;
    var barLeft = W * 0.67, barRight = W * 0.95;
    var slot = (barRight - barLeft) / N;
    var barW = slot * 0.6;
    var maxBarH = H * 0.56;
    var highlight = easeInOut(clamp01((t - HIGHLIGHT_AT) / 0.7));
    var n, k;

    // เส้นจาง ๆ เชื่อมงานแต่ละจุดกับแกน
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(" + accent.soft + ", " + (0.08 * master) + ")";
    for (k = 0; k < N; k++) {
      n = nodes[k];
      ctx.beginPath();
      ctx.moveTo(n.x * W, n.y * H);
      ctx.lineTo(core.x, core.y);
      ctx.stroke();
    }

    // เส้นฐานของกราฟ
    ctx.strokeStyle = "rgba(255, 255, 255, " + (0.2 * master) + ")";
    ctx.beginPath();
    ctx.moveTo(barLeft - 6, baseY + 0.5);
    ctx.lineTo(barRight + 6, baseY + 0.5);
    ctx.stroke();

    // แท่งกราฟ: โตเมื่อจุดของงานนั้นมาถึง แล้วเน้นสามอันดับแรก
    for (k = 0; k < N; k++) {
      n = nodes[k];
      var grow = easeOut(clamp01((t - (n.launch + IN + GAP + OUT)) / GROW));
      if (grow <= 0) continue;
      var isTop = n.rank < TOP;
      var h = VALUES[n.rank] * maxBarH * grow;
      var bx = barLeft + n.rank * slot + (slot - barW) / 2;
      var alpha = (isTop ? 0.85 + 0.15 * highlight : 0.85 - 0.55 * highlight) * master;
      var grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      if (isTop) {
        grad.addColorStop(0, "rgba(" + accent.light + ", " + alpha + ")");
        grad.addColorStop(1, "rgba(" + accent.base + ", " + alpha + ")");
      } else {
        grad.addColorStop(0, "rgba(" + accent.mid + ", " + alpha + ")");
        grad.addColorStop(1, "rgba(" + accent.base + ", " + alpha * 0.8 + ")");
      }
      ctx.save();
      if (isTop && highlight > 0) {
        ctx.shadowColor = "rgba(" + accent.mid + ", " + (0.9 * highlight * master) + ")";
        ctx.shadowBlur = 20 * unit;
      }
      ctx.fillStyle = grad;
      ctx.fillRect(bx, baseY - h, barW, h);
      ctx.restore();

      if (isTop && highlight > 0) {
        ctx.globalAlpha = highlight * master;
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 " + Math.round(13 * unit) + "px Prompt, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(String(n.rank + 1), bx + barW / 2, baseY - h - 8 * unit);
        ctx.globalAlpha = 1;
      }
    }

    // แสงรอบแกน
    var glow = ctx.createRadialGradient(core.x, core.y, R * 0.2, core.x, core.y, R * 2.6);
    glow.addColorStop(0, "rgba(" + accent.base + ", " + (0.6 * master) + ")");
    glow.addColorStop(1, "rgba(" + accent.base + ", 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(core.x, core.y, R * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // จุดที่วิ่งเข้าแกน และจุดที่วิ่งออกไปยังแท่งของตัวเอง
    for (k = 0; k < N; k++) {
      n = nodes[k];
      var from = { x: n.x * W, y: n.y * H };
      var pin = (t - n.launch) / IN;
      if (pin > 0 && pin < 1) {
        trail(from, { x: from.x + (core.x - from.x) * 0.55, y: from.y }, core, easeInOut(pin), "rgb(" + accent.pale + ")", 3.2 * unit, master);
      }
      var pout = (t - (n.launch + IN + GAP)) / OUT;
      if (pout > 0 && pout < 1) {
        var target = {
          x: barLeft + n.rank * slot + slot / 2,
          y: baseY - VALUES[n.rank] * maxBarH
        };
        trail(core, { x: core.x + (target.x - core.x) * 0.45, y: target.y }, target, easeInOut(pout), "rgb(" + accent.soft + ")", 3 * unit, master);
      }
    }

    // วงแหวนหมุนของแกน AI
    var rings = [
      { r: R, speed: 0.9, len: 1.6, w: 3, a: 0.95 },
      { r: R * 0.8, speed: -1.3, len: 1.1, w: 2, a: 0.7 },
      { r: R * 1.2, speed: 0.5, len: 0.5, w: 1.5, a: 0.55 }
    ];
    ctx.lineCap = "round";
    for (k = 0; k < rings.length; k++) {
      var ring = rings[k];
      var start = clock * ring.speed + k * 2;
      ctx.strokeStyle = "rgba(" + accent.soft + ", " + (ring.a * master) + ")";
      ctx.lineWidth = ring.w * unit;
      ctx.beginPath();
      ctx.arc(core.x, core.y, ring.r, start, start + Math.PI * ring.len);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // คลื่นกระเพื่อมเมื่อมีงานมาถึงแกน
    for (k = 0; k < N; k++) {
      var since = t - (nodes[k].launch + IN);
      if (since >= 0 && since < 0.7) {
        var pr = since / 0.7;
        ctx.strokeStyle = "rgba(" + accent.light + ", " + ((1 - pr) * 0.7 * master) + ")";
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        ctx.arc(core.x, core.y, R * (1.05 + pr * 0.9), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ใจกลางแกนและคำว่า AI
    ctx.fillStyle = "rgba(6, 8, 20, " + (0.96 * master) + ")";
    ctx.beginPath();
    ctx.arc(core.x, core.y, R * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = master;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 " + Math.round(R * 0.6) + "px Prompt, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AI", core.x, core.y + R * 0.03);
    ctx.globalAlpha = 1;

    // จุดแทนงานทางซ้าย: สว่างก่อนถูกส่งเข้าแกน แล้วหรี่ลง
    for (k = 0; k < N; k++) {
      n = nodes[k];
      var shown = clamp01((t - n.appear) / 0.4);
      if (shown <= 0) continue;
      var launched = t > n.launch;
      var nx = n.x * W;
      var ny = n.y * H + Math.sin(clock * 0.9 + n.phase) * 3 * unit;
      ctx.save();
      ctx.globalAlpha = shown * (launched ? 0.4 : 1) * master;
      ctx.shadowColor = "rgba(" + accent.mid + ", 0.9)";
      ctx.shadowBlur = launched ? 0 : 12 * unit;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(nx, ny, 4 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // วงจรการเล่น: นับเวลาเฉพาะตอนที่มองเห็น
  var running = false;
  var visible = true;
  var elapsed = 0;
  var lastStamp = 0;
  var rafId = 0;

  function frame(stamp) {
    if (!running) return;
    if (lastStamp) elapsed += Math.min(0.1, (stamp - lastStamp) / 1000);
    lastStamp = stamp;
    draw(elapsed % LOOP, elapsed);
    rafId = window.requestAnimationFrame(frame);
  }

  function update() {
    var shouldRun = !reduceMotion && visible && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      lastStamp = 0;
      rafId = window.requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      window.cancelAnimationFrame(rafId);
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduceMotion) draw(STATIC_T, 0);
    else if (!running) draw(elapsed % LOOP, elapsed);
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", update);

  // วาดใหม่เมื่อฟอนต์ Prompt โหลดเสร็จ เพื่อให้คำว่า AI ใช้ฟอนต์ที่ถูกต้อง
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (reduceMotion) draw(STATIC_T, 0);
    });
  }

  resize();
  update();
})();
