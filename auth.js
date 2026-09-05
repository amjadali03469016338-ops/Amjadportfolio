/* =========================================================
   AMJAD PORTFOLIO
   AUTH SYSTEM
   REGISTER + LOGIN + PERSISTENT SESSION
========================================================= */


/* =========================================================
   SETTINGS
========================================================= */

const USERS_KEY = "AMJAD_USERS";
const SESSION_KEY = "AMJAD_SESSION";


/* =========================================================
   REGISTER
========================================================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const name = document
            .getElementById("registerName")
            .value
            .trim();

        const email = document
            .getElementById("registerEmail")
            .value
            .trim()
            .toLowerCase();

        const password = document
            .getElementById("registerPassword")
            .value;

        const confirmPassword = document
            .getElementById("confirmPassword")
            .value;

        const terms = document
            .getElementById("terms")
            .checked;

        const message =
            document.getElementById("registerMessage");


        /* -----------------------------------------
           NAME
        ----------------------------------------- */

        if (!name) {

            showMessage(
                message,
                "Please enter your full name.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           EMAIL
        ----------------------------------------- */

        if (!email) {

            showMessage(
                message,
                "Please enter your email.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           PASSWORD
        ----------------------------------------- */

        if (password.length < 6) {

            showMessage(
                message,
                "Password must be at least 6 characters.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           CONFIRM PASSWORD
        ----------------------------------------- */

        if (password !== confirmPassword) {

            showMessage(
                message,
                "Passwords do not match.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           TERMS
        ----------------------------------------- */

        if (!terms) {

            showMessage(
                message,
                "Please agree to the terms and conditions.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           GET USERS
        ----------------------------------------- */

        let users = [];

        try {

            users = JSON.parse(
                localStorage.getItem(USERS_KEY) || "[]"
            );

        } catch (error) {

            users = [];

        }


        /* -----------------------------------------
           CHECK EXISTING EMAIL
        ----------------------------------------- */

        const existingUser = users.find(function (user) {

            return user.email === email;

        });


        if (existingUser) {

            showMessage(
                message,
                "This email is already registered.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           CREATE USER
        ----------------------------------------- */

        const newUser = {

            id: Date.now(),

            name: name,

            email: email,

            password: password

        };


        users.push(newUser);


        /* -----------------------------------------
           SAVE USER
        ----------------------------------------- */

        localStorage.setItem(
            USERS_KEY,
            JSON.stringify(users)
        );


        /* -----------------------------------------
           SUCCESS
        ----------------------------------------- */

        showMessage(
            message,
            "Account created successfully! Redirecting...",
            "success"
        );


        registerForm.reset();


        /* -----------------------------------------
           GO TO LOGIN
        ----------------------------------------- */

        setTimeout(function () {

            window.location.href = "login.html";

        }, 1200);

    });

}


/* =========================================================
   LOGIN
========================================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const email = document
            .getElementById("loginEmail")
            .value
            .trim()
            .toLowerCase();


        const password = document
            .getElementById("loginPassword")
            .value;


        const message =
            document.getElementById("loginMessage");


        /* -----------------------------------------
           GET USERS
        ----------------------------------------- */

        let users = [];

        try {

            users = JSON.parse(
                localStorage.getItem(USERS_KEY) || "[]"
            );

        } catch (error) {

            users = [];

        }


        /* -----------------------------------------
           FIND USER
        ----------------------------------------- */

        const user = users.find(function (account) {

            return (
                account.email === email &&
                account.password === password
            );

        });


        /* -----------------------------------------
           INVALID LOGIN
        ----------------------------------------- */

        if (!user) {

            showMessage(
                message,
                "Invalid email or password.",
                "error"
            );

            return;
        }


        /* -----------------------------------------
           CREATE SESSION
        ----------------------------------------- */

        const session = {

            userId: user.id,

            name: user.name,

            email: user.email,

            loginTime: Date.now()

        };


        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );


        /* -----------------------------------------
           SUCCESS
        ----------------------------------------- */

        showMessage(
            message,
            "Login successful! Opening portfolio...",
            "success"
        );


        /* -----------------------------------------
           OPEN PORTFOLIO
        ----------------------------------------- */

        setTimeout(function () {

            window.location.href = "index.html";

        }, 700);

    });

}


/* =========================================================
   CHECK SESSION
========================================================= */

function getSession() {

    try {

        return JSON.parse(
            localStorage.getItem(SESSION_KEY) || "null"
        );

    } catch (error) {

        return null;

    }

}


/* =========================================================
   PROTECT PORTFOLIO
========================================================= */

function protectPortfolio() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    /* -----------------------------------------
       LOGIN + REGISTER ARE PUBLIC
    ----------------------------------------- */

    if (
        currentPage === "login.html" ||
        currentPage === "register.html"
    ) {

        return;

    }


    /* -----------------------------------------
       GET SESSION
    ----------------------------------------- */

    const session = getSession();


    /* -----------------------------------------
       NO LOGIN
    ----------------------------------------- */

    if (!session) {

        window.location.href = "login.html";

        return;
    }



}



/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    element,
    text,
    type
) {

    if (!element) {

        return;
    }


    element.textContent = text;


    element.classList.remove(
        "success",
        "error"
    );


    element.classList.add(
        type
    );

}


/* =========================================================
   START AUTH SYSTEM
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        protectPortfolio();

    }
);