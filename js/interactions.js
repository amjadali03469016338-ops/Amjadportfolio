/* ==========================================================================
   INTERACTIONS — custom cursor, magnetic buttons, 3D tilt, parallax figures.
   All pointer handling is delegated, so none of this costs per-element
   listeners on large card sets.
   ========================================================================== */
(function (w) {
    "use strict";

    var AA = w.AA;
    if (!AA) return;

    var reduced = AA.reduced();
    var fine = AA.finePointer();

    /* ======================================================================
       Custom cursor — desktop precise pointers only
       ====================================================================== */
    function initCursor() {
        if (!fine || reduced) return;

        var cur = document.getElementById("cursor");
        var ring = document.getElementById("cursorRing");
        var dot = document.getElementById("cursorDot");
        if (!cur || !ring || !dot) return;

        var rx = AA.ptr.x, ry = AA.ptr.y;   /* ring position */
        var shown = false;

        w.addEventListener("pointermove", function (e) {
            if (!shown) {
                shown = true;
                rx = e.clientX; ry = e.clientY;
                cur.classList.add("is-live");
            }
        }, { passive: true });

        document.addEventListener("pointerleave", function () { cur.classList.remove("is-live"); });
        document.addEventListener("pointerenter", function () { cur.classList.add("is-live"); });

        /* one delegated listener resolves the state from the nearest
           ancestor carrying data-cursor */
        document.addEventListener("pointerover", function (e) {
            var el = e.target.closest ? e.target.closest("[data-cursor]") : null;

            if (!el) {
                /* fall back to element type */
                var tag = e.target.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA") {
                    cur.setAttribute("data-state", "text");
                } else if (tag === "A" || tag === "BUTTON") {
                    cur.setAttribute("data-state", "link");
                } else {
                    cur.removeAttribute("data-state");
                }
                dot.classList.remove("is-hidden");
                return;
            }

            var s = el.getAttribute("data-cursor") || "link";
            cur.setAttribute("data-state", s);

            var lbl = document.getElementById("cursorLabel");
            if (lbl) lbl.textContent = el.getAttribute("data-cursor-label") || "View";

            /* the dot is redundant once the ring carries a label */
            dot.classList.toggle("is-hidden", s === "view" || s === "drag");
        });

        AA.onFrame(function (dt) {
            var p = AA.ptr;
            var k = 1 - Math.pow(0.0000006, dt / 1000);

            rx = AA.lerp(rx, p.x, k);
            ry = AA.lerp(ry, p.y, k);

            dot.style.transform = "translate3d(" + p.x + "px," + p.y + "px,0)";
            ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
        });
    }

    /* ======================================================================
       Magnetic buttons — the element leans toward the pointer
       ====================================================================== */
    function initMagnetic() {
        if (!fine || reduced) return;

        var items = [].slice.call(document.querySelectorAll("[data-magnetic]"));
        if (!items.length) return;

        var active = null;
        var tx = 0, ty = 0, cx = 0, cy = 0;
        var rect = null;

        items.forEach(function (el) {
            el.addEventListener("pointerenter", function () {
                active = el;
                rect = el.getBoundingClientRect();
            });

            el.addEventListener("pointermove", function (e) {
                if (active !== el || !rect) return;
                tx = ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 16;
                ty = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 12;
            });

            el.addEventListener("pointerleave", function () {
                if (active === el) { active = null; tx = 0; ty = 0; }
                el.style.transform = "";
            });
        });

        AA.onFrame(function (dt) {
            if (!active) return;
            var k = 1 - Math.pow(0.000001, dt / 1000);
            cx = AA.lerp(cx, tx, k);
            cy = AA.lerp(cy, ty, k);
            active.style.transform = "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0)";
        });
    }

    /* ======================================================================
       3D tilt — rotates the card and relocates its inner key light
       ====================================================================== */
    function initTilt() {
        if (!fine || reduced) return;

        var items = [].slice.call(document.querySelectorAll("[data-tilt]"));
        if (!items.length) return;

        var MAX_ROT = 7;
        var MAX_LIFT = 5;

        items.forEach(function (el) {
            var depth = parseFloat(el.getAttribute("data-depth")) || 1;
            var rect = null;
            var rx = 0, ry = 0, trx = 0, try_ = 0;
            var on = false;

            el.addEventListener("pointerenter", function () {
                rect = el.getBoundingClientRect();
                on = true;
                /* reveal the cursor-driven key light */
                el.style.setProperty("--mx", "50%");
                el.style.setProperty("--my", "50%");
            });

            el.addEventListener("pointermove", function (e) {
                if (!on || !rect) return;

                var nx = (e.clientX - rect.left) / rect.width;
                var ny = (e.clientY - rect.top) / rect.height;

                trx = (0.5 - ny) * 2 * MAX_ROT * depth;
                try_ = (nx - 0.5) * 2 * MAX_ROT * depth;

                el.style.setProperty("--mx", (nx * 100).toFixed(1) + "%");
                el.style.setProperty("--my", (ny * 100).toFixed(1) + "%");
            });

            el.addEventListener("pointerleave", function () {
                on = false; trx = 0; try_ = 0;
                el.style.setProperty("--rx", "0deg");
                el.style.setProperty("--ry", "0deg");
            });

            /* portrait uses a gentler, non-3D-locked parallax instead */
            if (el.classList.contains("portrait")) {
                el.addEventListener("pointermove", function (e) {
                    if (!rect) return;
                    var nx = (e.clientX - rect.left) / rect.width - 0.5;
                    var ny = (e.clientY - rect.top) / rect.height - 0.5;
                    el.style.setProperty("--px", (nx * 26).toFixed(2));
                    el.style.setProperty("--py", (ny * -18).toFixed(2));
                });
            }

            AA.onFrame(function (dt) {
                if (!on) return;
                var k = 1 - Math.pow(0.000002, dt / 1000);
                rx = AA.lerp(rx, trx, k);
                ry = AA.lerp(ry, try_, k);
                el.style.setProperty("--rx", rx.toFixed(2) + "deg");
                el.style.setProperty("--ry", ry.toFixed(2) + "deg");
            });
        });
    }

    /* ======================================================================
       Footer year
       ====================================================================== */
    function initYear() {
        var el = document.getElementById("year");
        if (el) el.textContent = String(new Date().getFullYear());
    }

    function boot() {
        initCursor();
        initMagnetic();
        initTilt();
        initYear();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window);
