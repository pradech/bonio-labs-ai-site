// สไลด์ใน hero: สลับระหว่างภาพรวมบริการ (สไลด์ 1) กับเครื่องมือสร้างคำสั่ง AI (สไลด์ 2)
// ไม่เลื่อนเองอัตโนมัติ เพราะสไลด์ 1 มีช่องกรอกอีเมล ผู้ใช้เป็นคนกดเปลี่ยนเอง
(function () {
  "use strict";

  var hero = document.querySelector(".hero[data-slides]");
  if (!hero) return;
  var slides = Array.prototype.slice.call(hero.querySelectorAll(".hero-slide"));
  var nav = hero.querySelector(".hero-nav");
  if (slides.length < 2 || !nav) return;
  var tabs = Array.prototype.slice.call(nav.querySelectorAll("[data-slide-to]"));
  var current = 0;

  function show(index, fromUser) {
    index = (index + slides.length) % slides.length;
    if (index === current) return;
    // ทิศของการเลื่อนเข้า: ไปข้างหน้าเข้าจากขวา ย้อนกลับเข้าจากซ้าย
    hero.style.setProperty("--slide-from", index > current ? "28px" : "-28px");
    current = index;
    slides.forEach(function (slide, i) { slide.hidden = i !== index; });
    tabs.forEach(function (tab, i) { tab.setAttribute("aria-pressed", i === index ? "true" : "false"); });
    if (fromUser) {
      hero.classList.add("is-sliding");
      // ถ้าเลื่อนลงมาเลยขอบบนของ hero แล้ว พากลับไปเริ่มอ่านสไลด์ใหม่จากด้านบน
      if (hero.getBoundingClientRect().top < 0) hero.scrollIntoView();
    }
  }

  nav.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    if (btn.hasAttribute("data-slide-to")) show(parseInt(btn.getAttribute("data-slide-to"), 10), true);
    else if (btn.hasAttribute("data-slide-prev")) show(current - 1, true);
    else if (btn.hasAttribute("data-slide-next")) show(current + 1, true);
  });

  nav.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") show(current + 1, true);
    else if (e.key === "ArrowLeft") show(current - 1, true);
  });

  // ปัดซ้ายขวาบนจอสัมผัส ยกเว้นเริ่มปัดในช่องกรอกหรือกล่องข้อความที่เลื่อนได้
  var startX = null, startY = null;
  var track = hero.querySelector(".hero-slides");
  track.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1 || e.target.closest("input, textarea, pre, table")) { startX = null; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  track.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    show(dx < 0 ? current + 1 : current - 1, true);
  }, { passive: true });

  // ลิงก์ที่ชี้ไปยังเนื้อหาในสไลด์ที่ซ่อนอยู่ (เช่น #tool) ให้เปิดสไลด์นั้นก่อน
  function fromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(id)); } catch (err) { return; }
    if (!target) return;
    slides.forEach(function (slide, i) {
      if (i !== current && slide.contains(target)) { show(i, false); target.scrollIntoView(); }
    });
  }
  window.addEventListener("hashchange", fromHash);

  nav.hidden = false;
  fromHash();
})();
