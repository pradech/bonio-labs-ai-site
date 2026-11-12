// แผงปรับดีไซน์ของเว็บ Bonio Labs
// เปิดด้วยการเติม ?design=1 ต่อท้าย URL (ปิดด้วย ?design=0) ผู้เข้าชมทั่วไปจะไม่เห็นแผงนี้
// แผงนี้ปรับตัวแปร CSS ของหน้าเว็บสด ๆ ค่าที่ปรับเก็บในเบราว์เซอร์ของคุณเท่านั้น
// ถ้าต้องการใช้ถาวร ให้กด "ดาวน์โหลด theme.css" แล้วนำไฟล์ไปแทน theme.css ของเว็บ
(function () {
  "use strict";

  var STORE_KEY = "bonio_design_overrides";
  var ACTIVE_KEY = "bonio_design_panel";
  var PANEL_WIDTH = 320;

  var requested = null;
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.has("design")) requested = params.get("design") !== "0";
  } catch (e) { requested = null; }

  var active = requested === true;
  try {
    if (requested === true) window.sessionStorage.setItem(ACTIVE_KEY, "1");
    if (requested === false) window.sessionStorage.removeItem(ACTIVE_KEY);
    if (requested === null) active = window.sessionStorage.getItem(ACTIVE_KEY) === "1";
  } catch (e) { /* ไม่มี storage ก็ยังเปิดจาก URL ได้ */ }
  if (!active) return;

  var root = document.documentElement;
  var FONT_FALLBACK = ', "Sarabun", "Noto Sans Thai", system-ui, -apple-system, "Segoe UI", sans-serif';
  var FONTS = {
    "Prompt": "Prompt:wght@400;700;900",
    "IBM Plex Sans Thai": "IBM+Plex+Sans+Thai:wght@400;700",
    "Noto Sans Thai": "Noto+Sans+Thai:wght@400;700;900",
    "Sarabun": "Sarabun:wght@400;700;800",
    "Kanit": "Kanit:wght@400;700;900",
    "Anuphan": "Anuphan:wght@400;700",
    "Bai Jamjuree": "Bai+Jamjuree:wght@400;700",
    "Noto Serif Thai": "Noto+Serif+Thai:wght@400;700;900"
  };

  // รายการตัวควบคุม: แต่ละตัวผูกกับตัวแปร CSS หนึ่งตัว
  var CONTROLS = [
    { group: "สี", name: "--blue", label: "สีหลัก", type: "color" },
    { group: "สี", name: "--black", label: "พื้นเข้ม", type: "color" },
    { group: "สี", name: "--gray", label: "พื้นอ่อน", type: "color" },
    { group: "สี", name: "--ink", label: "สีตัวอักษร", type: "color" },
    { group: "สี", name: "--yellow", label: "สีป้ายเน้น", type: "color" },

    { group: "ตัวอักษร", name: "--font", label: "ฟอนต์", type: "font" },
    { group: "ตัวอักษร", name: "--font-base", label: "ขนาดตัวอักษร", type: "range", min: 14, max: 20, step: 0.5, unit: "px" },
    { group: "ตัวอักษร", name: "--line-height", label: "ระยะบรรทัด", type: "range", min: 1.3, max: 2, step: 0.05, unit: "" },
    { group: "ตัวอักษร", name: "--heading-scale", label: "ขนาดหัวข้อ", type: "range", min: 0.7, max: 1.3, step: 0.05, unit: "" },
    { group: "ตัวอักษร", name: "--heading-weight", label: "น้ำหนักหัวข้อ", type: "select", options: [["400", "ปกติ"], ["700", "หนา"], ["900", "หนาพิเศษ"]] },
    { group: "ตัวอักษร", name: "--display-weight", label: "น้ำหนักตัวเลขเด่น", type: "select", options: [["400", "ปกติ"], ["700", "หนา"], ["900", "หนาพิเศษ"]] },
    { group: "ตัวอักษร", name: "--title-case", label: "หัวข้อการ์ดเป็นตัวพิมพ์ใหญ่", type: "toggle", on: "uppercase", off: "none" },

    { group: "รูปทรง", name: "--radius-card", label: "มุมโค้งการ์ด", type: "range", min: 0, max: 32, step: 1, unit: "px" },
    { group: "รูปทรง", name: "--radius-btn", label: "มุมโค้งปุ่ม", type: "range", min: 0, max: 32, step: 1, unit: "px" },
    { group: "รูปทรง", name: "--radius-input", label: "มุมโค้งช่องกรอก", type: "range", min: 0, max: 20, step: 1, unit: "px" },

    { group: "ระยะห่าง", name: "--section-pad", label: "ระยะระหว่างส่วน", type: "range", min: 40, max: 140, step: 4, unit: "px" },
    { group: "ระยะห่าง", name: "--wrap", label: "ความกว้างเนื้อหา", type: "range", min: 960, max: 1360, step: 20, unit: "px" },

    { group: "ส่วนบนสุด", name: "--hero-cut-top", label: "จุดตัดเฉียงด้านบน", type: "range", min: 40, max: 100, step: 1, unit: "%" },
    { group: "ส่วนบนสุด", name: "--hero-cut-bottom", label: "จุดตัดเฉียงด้านล่าง", type: "range", min: 30, max: 100, step: 1, unit: "%" },
    { group: "ส่วนบนสุด", name: "--grid-alpha", label: "ความเข้มเส้นตาราง", type: "range", min: 0, max: 0.14, step: 0.01, unit: "" },

    { group: "แสดงหรือซ่อน", name: "--hero-visual-display", label: "ตัวอย่างรายงานในส่วนบนสุด", type: "toggle", on: "block", off: "none" },
    { group: "แสดงหรือซ่อน", name: "--outcomes-display", label: "แถบสิ่งที่ได้ 5 ข้อ", type: "toggle", on: "block", off: "none" },
    { group: "แสดงหรือซ่อน", name: "--viz-display", label: "ภาพเคลื่อนไหวแกน AI", type: "toggle", on: "block", off: "none" },
    { group: "แสดงหรือซ่อน", name: "--svc-art-display", label: "แผนภาพบนการ์ดบริการ", type: "toggle", on: "block", off: "none" }
  ];

  // ---- อ่านค่าเริ่มต้นจากสไตล์ของเว็บ (styles.css + theme.css) ก่อนใส่ค่าที่ปรับไว้ ----
  var probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);

  function toHex(cssColor) {
    probe.style.color = "";
    probe.style.color = cssColor;
    var m = getComputedStyle(probe).color.match(/[\d.]+/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + [m[0], m[1], m[2]].map(function (v) {
      var h = Math.round(+v).toString(16);
      return h.length === 1 ? "0" + h : h;
    }).join("");
  }

  function firstFamily(value) {
    var m = String(value).split(",")[0].trim().replace(/^["']|["']$/g, "");
    return m || "Prompt";
  }

  var computed = getComputedStyle(root);
  var defaults = {};
  CONTROLS.forEach(function (c) {
    var raw = computed.getPropertyValue(c.name).trim();
    if (c.type === "color") defaults[c.name] = toHex(raw);
    else if (c.type === "font") defaults[c.name] = firstFamily(raw);
    else if (c.type === "range") defaults[c.name] = String(parseFloat(raw));
    else defaults[c.name] = raw;
  });

  var overrides = {};
  try { overrides = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { overrides = {}; }

  function cssValue(c, v) {
    if (c.type === "font") return '"' + v + '"' + FONT_FALLBACK;
    if (c.type === "range") return v + c.unit;
    return v;
  }

  function loadFont(family) {
    if (!FONTS[family] || document.getElementById("bonio-font-" + family.replace(/\s+/g, "-"))) return;
    var link = document.createElement("link");
    link.id = "bonio-font-" + family.replace(/\s+/g, "-");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + FONTS[family] + "&display=swap";
    document.head.appendChild(link);
  }

  function notify() {
    window.dispatchEvent(new Event("bonio:design-change"));
  }

  function applyOne(c) {
    if (Object.prototype.hasOwnProperty.call(overrides, c.name)) {
      if (c.type === "font") loadFont(overrides[c.name]);
      root.style.setProperty(c.name, cssValue(c, overrides[c.name]));
    } else {
      root.style.removeProperty(c.name);
    }
  }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(overrides)); } catch (e) { /* ปรับต่อได้แม้บันทึกไม่ได้ */ }
  }

  function setValue(c, v) {
    if (String(v) === String(defaults[c.name])) delete overrides[c.name];
    else overrides[c.name] = String(v);
    applyOne(c);
    save();
    refreshExport();
    notify();
  }

  CONTROLS.forEach(applyOne);

  // ---- สร้าง CSS สำหรับนำไปใช้ถาวร ----
  function buildCss() {
    var names = CONTROLS.filter(function (c) { return Object.prototype.hasOwnProperty.call(overrides, c.name); });
    var lines = ["/* theme.css: ค่าดีไซน์ที่ปรับจากแผงปรับดีไซน์ของเว็บ Bonio Labs */"];
    var font = overrides["--font"];
    if (font && FONTS[font] && font !== "Prompt") {
      lines.push('@import url("https://fonts.googleapis.com/css2?family=' + FONTS[font] + '&display=swap");');
    }
    if (!names.length) {
      lines.push("/* ยังไม่มีค่าที่ปรับ เว็บใช้ค่าเริ่มต้นจาก styles.css */");
      return lines.join("\n") + "\n";
    }
    lines.push(":root {");
    names.forEach(function (c) {
      lines.push("  " + c.name + ": " + cssValue(c, overrides[c.name]) + ";");
    });
    lines.push("}");
    return lines.join("\n") + "\n";
  }

  // ---- ส่วนติดต่อผู้ใช้ของแผง (อยู่ใน Shadow DOM เพื่อไม่ให้สไตล์ของเว็บมากระทบ) ----
  var host = document.createElement("div");
  host.id = "bonio-design-panel";
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host { all: initial; }",
    "* { box-sizing: border-box; }",
    ".panel { position: fixed; top: 0; right: 0; z-index: 2147483000; width: " + PANEL_WIDTH + "px; height: 100vh; display: flex; flex-direction: column;",
    "  background: #ffffff; color: #1c1c1c; border-left: 1px solid #cfcfcf; box-shadow: -12px 0 32px -18px rgba(0,0,0,.45);",
    "  font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', 'Thonburi', sans-serif; }",
    ".panel.is-closed { transform: translateX(100%); }",
    ".head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #e2e2e2; }",
    ".head strong { font-size: 14px; }",
    ".body { flex: 1; overflow-y: auto; padding: 4px 14px 16px; }",
    "h3 { margin: 16px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #666; }",
    ".row { padding: 7px 0; border-top: 1px solid #efefef; }",
    ".row:first-of-type { border-top: 0; }",
    ".row label { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-weight: 600; }",
    ".row output { font-weight: 400; color: #555; font-variant-numeric: tabular-nums; }",
    ".row.changed label::before { content: ''; width: 6px; height: 6px; margin-right: -4px; border-radius: 50%; background: #0e30e2; flex: none; order: -1; }",
    "input[type=range] { width: 100%; height: 28px; margin: 2px 0 0; accent-color: #0e30e2; cursor: pointer; }",
    "input[type=color] { width: 44px; height: 28px; padding: 0; border: 1px solid #bbb; border-radius: 6px; background: none; cursor: pointer; }",
    "select { font: inherit; padding: 5px 8px; border: 1px solid #bbb; border-radius: 6px; background: #fff; max-width: 170px; }",
    "input[type=checkbox] { width: 18px; height: 18px; accent-color: #0e30e2; cursor: pointer; }",
    ".foot { padding: 12px 14px; border-top: 1px solid #e2e2e2; display: grid; gap: 8px; background: #fafafa; }",
    ".btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }",
    "button { font: inherit; font-weight: 600; padding: 8px 10px; border-radius: 8px; border: 1px solid #1c1c1c; background: #fff; color: #1c1c1c; cursor: pointer; }",
    "button.primary { background: #1c1c1c; color: #fff; }",
    "button.quiet { border-color: #bbb; }",
    "button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #0e30e2; outline-offset: 2px; }",
    "textarea { width: 100%; height: 92px; font: 11px/1.4 ui-monospace, Menlo, monospace; padding: 8px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; }",
    ".note { color: #666; font-size: 12px; }",
    ".status { min-height: 16px; color: #1b6e3c; font-size: 12px; }",
    ".tab { position: fixed; right: 0; top: 96px; z-index: 2147483000; padding: 10px 8px; writing-mode: vertical-rl; border-radius: 8px 0 0 8px; border: 1px solid #1c1c1c; border-right: 0; background: #1c1c1c; color: #fff; }",
    ".tab[hidden] { display: none; }"
  ].join("\n");
  shadow.appendChild(style);

  var panel = document.createElement("aside");
  panel.className = "panel";
  panel.setAttribute("aria-label", "แผงปรับดีไซน์");
  shadow.appendChild(panel);

  var head = document.createElement("div");
  head.className = "head";
  head.innerHTML = "<strong>ปรับดีไซน์</strong>";
  var hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.className = "quiet";
  hideBtn.textContent = "ซ่อนแผง";
  head.appendChild(hideBtn);
  panel.appendChild(head);

  var body = document.createElement("div");
  body.className = "body";
  panel.appendChild(body);

  var rows = {};

  function formatValue(c, v) {
    if (c.type === "range") return v + c.unit;
    return v;
  }

  function currentValue(c) {
    return Object.prototype.hasOwnProperty.call(overrides, c.name) ? overrides[c.name] : defaults[c.name];
  }

  function buildRow(c) {
    var row = document.createElement("div");
    row.className = "row";
    var label = document.createElement("label");
    var text = document.createElement("span");
    text.textContent = c.label;
    label.appendChild(text);
    var input;
    var output = null;

    if (c.type === "range") {
      output = document.createElement("output");
      label.appendChild(output);
      row.appendChild(label);
      input = document.createElement("input");
      input.type = "range";
      input.min = c.min; input.max = c.max; input.step = c.step;
      input.setAttribute("aria-label", c.label);
      row.appendChild(input);
      input.addEventListener("input", function () { setValue(c, input.value); sync(); });
    } else if (c.type === "color") {
      input = document.createElement("input");
      input.type = "color";
      label.appendChild(input);
      row.appendChild(label);
      input.addEventListener("input", function () { setValue(c, input.value); sync(); });
    } else if (c.type === "toggle") {
      input = document.createElement("input");
      input.type = "checkbox";
      label.appendChild(input);
      row.appendChild(label);
      input.addEventListener("change", function () { setValue(c, input.checked ? c.on : c.off); sync(); });
    } else {
      input = document.createElement("select");
      var options = c.type === "font" ? Object.keys(FONTS).map(function (f) { return [f, f]; }) : c.options;
      options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o[0]; opt.textContent = o[1];
        input.appendChild(opt);
      });
      label.appendChild(input);
      row.appendChild(label);
      input.addEventListener("change", function () { setValue(c, input.value); sync(); });
    }

    function sync() {
      var v = currentValue(c);
      if (c.type === "toggle") input.checked = v === c.on;
      else input.value = v;
      if (output) output.textContent = formatValue(c, v);
      row.classList.toggle("changed", Object.prototype.hasOwnProperty.call(overrides, c.name));
    }
    rows[c.name] = sync;
    sync();
    return row;
  }

  var lastGroup = "";
  CONTROLS.forEach(function (c) {
    if (c.group !== lastGroup) {
      var h = document.createElement("h3");
      h.textContent = c.group;
      body.appendChild(h);
      lastGroup = c.group;
    }
    body.appendChild(buildRow(c));
  });

  var foot = document.createElement("div");
  foot.className = "foot";
  panel.appendChild(foot);

  var exportBox = document.createElement("textarea");
  exportBox.readOnly = true;
  exportBox.setAttribute("aria-label", "CSS ของค่าที่ปรับ");
  foot.appendChild(exportBox);

  var btns = document.createElement("div");
  btns.className = "btns";
  foot.appendChild(btns);

  function button(text, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    if (cls) b.className = cls;
    return b;
  }
  var copyBtn = button("คัดลอก CSS", "primary");
  var downloadBtn = button("ดาวน์โหลด theme.css");
  var resetBtn = button("รีเซ็ตทั้งหมด", "quiet");
  var closeBtn = button("ปิดโหมดปรับดีไซน์", "quiet");
  btns.appendChild(copyBtn);
  btns.appendChild(downloadBtn);
  btns.appendChild(resetBtn);
  btns.appendChild(closeBtn);

  var status = document.createElement("div");
  status.className = "status";
  status.setAttribute("role", "status");
  foot.appendChild(status);

  var note = document.createElement("div");
  note.className = "note";
  note.textContent = "ค่าที่ปรับเห็นเฉพาะในเบราว์เซอร์นี้ ถ้าต้องการใช้จริง ให้นำ theme.css ที่ดาวน์โหลดไปแทนไฟล์เดิมของเว็บ";
  foot.appendChild(note);

  function refreshExport() {
    if (exportBox) exportBox.value = buildCss();
  }
  refreshExport();

  function say(text) {
    status.textContent = text;
    window.setTimeout(function () { if (status.textContent === text) status.textContent = ""; }, 2500);
  }

  copyBtn.addEventListener("click", function () {
    var css = buildCss();
    var done = function () { say("คัดลอกแล้ว"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(css).then(done, function () {
        exportBox.select();
        say("เลือกข้อความแล้ว กด Cmd+C เพื่อคัดลอก");
      });
    } else {
      exportBox.select();
      say("เลือกข้อความแล้ว กด Cmd+C เพื่อคัดลอก");
    }
  });

  downloadBtn.addEventListener("click", function () {
    var blob = new Blob([buildCss()], { type: "text/css" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "theme.css";
    shadow.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say("ดาวน์โหลด theme.css แล้ว");
  });

  resetBtn.addEventListener("click", function () {
    overrides = {};
    save();
    CONTROLS.forEach(function (c) { applyOne(c); rows[c.name](); });
    refreshExport();
    notify();
    say("กลับเป็นค่าเริ่มต้นแล้ว");
  });

  // ซ่อนหรือแสดงแผง: ตอนแสดง หน้าเว็บจะเว้นที่ด้านขวาให้แผง
  var tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.textContent = "ปรับดีไซน์";
  tab.hidden = true;
  shadow.appendChild(tab);

  function setOpen(open) {
    panel.classList.toggle("is-closed", !open);
    tab.hidden = open;
    document.body.style.marginRight = open ? PANEL_WIDTH + "px" : "";
  }
  hideBtn.addEventListener("click", function () { setOpen(false); });
  tab.addEventListener("click", function () { setOpen(true); });

  closeBtn.addEventListener("click", function () {
    try { window.sessionStorage.removeItem(ACTIVE_KEY); } catch (e) { /* ปิดต่อได้ */ }
    CONTROLS.forEach(function (c) { root.style.removeProperty(c.name); });
    document.body.style.marginRight = "";
    host.remove();
    notify();
  });

  setOpen(true);
  notify();
})();
