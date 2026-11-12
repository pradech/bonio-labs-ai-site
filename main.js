(function () {
  "use strict";

  // ภาษาของหน้า อ่านจาก <html lang> ใช้เลือกข้อความที่สคริปต์แสดง (th เป็นค่าเริ่มต้น)
  var LANG = (document.documentElement.lang || "th").toLowerCase().indexOf("en") === 0 ? "en" : "th";

  var TEXT = {
    th: {
      navOpen: "เปิดเมนู",
      navClose: "ปิดเมนู",
      errName: "กรุณากรอกชื่อ-นามสกุล",
      errCompany: "กรุณากรอกชื่อบริษัท",
      errEmail: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@company.com",
      errPhone: "กรุณากรอกเบอร์โทรเป็นตัวเลข 8 หลักขึ้นไป",
      errConsent: "กรุณาให้ความยินยอมก่อนส่งข้อมูล",
      busy: "กำลังส่ง...",
      notConfigured: "ระบบรับข้อมูลยังไม่พร้อมใช้งาน ข้อมูลของคุณยังไม่ถูกส่ง กรุณาลองใหม่ภายหลัง",
      sendFailed: "ส่งข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง ข้อมูลที่กรอกไว้ยังอยู่ครบ",
      networkError: "เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง ข้อมูลที่กรอกไว้ยังอยู่ครบ",
      subjectPrefix: "Lead ใหม่จากเว็บไซต์ Bonio Labs: ",
      fromName: "เว็บไซต์ Bonio Labs",
      consentValue: "ยินยอมให้ติดต่อกลับ"
    },
    en: {
      navOpen: "Open menu",
      navClose: "Close menu",
      errName: "Please enter your full name.",
      errCompany: "Please enter your company name.",
      errEmail: "Please enter a valid email, for example name@company.com.",
      errPhone: "Please enter a phone number with at least 8 digits.",
      errConsent: "Please give your consent before sending.",
      busy: "Sending...",
      notConfigured: "The form is not available right now. Your details have not been sent. Please try again later.",
      sendFailed: "Your details could not be sent. Please try again. What you entered is still here.",
      networkError: "No connection. Please check your internet and try again. What you entered is still here.",
      subjectPrefix: "New lead from the Bonio Labs website (EN): ",
      fromName: "Bonio Labs website",
      consentValue: "Agreed to be contacted"
    }
  };
  var t = TEXT[LANG];

  var ENDPOINT = "https://api.web3forms.com/submit";
  var cfg = window.BONIO_CONFIG || {};
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

  // แหล่งที่มาของผู้เข้าชม: เก็บ utm_* และเว็บที่ส่งมา ครั้งแรกของ session ไว้แนบไปกับ lead
  // เพื่อให้รู้ว่า lead แต่ละรายมาจากช่องทางไหน
  var ATTR_KEY = "bonio_attribution";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  function readAttribution() {
    var attr = {};
    var hasUtm = false;
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
    UTM_KEYS.forEach(function (key) {
      var v = params ? params.get(key) : null;
      if (v) { attr[key] = v.slice(0, 120); hasUtm = true; }
    });

    // ลิงก์แคมเปญล่าสุดชนะ ถ้าหน้านี้ไม่มี utm ให้ใช้ค่าที่เก็บไว้ก่อนหน้าใน session เดียวกัน
    if (!hasUtm) {
      var stored = null;
      try { stored = JSON.parse(window.sessionStorage.getItem(ATTR_KEY) || "null"); } catch (e) { stored = null; }
      if (stored) return stored;
    }

    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { ref = ""; }
    if (ref && ref !== window.location.hostname) attr.referrer = ref;
    attr.landing_page = window.location.pathname;

    try { window.sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr)); } catch (e) { /* ใช้ค่าในหน่วยความจำต่อได้ */ }
    return attr;
  }
  var attribution = readAttribution();

  // ส่ง lead ไปที่ Web3Forms ใช้ร่วมกันทั้งฟอร์มติดต่อและเครื่องคำนวณ
  // คืน Promise ของ { ok: true } หรือ { ok: false, reason: "not-configured" | "rejected" | "network" }
  function sendLead(fields) {
    if (!cfg.web3formsAccessKey) {
      console.error("Bonio Labs: ยังไม่ได้ใส่ web3formsAccessKey ใน config.js ฟอร์มจึงไม่ส่งข้อมูล");
      return Promise.resolve({ ok: false, reason: "not-configured" });
    }

    var payload = {
      access_key: cfg.web3formsAccessKey,
      from_name: t.fromName,
      language: LANG,
      page: window.location.origin + window.location.pathname
    };
    Object.keys(fields).forEach(function (key) { payload[key] = fields[key]; });
    Object.keys(attribution).forEach(function (key) { payload[key] = attribution[key]; });

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.ok && data.success === true) return { ok: true };
          console.error("Bonio Labs: ส่งฟอร์มไม่สำเร็จ", data);
          return { ok: false, reason: "rejected" };
        });
      })
      .catch(function (err) {
        console.error("Bonio Labs: เชื่อมต่อไม่ได้", err);
        return { ok: false, reason: "network" };
      });
  }

  function failureMessage(reason) {
    if (reason === "not-configured") return t.notConfigured;
    if (reason === "network") return t.networkError;
    return t.sendFailed;
  }

  // ให้สคริปต์อื่นของเว็บ (calc.js) ใช้ร่วมกัน
  window.BonioLabs = {
    lang: LANG,
    emailPattern: EMAIL_RE,
    text: t,
    sendLead: sendLead,
    failureMessage: failureMessage
  };

  // เมนูมือถือ: ปุ่มเปิดปิด ปิดเมื่อกดลิงก์หรือกด Escape
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function setNavOpen(open) {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? t.navClose : t.navOpen);
  }

  navToggle.addEventListener("click", function () {
    setNavOpen(!nav.classList.contains("is-open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setNavOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  // ฟอร์มติดต่อหลัก
  var form = document.getElementById("lead-form");
  var statusEl = document.getElementById("form-status");
  var successEl = document.getElementById("form-success");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.textContent;

  var rules = [
    { id: "name", test: function (v) { return v.length >= 2; }, msg: t.errName },
    { id: "company", test: function (v) { return v.length >= 2; }, msg: t.errCompany },
    { id: "email", test: function (v) { return EMAIL_RE.test(v); }, msg: t.errEmail },
    { id: "phone", test: function (v) { return v === "" || PHONE_RE.test(v); }, msg: t.errPhone }
  ];

  function value(id) {
    return (document.getElementById(id).value || "").trim();
  }

  function setFieldError(id, msg) {
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

  function setStatus(kind, text) {
    if (!text) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.dataset.kind = kind;
    statusEl.textContent = text;
    statusEl.hidden = false;
  }

  function validate() {
    var firstInvalid = null;

    rules.forEach(function (rule) {
      var ok = rule.test(value(rule.id));
      setFieldError(rule.id, ok ? "" : rule.msg);
      if (!ok && !firstInvalid) firstInvalid = document.getElementById(rule.id);
    });

    var consent = document.getElementById("consent");
    setFieldError("consent", consent.checked ? "" : t.errConsent);
    if (!consent.checked && !firstInvalid) firstInvalid = consent;

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? t.busy : submitLabel;
  }

  // ล้างข้อความผิดพลาดของช่องนั้นเมื่อผู้ใช้แก้ไข
  rules.forEach(function (rule) {
    document.getElementById(rule.id).addEventListener("input", function () {
      if (rule.test(value(rule.id))) setFieldError(rule.id, "");
    });
  });
  document.getElementById("consent").addEventListener("change", function (e) {
    if (e.target.checked) setFieldError("consent", "");
  });

  // ลิงก์สอบถามบริการบนการ์ดบริการ เลือกบริการนั้นในฟอร์มให้ล่วงหน้า
  Array.prototype.forEach.call(document.querySelectorAll("[data-service]"), function (link) {
    link.addEventListener("click", function () {
      document.getElementById("service").value = link.getAttribute("data-service");
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("", "");

    if (!validate()) return;

    // honeypot: คนจริงมองไม่เห็นช่องนี้ ถ้าถูกติ๊กแปลว่าเป็น bot จึงไม่ส่ง
    if (document.getElementById("botcheck").checked) return;

    var company = value("company");
    setBusy(true);

    sendLead({
      subject: t.subjectPrefix + company,
      lead_type: "contact-form",
      name: value("name"),
      email: value("email"),
      company: company,
      phone: value("phone"),
      role: value("role"),
      team_size: value("team_size"),
      service: value("service"),
      message: value("message"),
      consent: t.consentValue
    }).then(function (result) {
      setBusy(false);
      if (!result.ok) {
        setStatus("error", failureMessage(result.reason));
        return;
      }
      form.hidden = true;
      successEl.hidden = false;
      successEl.focus();
    });
  });
})();
