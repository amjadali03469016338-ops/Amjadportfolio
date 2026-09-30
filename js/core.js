/* ==========================================================================
   CORE — single animation loop, pointer store, capability gates,
          scroll-reveal engine and section spy.
          Everything else registers a frame callback here so the site runs
          exactly one requestAnimationFrame loop.
   ========================================================================== */
(function (w) {
    "use strict";

    var AA = w.AA = w.AA || {};

    /* ----------------------------------------------------------------------
       Capability gates — decide once, read everywhere
       ---------------------------------------------------------------------- */
    var mqReduce = w.matchMedia("(prefers-reduced-motion: reduce)");
    var mqFine = w.matchMedia("(hover: hover) and (pointer: fine)");

    AA.reduced = function () { return mqReduce.matches; };
    AA.finePointer = function () { return mqFine.matches; };

    /* Weak devices get a lighter scene rather than a janky one. */
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 4;
    AA.tier = (cores <= 4 || mem <= 4) ? "low" : "high";
    AA.isMobile = w.matchMedia("(max-width: 680px)").matches;

    AA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    AA.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* ----------------------------------------------------------------------
       Pointer store — written once on move, read every frame
       ---------------------------------------------------------------------- */
    AA.ptr = {
        x: w.innerWidth / 2,
        y: w.innerHeight / 2,
        nx: 0,          /* normalised -1..1 */
        ny: 0,
        sx: 0,          /* smoothed nx */
        sy: 0,
        active: false
    };

    w.addEventListener("pointermove", function (e) {
        var p = AA.ptr;
        p.x = e.clientX;
        p.y = e.clientY;
        p.nx = (e.clientX / w.innerWidth) * 2 - 1;
        p.ny = (e.clientY / w.innerHeight) * 2 - 1;
        p.active = true;
    }, { passive: true });

    w.addEventListener("pointerdown", function () { AA.ptr.down = true; }, { passive: true });
    w.addEventListener("pointerup", function () { AA.ptr.down = false; }, { passive: true });
    w.addEventListener("blur", function () { AA.ptr.down = false; AA.ptr.active = false; });

    /* ----------------------------------------------------------------------
       Scroll cache — listeners only write, frames only read
       ---------------------------------------------------------------------- */
    AA.scroll = { y: 0, max: 1, dir: 1, last: 0, vel: 0 };

    function measureScroll() {
        AA.scroll.max = Math.max(1, document.documentElement.scrollHeight - w.innerHeight);
    }

    w.addEventListener("scroll", function () {
        var y = w.scrollY || document.documentElement.scrollTop;
        AA.scroll.dir = y >= AA.scroll.last ? 1 : -1;
        AA.scroll.y = y;
        AA.scroll.last = y;
    }, { passive: true });

    w.addEventListener("resize", measureScroll, { passive: true });

    /* ----------------------------------------------------------------------
       Frame loop
       ---------------------------------------------------------------------- */
    var tasks = [];
    var running = false;
    var idle = false;
    var lastT = 0;

    AA.onFrame = function (fn) {
        tasks.push(fn);
        AA.start();
    };

    AA.start = function () {
        if (running) return;
        running = true;
        lastT = performance.now();
        requestAnimationFrame(tick);
    };

    AA.pause = function () { idle = true; };
    AA.resume = function () { idle = false; lastT = performance.now(); };

    function tick(t) {
        requestAnimationFrame(tick);

        if (idle || document.hidden) return;

        var dt = Math.min(48, t - lastT);
        lastT = t;

        for (var i = 0; i < tasks.length; i++) {
            try { tasks[i](dt, t); } catch (err) { /* never kill the loop */ }
        }
    }

    /* Never animate a hidden tab */
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) AA.pause(); else AA.resume();
    });

    /* ----------------------------------------------------------------------
       Scroll reveal
       ---------------------------------------------------------------------- */
    AA.observeReveals = function () {
        var items = [].slice.call(document.querySelectorAll(".reveal"));
        if (!items.length) return;

        if (!("IntersectionObserver" in w) || AA.reduced()) {
            items.forEach(function (el) { el.classList.add("is-in"); });
            return;
        }

        var pending = items.slice();

        function reveal(el) {
            el.classList.add("is-in");
            var i = pending.indexOf(el);
            if (i > -1) pending.splice(i, 1);
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                reveal(en.target);
                io.unobserve(en.target);
            });
        }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

        items.forEach(function (el) { io.observe(el); });

        /* Safety net. IntersectionObserver reports against the layout as it was
           when the frame was produced, so a late reflow (web fonts, the pinned
           sections setting their own heights, a late image decode) can leave an
           element that is plainly on screen without ever getting an entry.
           The result is permanently invisible content, which is far worse than
           a few wasted getBoundingClientRect calls, so anything that has
           reached the fold is revealed explicitly. */
        var dirty = true;

        function sweep() {
            dirty = false;
            if (!pending.length) return;
            var limit = w.innerHeight * 0.94;
            for (var i = pending.length - 1; i >= 0; i--) {
                /* Once an element has reached the fold, reveal it — even if a
                   fast scroll already carried it past. Requiring it to still be
                   on screen would leave anything the scroll stepped over
                   permanently hidden. */
                if (pending[i].getBoundingClientRect().top < limit) reveal(pending[i]);
            }
        }

        function markDirty() { dirty = true; }

        w.addEventListener("scroll", markDirty, { passive: true });
        w.addEventListener("resize", markDirty, { passive: true });

        AA.onFrame(function () {
            if (dirty) sweep();
        });

        /* one more pass once fonts and images have settled the layout */
        w.addEventListener("load", sweep);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep);
    };

    /* ----------------------------------------------------------------------
       Section spy — drives the floating navbar
       ---------------------------------------------------------------------- */
    AA.spy = function () {
        var links = [].slice.call(document.querySelectorAll(".nav__link"));
        var drawer = [].slice.call(document.querySelectorAll("[data-drawer-link]"));
        var sections = links
            .map(function (a) { return document.querySelector(a.getAttribute("href")); })
            .filter(Boolean);

        if (!sections.length) return;

        function update() {
            var y = w.scrollY + 140;
            var current = sections[0];

            for (var i = 0; i < sections.length; i++) {
                if (sections[i].offsetTop <= y) current = sections[i];
            }

            var id = "#" + current.id;

            links.forEach(function (a) {
                var on = a.getAttribute("href") === id;
                a.classList.toggle("is-active", on);
                if (on) a.setAttribute("aria-current", "true");
                else a.removeAttribute("aria-current");
            });

            drawer.forEach(function (a) {
                a.classList.toggle("is-active", a.getAttribute("href") === id);
            });

            document.getElementById("nav").classList.toggle("is-stuck", w.scrollY > 40);
        }

        AA.onFrame(update);
    };

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */
    function boot() {
        measureScroll();
        AA.observeReveals();
        AA.spy();
        AA.measure = measureScroll;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window);
