// เอฟเฟกต์ตัวอักษรข้อมูลไหลลงบนพื้นหลังส่วนบนสุด (canvas.hero-rain)
// เขียนขึ้นเองด้วย Canvas 2D: ตัวเลขอารบิก เลขไทย และสัญลักษณ์ทางธุรกิจ ในโทนสีหลักของแบรนด์
// หยุดเองเมื่อเลื่อนพ้นจอ และแสดงเป็นภาพนิ่งถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว
(function () {
  "use strict";

  var canvas = document.querySelector("canvas.hero-rain");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var GLYPHS = "0123456789๐๑๒๓๔๕๖๗๘๙AI%฿+=<>/".split("");
  var CELL = 20;        // ระยะห่างของคอลัมน์และบรรทัด (px)
  var TRAIL = 16;       // จำนวนตัวอักษรในหางของแต่ละคอลัมน์
  var STEP_MS = 70;     // เวลาระหว่างการขยับหนึ่งบรรทัด

  // สีหางอ่านจากสีหลักของหน้า แล้วผสมกับขาวให้สว่างพออ่านบนพื้นมืด
  var trailColor = "150, 170, 255";
  (function readAccent() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim();
    if (!raw) return;
    var probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = raw;
    document.body.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/[\d.]+/g);
    probe.remove();
    if (!m || m.length < 3) return;
    trailColor = [m[0], m[1], m[2]].map(function (c) { return Math.round(+c + (255 - +c) * 0.55); }).join(", ");
  })();

  var width = 0, height = 0, rows = 0;
  var columns = [];

  function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  function makeColumn(index, scatter) {
    var glyphs = [];
    for (var i = 0; i < TRAIL; i++) glyphs.push(randomGlyph());
    return {
      x: index * CELL + CELL / 2,
      // scatter = true ตอนเริ่ม เพื่อให้หัวคอลัมน์กระจายทั่วความสูง ไม่เริ่มพร้อมกันจากขอบบน
      head: scatter ? Math.floor(Math.random() * (rows + TRAIL)) : -Math.floor(Math.random() * 12),
      every: 1 + Math.floor(Math.random() * 3),   // ขยับทุกกี่จังหวะ ทำให้แต่ละคอลัมน์เร็วไม่เท่ากัน
      tick: 0,
      glyphs: glyphs
    };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rows = Math.ceil(height / CELL);
    var count = Math.ceil(width / CELL);
    columns = [];
    for (var i = 0; i < count; i++) columns.push(makeColumn(i, true));
    draw();
  }

  function step() {
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      col.tick++;
      if (col.tick % col.every !== 0) continue;
      col.head++;
      col.glyphs.pop();
      col.glyphs.unshift(randomGlyph());
      if (col.head - TRAIL > rows) columns[i] = makeColumn(i, false);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.font = "700 " + (CELL - 5) + "px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      for (var j = 0; j < TRAIL; j++) {
        var row = col.head - j;
        if (row < 0 || row > rows) continue;
        var fade = 1 - j / TRAIL;
        ctx.fillStyle = j === 0
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(" + trailColor + ", " + (fade * 0.8).toFixed(3) + ")";
        ctx.fillText(col.glyphs[j], col.x, row * CELL + CELL / 2);
      }
    }
  }

  var running = false;
  var visible = true;
  var timer = 0;

  function loop() {
    if (!running) return;
    step();
    draw();
    timer = window.setTimeout(loop, STEP_MS);
  }

  function update() {
    var shown = canvas.offsetParent !== null;   // ซ่อนด้วย CSS บนจอแคบ
    var shouldRun = !reduceMotion && visible && shown && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      loop();
    } else if (!shouldRun && running) {
      running = false;
      window.clearTimeout(timer);
    }
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { resize(); update(); }).observe(canvas);
  } else {
    window.addEventListener("resize", function () { resize(); update(); });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", update);

  resize();
  update();
})();
