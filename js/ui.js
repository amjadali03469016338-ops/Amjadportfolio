/* ==========================================================================
   UI — mobile drawer, case-study overlay, stat counters, contact form.
   ========================================================================== */
(function (w) {
    "use strict";

    var AA = w.AA;
    if (!AA) return;

    /* ======================================================================
       Navbar reveal on first paint
       ====================================================================== */
    function navIn() {
        var nav = document.getElementById("nav");
        if (nav) requestAnimationFrame(function () { nav.classList.add("is-in"); });
    }

    /* ======================================================================
       Mobile drawer
       ====================================================================== */
    function initDrawer() {
        var burger = document.getElementById("burger");
        var drawer = document.getElementById("drawer");
        if (!burger || !drawer) return;

        function setOpen(v) {
            burger.classList.toggle("is-on", v);
            drawer.classList.toggle("is-open", v);
            burger.setAttribute("aria-expanded", String(v));
            burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
            drawer.setAttribute("aria-hidden", String(!v));
            document.body.style.overflow = v ? "hidden" : "";

            /* stagger the links in */
            var links = drawer.querySelectorAll("a");
            [].forEach.call(links, function (a, i) {
                a.style.transitionDelay = v ? (60 + i * 42) + "ms" : "0ms";
            });
        }

        burger.addEventListener("click", function () {
            setOpen(!drawer.classList.contains("is-open"));
        });

        drawer.addEventListener("click", function (e) {
            if (e.target.closest("a")) setOpen(false);
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && drawer.classList.contains("is-open")) {
                setOpen(false);
                burger.focus();
            }
        });

        w.addEventListener("resize", function () {
            if (w.innerWidth > 900) setOpen(false);
        });
    }

    /* ======================================================================
       Case-study overlay
       ====================================================================== */
    function initModal() {
        var modal = document.getElementById("modal");
        var card = document.getElementById("modalCard");
        if (!modal) return;

        var img = document.getElementById("modalImg");
        var title = document.getElementById("modalTitle");
        var cat = document.getElementById("modalCat");
        var desc = document.getElementById("modalDesc");
        var tech = document.getElementById("modalTech");
        var live = document.getElementById("modalLive");
        var repo = document.getElementById("modalRepo");
        var close = document.getElementById("modalClose");
        var prev = document.getElementById("modalPrev");
        var next = document.getElementById("modalNext");

        var cases = [].slice.call(document.querySelectorAll("[data-case]"));
        if (!cases.length) return;

        var i = 0;
        var lastFocus = null;

        function fill(n) {
            i = (n + cases.length) % cases.length;
            var el = cases[i];
            var d = el.dataset;

            title.textContent = d.title || "Project";
            cat.textContent = d.cat || "Case study";
            desc.textContent = d.desc || "";

            tech.innerHTML = "";
            (d.tech || "").split(",").forEach(function (t) {
                t = t.trim();
                if (!t) return;
                var s = document.createElement("span");
                s.className = "chip-s";
                s.textContent = t;
                tech.appendChild(s);
            });

            if (d.img) {
                img.src = d.img;
                img.width = parseInt(d.imgw, 10) || 1400;
                img.height = parseInt(d.imgh, 10) || 998;
                img.alt = d.title ? d.title + " project preview" : "";
            }

            if (d.live) {
                live.href = d.live;
                live.hidden = false;
            } else {
                live.hidden = true;
            }

            /* only offer source when there is one — never a dead link */
            if (d.repo) {
                repo.href = d.repo;
                repo.hidden = false;
            } else {
                repo.hidden = true;
            }
        }

        function open(n) {
            lastFocus = document.activeElement;
            fill(n);
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            if (close) close.focus();
        }

        function shut() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        cases.forEach(function (el, n) {
            el.addEventListener("click", function () { open(n); });
            el.setAttribute("tabindex", "0");
            el.setAttribute("role", "button");

            el.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(n);
                }
            });
        });

        if (close) close.addEventListener("click", shut);
        if (prev) prev.addEventListener("click", function () { fill(i - 1); });
        if (next) next.addEventListener("click", function () { fill(i + 1); });

        modal.addEventListener("click", function (e) {
            if (e.target === modal) shut();
        });

        document.addEventListener("keydown", function (e) {
            if (!modal.classList.contains("is-open")) return;

            if (e.key === "Escape") { shut(); return; }
            if (e.key === "ArrowLeft") { fill(i - 1); return; }
            if (e.key === "ArrowRight") { fill(i + 1); return; }

            /* focus trap */
            if (e.key === "Tab") {
                var f = card.querySelectorAll('a[href], button:not([disabled])');
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            }
        });
    }

    /* ======================================================================
       Stat counters
       ====================================================================== */
    function initCounters() {
        var nums = [].slice.call(document.querySelectorAll("[data-count]"));
        if (!nums.length) return;

        function snap(el) {
            el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
        }

        function run(el) {
            var target = parseFloat(el.getAttribute("data-count")) || 0;
            var suffix = el.getAttribute("data-suffix") || "";

            if (AA.reduced()) { snap(el); return; }

            var dur = 1500;
            var t0 = null;

            function step(now) {
                if (t0 === null) t0 = now;
                var p = Math.min(1, (now - t0) / dur);
                /* easeOutExpo — fast settle, no bounce */
                var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                el.textContent = Math.round(target * e) + suffix;
                if (p < 1) requestAnimationFrame(step);
                else el.textContent = target + suffix;
            }

            requestAnimationFrame(step);
        }

        if (!("IntersectionObserver" in w)) { nums.forEach(snap); return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                run(en.target);
                io.unobserve(en.target);
            });
        }, { threshold: 0.5 });

        nums.forEach(function (el) { io.observe(el); });
    }

    /* ======================================================================
       Contact form
       Validates, then delivers via Web3Forms when a key is configured.
       With no key it falls back to a pre-filled mailto draft so the form
       still does something real instead of silently failing.
       ====================================================================== */
    function initForm() {
        var form = document.getElementById("contactForm");
        if (!form) return;

        var status = document.getElementById("formStatus");
        var btn = document.getElementById("submitBtn");
        var label = form.querySelector("[data-btn-label]");

        var key = (form.getAttribute("data-web3forms-key") || "").trim();
        var email = (form.getAttribute("data-email") || "").trim();
        var subject = form.getAttribute("data-subject") || "New portfolio enquiry";

        function say(msg, kind) {
            if (!status) return;
            status.textContent = msg;
            status.className = "form__status" + (kind ? " is-" + kind : "");
        }

        function fail(field, msg) {
            var wrap = field.closest(".field");
            if (wrap) wrap.classList.add("is-bad");
            var slot = form.querySelector('[data-err-for="' + field.id + '"]');
            if (slot) slot.textContent = msg;
        }

        function clearErrors() {
            [].forEach.call(form.querySelectorAll(".field"), function (f) { f.classList.remove("is-bad"); });
            [].forEach.call(form.querySelectorAll(".field__err"), function (f) { f.textContent = ""; });
        }

        function validate() {
            clearErrors();
            var name = form.name, mail = form.email, subj = form.subject, msg = form.message;
            var bad = false;

            if (!name.value.trim()) { fail(name, "Required"); bad = true; }
            if (!mail.value.trim()) { fail(mail, "Required"); bad = true; }
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) { fail(mail, "Check this address"); bad = true; }
            if (!subj.value.trim()) { fail(subj, "Required"); bad = true; }
            if (!msg.value.trim()) { fail(msg, "Required"); bad = true; }
            else if (msg.value.trim().length < 12) { fail(msg, "A little more detail, please"); bad = true; }

            if (bad) {
                say("Please complete the highlighted fields.", "err");
                var firstBad = form.querySelector(".field.is-bad input, .field.is-bad textarea");
                if (firstBad) firstBad.focus();
            }

            return !bad;
        }

        function mailto() {
            var d = new FormData(form);
            var body =
                "Name: " + d.get("name") + "\n" +
                "Email: " + d.get("email") + "\n" +
                "Project type: " + d.get("subject") + "\n\n" +
                d.get("message");

            w.location.href = "mailto:" + email +
                "?subject=" + encodeURIComponent(subject) +
                "&body=" + encodeURIComponent(body);
        }

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!validate()) return;

            var d = new FormData(form);
            var payload = {
                access_key: key,
                subject: subject + " — " + d.get("subject"),
                name: d.get("name"),
                email: d.get("email"),
                message: d.get("message"),
                from_name: d.get("name"),
                replyto: d.get("email"),
                botcheck: ""
            };

            /* no key configured: hand the visitor a ready-to-send draft */
            if (!key) {
                mailto();
                say("Your email app should have opened with the message ready to send. If nothing happened, email me directly at " + email + ".", "ok");
                return;
            }

            if (label) label.textContent = "Sending…";
            if (btn) btn.disabled = true;

            fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload)
            })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.success) {
                        form.reset();
                        say("Thank you — your message is on its way. I reply to everything, usually within a day.", "ok");
                    } else {
                        say("That didn't send. Please email me directly at " + email + ".", "err");
                    }
                })
                .catch(function () {
                    say("Network problem. Please email me directly at " + email + ".", "err");
                })
                .then(function () {
                    if (label) label.textContent = "Send message";
                    if (btn) btn.disabled = false;
                });
        });
    }

    function boot() {
        navIn();
        initDrawer();
        initModal();
        initCounters();
        initForm();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window);
