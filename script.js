// =========================================
// MENTORMATE - FIREBASE ROLE-BASED LOGIN
// =========================================

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const togglePassword = document.getElementById("togglePassword");

// Preselect the requested portal when redirected from a dashboard.
const requestedPortal = new URLSearchParams(window.location.search)
    .get("portal");

if (
    roleInput &&
    ["mentor", "mentee", "admin", "hod"].includes(requestedPortal)
) {
    roleInput.value = requestedPortal;
}


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

// =========================================
// FIREBASE ROLE-BASED LOGIN
// =========================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const selectedRole = roleInput.value;

    if (!username || !password || !selectedRole) {
        alert("Please fill in all the fields.");
        return;
    }

    if (!window.firebase || !firebase.auth || !window.db) {
        alert("Firebase is not connected. Please refresh and try again.");
        return;
    }

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        // 1. Authenticate using Firebase Authentication
        const credential = await firebase.auth()
            .signInWithEmailAndPassword(username, password);

        const user = credential.user;

        // 2. Retrieve the trusted role from Firestore
        const userDoc = await window.db
            .collection("users")
            .doc(user.uid)
            .get();

        if (!userDoc.exists) {
            await firebase.auth().signOut();
            alert("Your role is not configured. Please contact the administrator.");
            return;
        }

        const userData = userDoc.data();
        const actualRole = userData.role;

        // 3. Map roles to dashboards
        const dashboards = {
            mentee: "mentee-profile.html",
            mentor: "mentor-dashboard.html",
            hod: "hod-dashboard.html",
            admin: "admin-dashboard.html"
        };

        if (!dashboards[actualRole]) {
            await firebase.auth().signOut();
            alert("Invalid account role. Please contact the administrator.");
            return;
        }

        // 4. Verify that the selected role matches Firestore
        if (selectedRole !== actualRole) {
            await firebase.auth().signOut();
            alert("The selected role does not match your account.");
            return;
        }

        // 5. Save login details for existing dashboard compatibility
        localStorage.setItem("mentorMateUser", user.email || username);
        localStorage.setItem("mentorMateRole", actualRole);
        localStorage.setItem("mentorMateUid", user.uid);

        sessionStorage.setItem("mentorMateLoggedIn", "true");

        // 6. Redirect to the correct dashboard
        window.location.href = dashboards[actualRole];

    } catch (error) {
        console.error("Firebase login error:", error);

        let message = "Login failed. Please check your email and password.";

        if (error.code === "auth/invalid-credential") {
            message = "Incorrect email or password.";
        } else if (error.code === "auth/invalid-email") {
            message = "Please enter a valid email address.";
        } else if (error.code === "auth/too-many-requests") {
            message = "Too many attempts. Please wait and try again.";
        } else if (error.code === "permission-denied") {
            message = "Firestore denied access. Please check the security rules.";
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