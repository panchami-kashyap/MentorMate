// =========================================
// MENTORMATE - LOGIN FUNCTIONALITY
// =========================================

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");


// =========================================
// SHOW / HIDE PASSWORD
// =========================================

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.innerHTML =
            '<i data-lucide="eye-off"></i>';

    } else {

        passwordInput.type = "password";

        togglePassword.innerHTML =
            '<i data-lucide="eye"></i>';
    }

    lucide.createIcons();

});


// =========================================
// LOGIN
// =========================================

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value.trim();

    const role =
        document.getElementById("role").value;


    // Check whether all fields are filled

    if (username === "" || password === "" || role === "") {

        alert("Please fill in all the fields.");

        return;
    }


    // Demo login

    if (password !== "1234") {

        alert("Incorrect password. For this demo, use: 1234");

        return;
    }


    // Store logged-in user information

    localStorage.setItem("mentorMateUser", username);
    localStorage.setItem("mentorMateRole", role);


    // Redirect according to role

    if (role === "mentee") {

        window.location.href = "mentee-dashboard.html";

    }

    else if (role === "mentor") {

        window.location.href = "mentor-dashboard.html";

    }

    else if (role === "admin") {

        window.location.href = "admin-dashboard.html";

    }

    else if (role === "hod") {

        window.location.href = "hod-dashboard.html";

    }

});