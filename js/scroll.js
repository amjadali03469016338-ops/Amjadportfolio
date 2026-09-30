/* ==========================================================================
   SCROLL — pinned horizontal bands.
   Vertical page scroll becomes the timeline; the track is driven with a
   translate3d so the compositor does the work.
   Below 680px (or with reduced motion) the same markup degrades to a native
   swipe rail via CSS and this module stands down.
   ========================================================================== */
(function (w) {
    "use strict";

    var AA = w.AA;
    if (!AA) return;

    var mqNarrow = w.matchMedia("(max-width: 680px)");

    function isOff() { return mqNarrow.matches || AA.reduced(); }

    function setupPin(sec) {
        var sticky = sec.querySelector(".pin__sticky");
        var track = sec.querySelector(".pin__track");
        if (!sticky || !track) return;

        var bar = sec.querySelector("[data-hud-bar]");
        var num = sec.querySelector("[data-hud-num]");
        var panels = track.children;
        var count = panels.length;

        var on = false, distance = 0, stickyTop = 0, vh = 0;
        var dragging = false, locked = false;
        var startX = 0, startY = 0, startScroll = 0, moved = 0;
        var lastIdx = -1;

        function measure() {
            vh = w.innerHeight;
            on = !isOff();

            if (!on) {
                sec.style.height = "";
                track.style.transform = "";
                if (bar) bar.style.width = "0%";
                return;
            }

            /* offsetWidth already includes the track's inline padding, so
               the travel needed is simply content width minus the viewport */
            var contentW = Math.max(track.offsetWidth, track.scrollWidth);
            distance = Math.max(0, contentW - vw());
            stickyTop = sticky.offsetTop;

            if (distance < 2) {
                sec.style.height = "";
                return;
            }

            sec.style.height = (stickyTop + vh + distance) + "px";
        }

        function vw() { return w.innerWidth; }

        function update() {
            if (!on || distance < 2) return;

            var top = sec.getBoundingClientRect().top;
            var p = AA.clamp((-stickyTop - top) / distance, 0, 1);

            track.style.transform = "translate3d(" + (-p * distance).toFixed(2) + "px,0,0)";

            if (bar) bar.style.width = (p * 100).toFixed(2) + "%";

            if (num) {
                var idx = count > 1 ? Math.round(p * (count - 1)) : 0;
                if (idx !== lastIdx) {
                    lastIdx = idx;
                    num.textContent = String(idx + 1).padStart(2, "0");
                }
            }
        }

        /* ---- drag: horizontal intent only, never blocks page scroll ----
           The band is driven by page scroll, so a drag converts horizontal
           movement into vertical scroll. That keeps a single source of truth
           (update()) and makes the dragged position stick after release. */
        track.addEventListener("pointerdown", function (e) {
            if (!on || distance < 2 || e.pointerType === "touch") return;
            if (e.target.closest("a, button")) return;
            /* Cards are draggable too — a real drag (>8px) swallows the click
               in endDrag, so opening the case study still works on a tap. */

            dragging = true; locked = false; moved = 0;
            startX = e.clientX; startY = e.clientY;
            startScroll = w.scrollY;
        });

        track.addEventListener("pointermove", function (e) {
            if (!dragging) return;

            var dx = e.clientX - startX;
            var dy = e.clientY - startY;

            if (!locked) {
                if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
                if (Math.abs(dx) < 8) return;
                locked = true;
                try { track.setPointerCapture(e.pointerId); } catch (err) { }
            }

            moved = Math.abs(dx);
            w.scrollTo({ top: startScroll - dx, left: 0, behavior: "instant" });
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;

            if (locked) {
                try { track.releasePointerCapture(e.pointerId); } catch (err) { }
            }

            /* suppress the click that follows a real drag */
            if (moved > 8) {
                var swallow = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
                track.addEventListener("click", swallow, { capture: true, once: true });
                setTimeout(function () {
                    track.removeEventListener("click", swallow, { capture: true });
                }, 120);
            }
        }

        track.addEventListener("pointerup", endDrag);
        track.addEventListener("pointercancel", endDrag);

        AA.onFrame(update);

        /* re-measure when layout can move: resize, font load, image load */
        var t = null;
        w.addEventListener("resize", function () {
            clearTimeout(t);
            t = setTimeout(measure, 160);
        }, { passive: true });

        w.addEventListener("load", measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

        measure();
    }

    function boot() {
        var pins = [].slice.call(document.querySelectorAll("[data-pin]"));
        pins.forEach(setupPin);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window);
