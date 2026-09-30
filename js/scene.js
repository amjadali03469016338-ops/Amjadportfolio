/* ==========================================================================
   SCENE — the atmospheric canvas and the Glass Atelier camera rig.
   The canvas is decorative depth: light pools plus depth-sorted dust.
   Pools are pre-rendered once and blitted, so no per-frame gradient work.
   ========================================================================== */
(function (w) {
    "use strict";

    var AA = w.AA;
    if (!AA) return;

    /* ======================================================================
       Atmospheric canvas
       ====================================================================== */
    function initCanvas() {
        var cv = document.getElementById("bg-canvas");
        if (!cv) return;

        var ctx = cv.getContext("2d", { alpha: true });
        if (!ctx) return;

        var dpr = Math.min(w.devicePixelRatio || 1, AA.tier === "low" ? 1.25 : 1.5);
        var W = 0, H = 0, parts = [], pools = [];
        var vw = 0, vh = 0;

        /* --- pre-rendered light pool sprites ---------------------------- */
        function makePool(px, rgb) {
            var c = document.createElement("canvas");
            c.width = c.height = px;
            var g = c.getContext("2d");
            var grad = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
            grad.addColorStop(0, "rgba(" + rgb + ",0.9)");
            grad.addColorStop(0.42, "rgba(" + rgb + ",0.24)");
            grad.addColorStop(1, "rgba(" + rgb + ",0)");
            g.fillStyle = grad;
            g.fillRect(0, 0, px, px);
            return c;
        }

        function buildPools() {
            pools = [
                { s: makePool(256, "0,229,138"), x: 0.18, y: 0.16, r: 0.72, a: 0.5, dx: 0.000013, dy: 0.000009, t: 0 },
                { s: makePool(256, "245,213,71"), x: 0.84, y: 0.34, r: 0.54, a: 0.3, dx: -0.000009, dy: 0.000015, t: 1.7 },
                { s: makePool(256, "0,150,110"), x: 0.56, y: 0.9, r: 0.95, a: 0.42, dx: 0.000007, dy: -0.000011, t: 3.4 }
            ];
        }

        /* --- dust ------------------------------------------------------- */
        var TINTS = [
            "255,255,255",
            "255,255,255",
            "255,255,255",
            "0,229,138",
            "245,213,71"
        ];

        function buildParticles() {
            var area = W * H;
            var max = AA.tier === "low" ? 46 : 130;
            var n = Math.round(AA.clamp(area / 17000, 26, max));
            parts = [];

            for (var i = 0; i < n; i++) {
                parts.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.14 + Math.random() * 0.86,   /* depth 0..1 */
                    vx: (Math.random() - 0.5) * 0.14,
                    vy: -(0.03 + Math.random() * 0.16),
                    r: 0.5 + Math.random() * 1.5,
                    tint: TINTS[(Math.random() * TINTS.length) | 0]
                });
            }
        }

        function resize() {
            vw = w.innerWidth;
            vh = w.innerHeight;
            W = Math.round(vw * dpr);
            H = Math.round(vh * dpr);
            cv.width = W;
            cv.height = H;
            cv.style.width = vw + "px";
            cv.style.height = vh + "px";
            buildPools();
            buildParticles();
        }

        /* --- draw ------------------------------------------------------- */
        function draw(now) {
            var p = AA.ptr;
            var sy = AA.scroll.y;
            var nrm = AA.clamp(sy / AA.scroll.max, 0, 1);

            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = "lighter";

            /* light pools drift, and drift faster with the pointer */
            for (var i = 0; i < pools.length; i++) {
                var pl = pools[i];
                pl.t += 1;

                var cx = (pl.x + Math.sin(pl.t * pl.dx) * 0.06 + p.sx * 0.022) * W;
                var cy = ((pl.y + Math.cos(pl.t * pl.dy) * 0.05 - nrm * 0.06) * H);
                var rad = pl.r * Math.min(W, H) * 0.72;

                ctx.globalAlpha = pl.a;
                ctx.drawImage(pl.s, cx - rad, cy - rad, rad * 2, rad * 2);
            }

            /* dust */
            var par = 26 * dpr;                 /* how much scroll shifts dust */
            for (var j = 0; j < parts.length; j++) {
                var q = parts[j];
                q.x += q.vx * q.z * dpr;
                q.y += q.vy * q.z * dpr;

                if (q.y < -6) { q.y = H + 6; q.x = Math.random() * W; }
                if (q.x < -6) q.x = W + 6;
                if (q.x > W + 6) q.x = -6;

                var px = q.x + p.sx * -18 * q.z * dpr;
                var py = q.y - sy * (0.05 + q.z * 0.22);

                if (py < -10) py += H + 20;
                if (py > H + 10) py -= H + 20;

                var a = 0.06 + q.z * q.z * 0.42;

                ctx.globalAlpha = a;
                ctx.fillStyle = "rgb(" + q.tint + ")";
                ctx.beginPath();
                ctx.arc(px, py, q.r * q.z * dpr * 1.15, 0, 6.283185);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        }

        var t0 = 0;
        AA.onFrame(function (dt, now) {
            if (!t0) t0 = now;

            /* smooth the pointer once, for every consumer */
            var p = AA.ptr;
            p.sx = AA.lerp(p.sx, p.nx, 1 - Math.pow(0.001, dt / 1000));
            p.sy = AA.lerp(p.sy, p.ny, 1 - Math.pow(0.001, dt / 1000));

            draw(now);
        });

        resize();
        w.addEventListener("resize", function () { clearTimeout(resize._t); resize._t = setTimeout(resize, 180); }, { passive: true });
    }

    /* ======================================================================
       Depth-of-field parallax + mouse-driven camera scenes
       ====================================================================== */
    function initParallax() {
        var dof = document.querySelector(".atmos__dof");

        if (dof && !AA.reduced()) {
            AA.onFrame(function () {
                var y = AA.scroll.y;
                dof.style.transform =
                    "translate3d(" + (-AA.ptr.sx * 26) + "px," + (y * -0.045) + "px,0)";
            });
        }

        var scenes = [].slice.call(document.querySelectorAll("[data-mouse-scene]"));
        if (!scenes.length || AA.reduced()) return;

        scenes.forEach(function (sec) {
            var rig = sec.querySelector(".rig");

            if (rig) {
                /* Hero: a camera nudge, capped hard. Never a spin. */
                AA.onFrame(function (dt) {
                    var k = 1 - Math.pow(0.002, dt / 1000);
                    var cx = rig._cx || 0;
                    var cy = rig._cy || 0;
                    cx = AA.lerp(cx, AA.ptr.sx * 6, k);
                    cy = AA.lerp(cy, AA.ptr.sy * -4, k);
                    rig._cx = cx;
                    rig._cy = cy;
                    rig.style.setProperty("--mxr", cx.toFixed(3));
                    rig.style.setProperty("--myr", cy.toFixed(3));
                });
            }

            /* Contact: the depth planes drift with the pointer */
            if (sec.classList.contains("contact")) {
                AA.onFrame(function (dt) {
                    var k = 1 - Math.pow(0.004, dt / 1000);
                    var v = sec._px || 0;
                    v = AA.lerp(v, AA.ptr.sx, k);
                    sec._px = v;
                    sec.style.setProperty("--px", v.toFixed(3));
                });
            }
        });
    }

    function boot() {
        initCanvas();
        initParallax();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(window);
