// =========================================
// MENTORMATE - FIREBASE ROLE-BASED LOGIN
// =========================================

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const togglePassword = document.getElementById("togglePassword");

// =========================================
// DEMO ACCOUNTS
// =========================================

const demoAccounts = [
    {
        username: "admin@mentormate.com",
        role: "admin",
        dashboard: "admin-dashboard.html"
    },
    {
        username: "hod@mentormate.com",
        role: "hod",
        dashboard: "hod-dashboard.html"
    },
    {
        username: "mentor@mentormate.com",
        role: "mentor",
        dashboard: "mentor-dashboard.html"
    },
    {
        username: "mentee@mentormate.com",
        role: "mentee",
        dashboard: "mentee-dashboard.html"
    }
];

// =========================================
// SHOW / HIDE PASSWORD
// =========================================

if (togglePassword) {
    togglePassword.addEventListener("click", function () {
        const showPassword = passwordInput.type === "password";

        passwordInput.type = showPassword ? "text" : "password";

        togglePassword.innerHTML = showPassword
            ? '<i data-lucide="eye-off"></i>'
            : '<i data-lucide="eye"></i>';

        if (window.lucide) {
            lucide.createIcons();
        }
    });
}

// =========================================
// FIREBASE ROLE-BASED LOGIN
// =========================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const role = roleInput.value;

    if (!username || !password || !role) {
        alert("Please fill in all the fields.");
        return;
    }

    // Check the selected role and email.
    const account = demoAccounts.find(user =>
        user.username === username &&
        user.role === role
    );

    if (!account) {
        alert("The email address does not match the selected role.");
        return;
    }

    // Verify Firebase is loaded.
    if (!window.firebase || !firebase.auth) {
        alert("Firebase Authentication did not load. Please refresh and try again.");
        return;
    }

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        // Authenticate the user with Firebase.
        const credential = await firebase.auth()
            .signInWithEmailAndPassword(username, password);

        const user = credential.user;

        // Save login information for existing dashboard code.
        localStorage.setItem(
            "mentorMateUser",
            user.email || username
        );

        localStorage.setItem(
            "mentorMateRole",
            account.role
        );

        localStorage.setItem(
            "mentorMateUid",
            user.uid
        );

        sessionStorage.setItem(
            "mentorMateLoggedIn",
            "true"
        );

        // Redirect to the appropriate dashboard.
        window.location.href = account.dashboard;

    } catch (error) {
        console.error("Firebase login error:", error);

        let message =
            "Login failed. Please check your email and password.";

        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password" ||
            error.code === "auth/user-not-found"
        ) {
            message =
                "This account has not been created in Firebase Authentication, " +
                "or the password is incorrect. Create the account in Firebase " +
                "Authentication first, then try again.";
        } else if (error.code === "auth/invalid-email") {
            message = "Please enter a valid email address.";
        } else if (error.code === "auth/too-many-requests") {
            message = "Too many attempts. Please wait and try again.";
        }

        alert(message);

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
});

// =========================================
// INITIALISE ICONS
// =========================================

if (window.lucide) {
    lucide.createIcons();
}