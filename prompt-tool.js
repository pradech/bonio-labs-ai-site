// เครื่องมือสร้างคำสั่ง AI สำหรับสรุปประชุม (section #tool)
// ผู้ใช้แตะเลือกรูปแบบ แล้วได้คำสั่งพร้อมคัดลอกไปวางในเครื่องมือ AI ขององค์กรเอง
// หน้าเว็บนี้ไม่รับและไม่ส่งข้อความการประชุมของผู้ใช้ไปที่ใด
(function () {
  "use strict";

  var root = document.getElementById("tool");
  if (!root) return;

  var LANG = (document.documentElement.lang || "th").toLowerCase().indexOf("en") === 0 ? "en" : "th";

  var TEXT = {
    th: {
      intro: "คุณคือผู้ช่วยเลขานุการที่ประชุมขององค์กร อ่านบันทึกการประชุมด้านล่าง แล้วสรุปเป็น",
      rulesTitle: "ข้อกำหนด",
      ruleSource: "ใช้เฉพาะข้อมูลที่อยู่ในบันทึก ห้ามเดาหรือเติมข้อมูลเอง ถ้าข้อมูลใดไม่มี ให้เขียนว่า \"ไม่ระบุ\"",
      ruleVoice: function (language, tone) { return "เขียนเป็น" + language + " ด้วยน้ำเสียง" + tone; },
      ruleConfirm: "ท้ายสุด ให้ทำรายการ \"ข้อที่ควรยืนยันกับผู้เข้าประชุม\" สำหรับจุดที่บันทึกไม่ชัดเจน",
      formatTitle: "รูปแบบผลลัพธ์",
      notesTitle: "บันทึกการประชุม",
      placeholder: "[วางบันทึกการประชุมของคุณที่นี่]",
      copied: "คัดลอกแล้ว นำไปวางในเครื่องมือ AI ขององค์กรได้เลย",
      copyManual: "เลือกข้อความให้แล้ว กด Cmd+C หรือ Ctrl+C เพื่อคัดลอก",
      format: {
        table: { name: "ตารางรายการงาน", spec: function (cols) { return "ตารางที่มีคอลัมน์: " + cols.join(" | ") + " เรียงตามกำหนดส่ง งานละหนึ่งแถว"; } },
        email: { name: "อีเมลสรุปถึงผู้เข้าประชุม", spec: function () { return "หัวเรื่องอีเมลหนึ่งบรรทัด ตามด้วยเนื้อหาไม่เกิน 150 คำ แล้วปิดด้วยรายการงานเป็นข้อ"; } },
        brief: { name: "รายงานสั้นถึงผู้บริหาร", spec: function () { return "ไม่เกิน 5 บรรทัด เรียงเป็น เรื่องที่ตัดสินใจแล้ว เรื่องที่ต้องการการตัดสินใจ และความเสี่ยงที่ควรรู้"; } }
      },
      columns: { task: "งานที่ต้องทำ", owner: "เจ้าของงาน", due: "กำหนดส่ง", note: "หมายเหตุ" },
      include: {
        owner: "ระบุเจ้าของงานของทุกงาน",
        due: "ระบุกำหนดส่งของทุกงานตามที่บันทึกไว้",
        decisions: "แยกมติที่ประชุมออกจากรายการงาน",
        open: "แยกประเด็นที่ยังไม่ได้ข้อสรุปไว้ต่างหาก"
      },
      language: { th: "ภาษาไทย", en: "ภาษาอังกฤษ" },
      tone: { formal: "ทางการ", brief: "กระชับ ตรงประเด็น" }
    },
    en: {
      intro: "You are the organization's meeting secretary. Read the meeting notes below and turn them into ",
      introEnd: ".",
      rulesTitle: "Rules",
      ruleSource: "Use only what is in the notes. Do not guess or add information. If something is missing, write \"not stated\".",
      ruleVoice: function (language, tone) { return "Write in " + language + " in a " + tone + " tone."; },
      ruleConfirm: "End with a list titled \"Points to confirm with attendees\" for anything the notes leave unclear.",
      formatTitle: "Output format",
      notesTitle: "Meeting notes",
      placeholder: "[paste your meeting notes here]",
      copied: "Copied. Paste it into your organization's AI tool.",
      copyManual: "The text is selected. Press Cmd+C or Ctrl+C to copy.",
      format: {
        table: { name: "an action item table", spec: function (cols) { return "A table with the columns: " + cols.join(" | ") + ", sorted by due date, one row per action."; } },
        email: { name: "a summary email to the attendees", spec: function () { return "A one-line subject, then a body of no more than 150 words, ending with the action items as a list."; } },
        brief: { name: "a short brief for executives", spec: function () { return "No more than 5 lines, in this order: what was decided, what needs a decision, and risks worth knowing."; } }
      },
      columns: { task: "Action", owner: "Owner", due: "Due", note: "Notes" },
      include: {
        owner: "Name an owner for every action.",
        due: "Give the due date of every action as stated in the notes.",
        decisions: "List decisions separately from actions.",
        open: "List unresolved issues separately."
      },
      language: { th: "Thai", en: "English" },
      tone: { formal: "formal", brief: "brief and direct" }
    }
  };
  var t = TEXT[LANG];

  var promptEl = document.getElementById("tool-prompt");
  var copyBtn = document.getElementById("tool-copy");
  var statusEl = document.getElementById("tool-status");
  var groups = root.querySelectorAll("fieldset[data-key]");

  // อ่านตัวเลือกที่กดอยู่: กลุ่มแบบ single คืนค่าเดียว กลุ่มแบบ multi คืนรายการ
  function state() {
    var s = {};
    Array.prototype.forEach.call(groups, function (group) {
      var on = group.querySelectorAll('.chip[aria-pressed="true"]');
      var values = Array.prototype.map.call(on, function (chip) { return chip.getAttribute("data-value"); });
      s[group.getAttribute("data-key")] = group.getAttribute("data-mode") === "multi" ? values : values[0];
    });
    return s;
  }

  function buildPrompt() {
    var s = state();
    var format = t.format[s.format] || t.format.table;
    var include = s.include || [];

    var columns = [t.columns.task];
    if (include.indexOf("owner") !== -1) columns.push(t.columns.owner);
    if (include.indexOf("due") !== -1) columns.push(t.columns.due);
    columns.push(t.columns.note);

    var rules = [t.ruleSource];
    include.forEach(function (key) { if (t.include[key]) rules.push(t.include[key]); });
    rules.push(t.ruleVoice(t.language[s.language] || t.language.th, t.tone[s.tone] || t.tone.formal));
    rules.push(t.ruleConfirm);

    return [
      t.intro + format.name + (t.introEnd || ""),
      "",
      t.rulesTitle,
      rules.map(function (rule) { return "- " + rule; }).join("\n"),
      "",
      t.formatTitle,
      format.spec(columns),
      "",
      t.notesTitle,
      t.placeholder
    ].join("\n");
  }

  function render() {
    promptEl.textContent = buildPrompt();
    statusEl.textContent = "";
  }

  Array.prototype.forEach.call(groups, function (group) {
    var multi = group.getAttribute("data-mode") === "multi";
    group.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      if (multi) {
        chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
      } else {
        Array.prototype.forEach.call(group.querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", "true");
      }
      render();
    });
  });

  function selectPrompt() {
    var range = document.createRange();
    range.selectNodeContents(promptEl);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  copyBtn.addEventListener("click", function () {
    var text = promptEl.textContent;
    var manual = function () {
      selectPrompt();
      statusEl.textContent = t.copyManual;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { statusEl.textContent = t.copied; }, manual);
    } else {
      manual();
    }
  });

  render();
})();
