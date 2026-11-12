// เครื่องคำนวณความคุ้มค่าใน section #calculator
// คำนวณทันทีเมื่อผู้ใช้แก้ตัวเลข และส่งผลคำนวณพร้อมข้อมูลติดต่อเป็น lead ผ่าน window.BonioLabs.sendLead (main.js)
(function () {
  "use strict";

  var form = document.getElementById("calc-form");
  var shared = window.BonioLabs;
  if (!form || !shared) return;

  var LANG = shared.lang;
  var TEXT = {
    th: {
      currency: function (n) { return fmt(n) + " บาท"; },
      hours: function (n) { return fmt(n) + " ชั่วโมง"; },
      percent: function (n) { return n + "%"; },
      positive: "ผลสุทธิต่อปี หลังหักค่าเครื่องมือ AI",
      negative: "ตัวเลขชุดนี้ยังไม่คุ้มค่าเครื่องมือ AI ลองเลือกงานที่มีปริมาณมากกว่านี้",
      errName: "กรุณากรอกชื่อ-นามสกุล",
      errEmail: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@company.com",
      errCompany: "กรุณากรอกชื่อบริษัท",
      errConsent: "กรุณาให้ความยินยอมก่อนส่งข้อมูล",
      busy: "กำลังส่ง...",
      subject: "Lead จากเครื่องคำนวณ Bonio Labs: ",
      consentValue: "ยินยอมให้ติดต่อกลับ"
    },
    en: {
      currency: function (n) { return "THB " + fmt(n); },
      hours: function (n) { return fmt(n) + " hours"; },
      percent: function (n) { return n + "%"; },
      positive: "Net result per year, after AI tool costs",
      negative: "These numbers do not yet cover the AI tool cost. Try a task with a higher volume.",
      errName: "Please enter your full name.",
      errEmail: "Please enter a valid email, for example name@company.com.",
      errCompany: "Please enter your company name.",
      errConsent: "Please give your consent before sending.",
      busy: "Sending...",
      subject: "Lead from the Bonio Labs calculator (EN): ",
      consentValue: "Agreed to be contacted"
    }
  };
  var t = TEXT[LANG];

  function fmt(n) {
    return Math.round(n).toLocaleString(LANG === "en" ? "en-US" : "th-TH");
  }

  function num(id, max) {
    var v = parseFloat(document.getElementById(id).value);
    if (!isFinite(v) || v < 0) return 0;
    return Math.min(v, max);
  }

  var out = {
    pct: document.getElementById("calc-pct-out"),
    net: document.getElementById("calc-net"),
    netLabel: document.getElementById("calc-net-label"),
    hours: document.getElementById("calc-hours"),
    value: document.getElementById("calc-value"),
    tools: document.getElementById("calc-tools")
  };

  var latest = null;

  function calculate() {
    var volume = num("calc-volume", 10000000);
    var minutes = num("calc-minutes", 100000);
    var cost = num("calc-cost", 1000000);
    var people = num("calc-people", 1000000);
    var toolCost = num("calc-tool", 1000000);
    var pct = Math.max(0, Math.min(100, num("calc-pct", 100)));

    var hoursSaved = volume * minutes / 60 * (pct / 100);
    var valueYear = hoursSaved * cost * 12;
    var toolsYear = people * toolCost * 12;
    var net = valueYear - toolsYear;

    latest = {
      volume: volume, minutes: minutes, cost: cost, people: people, toolCost: toolCost, pct: pct,
      hoursSaved: Math.round(hoursSaved), valueYear: Math.round(valueYear),
      toolsYear: Math.round(toolsYear), net: Math.round(net)
    };

    out.pct.textContent = t.percent(pct);
    out.net.textContent = (net < 0 ? "−" : "") + t.currency(Math.abs(net));
    out.net.classList.toggle("is-negative", net < 0);
    out.netLabel.textContent = net < 0 ? t.negative : t.positive;
    out.hours.textContent = t.hours(hoursSaved);
    out.value.textContent = t.currency(valueYear);
    out.tools.textContent = t.currency(toolsYear);
  }

  form.addEventListener("input", calculate);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  calculate();

  // ฟอร์มสั้นสำหรับส่งผลคำนวณให้ทีมช่วยตรวจ
  var openBtn = document.getElementById("calc-open");
  var leadForm = document.getElementById("calc-lead-form");
  var statusEl = document.getElementById("calc-status");
  var successEl = document.getElementById("calc-success");
  var submitBtn = leadForm.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.textContent;

  openBtn.addEventListener("click", function () {
    leadForm.hidden = false;
    openBtn.hidden = true;
    document.getElementById("calc-name").focus();
  });

  function val(id) {
    return (document.getElementById(id).value || "").trim();
  }

  function setError(id, msg) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + "-error");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", id + "-error");
      err.textContent = msg;
      err.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      err.textContent = "";
      err.hidden = true;
    }
  }

  var rules = [
    { id: "calc-name", test: function (v) { return v.length >= 2; }, msg: t.errName },
    { id: "calc-email", test: function (v) { return shared.emailPattern.test(v); }, msg: t.errEmail },
    { id: "calc-company", test: function (v) { return v.length >= 2; }, msg: t.errCompany }
  ];

  rules.forEach(function (rule) {
    document.getElementById(rule.id).addEventListener("input", function () {
      if (rule.test(val(rule.id))) setError(rule.id, "");
    });
  });
  document.getElementById("calc-consent").addEventListener("change", function (e) {
    if (e.target.checked) setError("calc-consent", "");
  });

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.hidden = true;

    var firstInvalid = null;
    rules.forEach(function (rule) {
      var ok = rule.test(val(rule.id));
      setError(rule.id, ok ? "" : rule.msg);
      if (!ok && !firstInvalid) firstInvalid = document.getElementById(rule.id);
    });
    var consent = document.getElementById("calc-consent");
    setError("calc-consent", consent.checked ? "" : t.errConsent);
    if (!consent.checked && !firstInvalid) firstInvalid = consent;
    if (firstInvalid) { firstInvalid.focus(); return; }

    if (document.getElementById("calc-botcheck").checked) return;

    var company = val("calc-company");
    submitBtn.disabled = true;
    submitBtn.textContent = t.busy;

    shared.sendLead({
      subject: t.subject + company,
      lead_type: "roi-calculator",
      name: val("calc-name"),
      email: val("calc-email"),
      company: company,
      consent: t.consentValue,
      calc_tasks_per_month: latest.volume,
      calc_minutes_per_task: latest.minutes,
      calc_cost_per_hour_thb: latest.cost,
      calc_people: latest.people,
      calc_tool_cost_per_person_thb: latest.toolCost,
      calc_time_reduction_percent: latest.pct,
      calc_hours_saved_per_month: latest.hoursSaved,
      calc_value_per_year_thb: latest.valueYear,
      calc_tool_cost_per_year_thb: latest.toolsYear,
      calc_net_per_year_thb: latest.net
    }).then(function (result) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      if (!result.ok) {
        statusEl.dataset.kind = "error";
        statusEl.textContent = shared.failureMessage(result.reason);
        statusEl.hidden = false;
        return;
      }
      leadForm.hidden = true;
      successEl.hidden = false;
      successEl.focus();
    });
  });
})();
