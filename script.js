document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    const navLinks = document.querySelectorAll(".mobile-menu a, .nav-link");

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener("click", function () {
            const isOpen = mobileMenu.classList.toggle("active");
            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });
    }

    navLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            if (mobileMenu) {
                mobileMenu.classList.remove("active");
            }
            if (menuToggle) {
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });
    });

    const sections = document.querySelectorAll("section[id]");
    const navItems = document.querySelectorAll(".nav-link");

    const highlightActiveLink = function () {
        let currentSection = "hero";

        sections.forEach(function (section) {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute("id");
            }
        });

        navItems.forEach(function (item) {
            const href = item.getAttribute("href");
            const active = href === `#${currentSection}`;
            item.classList.toggle("active", active);
        });
    };

    window.addEventListener("scroll", highlightActiveLink, { passive: true });
    highlightActiveLink();
});
