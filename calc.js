// เครื่องคำนวณความคุ้มค่าใน section #calculator
// คำนวณทันทีเมื่อผู้ใช้แก้ตัวเลข ตัวเลขล่าสุดจะถูกแนบไปกับ lead ผ่าน window.BonioLabs.extraFields (main.js)
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
      negative: "ตัวเลขชุดนี้ยังไม่คุ้มค่าเครื่องมือ AI ลองเลือกงานที่มีปริมาณมากกว่านี้"
    },
    en: {
      currency: function (n) { return "THB " + fmt(n); },
      hours: function (n) { return fmt(n) + " hours"; },
      percent: function (n) { return n + "%"; },
      positive: "Net result per year, after AI tool costs",
      negative: "These numbers do not yet cover the AI tool cost. Try a task with a higher volume."
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

  // แนบตัวเลขล่าสุดไปกับ lead เมื่อผู้ใช้ส่งอีเมลจากฟอร์มใต้ผลคำนวณ (ดู initQuickLead ใน main.js)
  shared.extraFields.calculator = function () {
    return {
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
    };
  };
})();
