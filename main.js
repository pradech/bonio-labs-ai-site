(function () {
  "use strict";

  // ภาษาของหน้า อ่านจาก <html lang> ใช้เลือกข้อความที่สคริปต์แสดง (th เป็นค่าเริ่มต้น)
  var LANG = (document.documentElement.lang || "th").toLowerCase().indexOf("en") === 0 ? "en" : "th";

  var TEXT = {
    th: {
      navOpen: "เปิดเมนู",
      navClose: "ปิดเมนู",
      errEmail: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@company.com",
      busy: "กำลังส่ง...",
      notConfigured: "ระบบรับข้อมูลยังไม่พร้อมใช้งาน อีเมลของคุณยังไม่ถูกส่ง กรุณาลองใหม่ภายหลัง",
      sendFailed: "ส่งไม่สำเร็จ กรุณาลองอีกครั้ง",
      networkError: "เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง",
      subjectPrefix: "Lead ใหม่จากเว็บไซต์ Bonio Labs: ",
      detailsSubject: "Lead ใหม่จากเว็บไซต์ Bonio Labs: ข้อมูลเพิ่มจาก ",
      fromName: "เว็บไซต์ Bonio Labs",
      consentValue: "ยินยอมให้ติดต่อกลับ (ส่งอีเมลด้วยตนเอง)",
      doneTitle: "ได้รับอีเมลแล้ว",
      doneBody: "เราจะติดต่อกลับไปที่ ",
      extraQuestion: "บอกเพิ่มอีกนิดได้ไหม ไม่บังคับ แตะเลือกได้เลย",
      extraService: "บริการที่สนใจ",
      extraSize: "ขนาดองค์กร",
      extraSend: "ส่งข้อมูลเพิ่ม",
      extraPick: "แตะเลือกอย่างน้อยหนึ่งข้อก่อนส่ง",
      extraThanks: "ขอบคุณ ได้รับข้อมูลเพิ่มแล้ว",
      services: ["AI Use Case & ROI Sprint", "AI Automation ช่วยงานหลังบ้าน", "Custom Software พัฒนาซอฟต์แวร์เฉพาะทาง", "ยังไม่แน่ใจ ขอคำแนะนำ"],
      sizes: ["ต่ำกว่า 50 คน", "50-200 คน", "200-2,000 คน", "มากกว่า 2,000 คน"]
    },
    en: {
      navOpen: "Open menu",
      navClose: "Close menu",
      errEmail: "Please enter a valid email, for example name@company.com.",
      busy: "Sending...",
      notConfigured: "The form is not available right now. Your email has not been sent. Please try again later.",
      sendFailed: "It could not be sent. Please try again.",
      networkError: "No connection. Please check your internet and try again.",
      subjectPrefix: "New lead from the Bonio Labs website (EN): ",
      detailsSubject: "New lead from the Bonio Labs website (EN): more details from ",
      fromName: "Bonio Labs website",
      consentValue: "Agreed to be contacted (submitted their own email)",
      doneTitle: "We have your email",
      doneBody: "We will reply to ",
      extraQuestion: "Can you tell us a little more? Optional, just tap.",
      extraService: "Service you are interested in",
      extraSize: "Organization size",
      extraSend: "Send details",
      extraPick: "Tap at least one option before sending.",
      extraThanks: "Thank you. We have your details.",
      services: ["AI Use Case & ROI Sprint", "AI Automation for back-office work", "Custom Software development", "Not sure yet, please advise"],
      sizes: ["Under 50 people", "50-200 people", "200-2,000 people", "Over 2,000 people"]
    }
  };
  var t = TEXT[LANG];

  var ENDPOINT = "https://api.web3forms.com/submit";
  var cfg = window.BONIO_CONFIG || {};
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var FREE_MAIL = ["gmail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com"];

  // แหล่งที่มาของผู้เข้าชม: เก็บ utm_* และเว็บที่ส่งมาไว้แนบไปกับ lead
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

  // ส่ง lead ไปที่ Web3Forms
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

  // calc.js ลงทะเบียนตัวเลขจากเครื่องคำนวณไว้ที่ extraFields.calculator เพื่อแนบไปกับ lead
  window.BonioLabs = { lang: LANG, extraFields: {} };

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

  // ---- ฟอร์มอีเมลช่องเดียว (.quick-lead): ใช้ทั้งส่วนบนสุด เครื่องคำนวณ และส่วนติดต่อ ----

  // เดาชื่อบริษัทจากโดเมนอีเมล เพื่อไม่ต้องให้ผู้ใช้กรอกเอง อีเมลฟรีจะไม่เดา
  function companyGuess(email) {
    var domain = email.split("@")[1].toLowerCase();
    return FREE_MAIL.indexOf(domain) === -1 ? domain : "";
  }

  // บริการที่ผู้ใช้กดสนใจจากการ์ดบริการ จะแนบไปกับ lead และเลือกไว้ให้ในคำถามเพิ่ม
  var pendingService = "";
  Array.prototype.forEach.call(document.querySelectorAll("[data-service]"), function (link) {
    link.addEventListener("click", function () {
      pendingService = link.getAttribute("data-service");
      var target = document.getElementById("q-email-contact");
      if (target) window.setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
    });
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function chipGroup(label, options, selected) {
    var group = el("div", "chip-group");
    group.appendChild(el("p", "chip-label", label));
    var chips = el("div", "chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", label);
    options.forEach(function (option) {
      var chip = el("button", "chip", option);
      chip.type = "button";
      chip.setAttribute("aria-pressed", option === selected ? "true" : "false");
      chip.addEventListener("click", function () {
        var wasOn = chip.getAttribute("aria-pressed") === "true";
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", wasOn ? "false" : "true");
      });
      chips.appendChild(chip);
    });
    group.appendChild(chips);
    group.value = function () {
      var on = chips.querySelector('[aria-pressed="true"]');
      return on ? on.textContent : "";
    };
    return group;
  }

  // หลังส่งอีเมลสำเร็จ: ยืนยัน แล้วถามเพิ่มแบบแตะเลือกได้ ไม่บังคับ
  function showDone(form, email) {
    var done = el("div", "quick-done");
    done.tabIndex = -1;
    done.appendChild(el("p", "quick-done-title", t.doneTitle));
    var body = el("p", "quick-done-body", t.doneBody);
    body.appendChild(el("strong", "", email));
    done.appendChild(body);

    var extra = el("div", "quick-extra");
    extra.appendChild(el("p", "quick-extra-q", t.extraQuestion));
    var serviceGroup = chipGroup(t.extraService, t.services, pendingService);
    var sizeGroup = chipGroup(t.extraSize, t.sizes, "");
    extra.appendChild(serviceGroup);
    extra.appendChild(sizeGroup);
    var send = el("button", "btn btn-small quick-extra-send", t.extraSend);
    send.type = "button";
    extra.appendChild(send);
    var status = el("p", "quick-extra-status");
    status.setAttribute("role", "status");
    extra.appendChild(status);
    done.appendChild(extra);

    send.addEventListener("click", function () {
      var service = serviceGroup.value();
      var size = sizeGroup.value();
      if (!service && !size) { status.textContent = t.extraPick; return; }
      send.disabled = true;
      send.textContent = t.busy;
      sendLead({
        subject: t.detailsSubject + email,
        lead_type: "quick-details",
        email: email,
        service: service,
        team_size: size
      }).then(function (result) {
        if (!result.ok) {
          send.disabled = false;
          send.textContent = t.extraSend;
          status.textContent = failureMessage(result.reason);
          return;
        }
        extra.textContent = "";
        extra.appendChild(el("p", "quick-extra-thanks", t.extraThanks));
      });
    });

    form.hidden = true;
    form.parentNode.insertBefore(done, form.nextSibling);
    done.focus();
  }

  function initQuickLead(form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var error = form.querySelector(".quick-error");
    var source = form.getAttribute("data-source") || "page";
    var buttonLabel = button.textContent;

    function setError(message) {
      if (message) {
        error.textContent = message;
        error.hidden = false;
        input.setAttribute("aria-invalid", "true");
      } else {
        error.textContent = "";
        error.hidden = true;
        input.removeAttribute("aria-invalid");
      }
    }

    input.addEventListener("input", function () {
      if (EMAIL_RE.test(input.value.trim())) setError("");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!EMAIL_RE.test(email)) {
        setError(t.errEmail);
        input.focus();
        return;
      }
      setError("");

      // honeypot: คนจริงมองไม่เห็นช่องนี้ ถ้าถูกติ๊กแปลว่าเป็น bot จึงไม่ส่ง
      if (form.querySelector(".quick-hp").checked) return;

      var guess = companyGuess(email);
      var fields = {
        subject: t.subjectPrefix + (guess || email),
        lead_type: "quick-" + source,
        email: email,
        company_guess: guess,
        consent: t.consentValue
      };
      if (pendingService) fields.service = pendingService;
      var message = form.querySelector("textarea");
      if (message && message.value.trim()) fields.message = message.value.trim();
      var extra = window.BonioLabs.extraFields[source];
      if (typeof extra === "function") {
        var more = extra();
        Object.keys(more).forEach(function (key) { fields[key] = more[key]; });
      }

      button.disabled = true;
      button.textContent = t.busy;
      sendLead(fields).then(function (result) {
        button.disabled = false;
        button.textContent = buttonLabel;
        if (!result.ok) {
          setError(failureMessage(result.reason));
          return;
        }
        showDone(form, email);
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form.quick-lead"), initQuickLead);
})();
