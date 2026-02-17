// ============================================
// LOGIN PAGE JAVASCRIPT
// LOGIN WITH EMAIL ONLY (from 'mail' column in database)
// ============================================

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", function () {

  // DOM Elements
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const statusMessage = document.getElementById("statusMessage");

  console.log("%c🔐 Login Page Loaded", "color: #0066ff; font-size: 14px; font-weight: bold;");
  console.log("%c✅ All DOM elements loaded successfully", "color: #10b981; font-size: 12px;");

  // Check if all elements exist
  if (!loginForm || !emailInput || !passwordInput || !togglePasswordBtn || !statusMessage) {
    console.error("❌ ERROR: Missing required DOM elements!");
    return;
  }

  // ============================================
  // PASSWORD TOGGLE
  // ============================================

  togglePasswordBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";

    const icon = togglePasswordBtn.querySelector("i");
    if (icon) {
      icon.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
    }

    console.log(isPassword ? "👁️ Password visible" : "🔒 Password hidden");
  });

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ============================================
  // FORM SUBMISSION
  // ============================================

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("\n========== LOGIN ATTEMPT ==========");

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation
    if (!email || !password) {
      console.log("❌ Empty fields detected");
      showStatus("Please fill in all fields", "error");
      return;
    }

    // Check if valid email
    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format:", email);
      showStatus("Please enter a valid email address", "error");
      emailInput.focus();
      return;
    }

    if (password.length < 1) {
      console.log("❌ Empty password");
      showStatus("Password is required", "error");
      passwordInput.focus();
      return;
    }

    console.log("✅ Validation passed");
    console.log("📧 Email:", email);

    // Perform login
    await performLogin(email, password);
  });

  // ============================================
  // LOGIN FUNCTION
  // ============================================

  async function performLogin(email, password) {
    console.log("\n📤 Sending login request...");
    console.log("   Email (mail column):", email);
    console.log("   Server: Relative Path (/login)");

    const loginButton = loginForm.querySelector(".login-button");
    const buttonText = loginButton.querySelector(".button-text");
    const originalText = buttonText.textContent;

    loginButton.disabled = true;
    buttonText.textContent = "Signing in...";
    showStatus("", "loading");

    try {
      // Build request body
      const requestBody = {
        mail: email,
        password: password
      };

      console.log("📋 Request body:", JSON.stringify(requestBody, null, 2));

      // Use relative path for production compatibility
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response received");
      console.log("   Status:", response.status);
      console.log("   Status Text:", response.statusText);

      if (response.ok) {
        const userData = await response.json();
        console.log("✅ LOGIN SUCCESSFUL!");
        console.log("   User ID:", userData.id);
        console.log("   Username:", userData.username);
        console.log("   Full Name:", userData.fullname);
        console.log("   Role:", userData.role);

        // Save user data to localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        console.log("✓ User data saved to localStorage");

        // Success message
        showStatus("✓ Login successful! Redirecting...", "success");
        buttonText.textContent = "Signed in";
        loginButton.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";

        console.log("📍 Redirecting based on role:", userData.role);

        // Redirect after delay based on user role
        setTimeout(() => {
          if (userData.role === "admin") {
            console.log("→ Redirecting to ADMIN dashboard");
            window.location.href = "adminhome.html";
          } else {
            console.log("→ Redirecting to USER dashboard");
            window.location.href = "userhome.html";
          }
        }, 1500);

      } else if (response.status === 401) {
        console.log("❌ Authentication failed: Invalid credentials");
        showStatus("✗ Invalid email or password", "error");
        passwordInput.value = "";
        passwordInput.focus();

      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        console.log("❌ Bad request:", errorData.message);
        showStatus("✗ " + (errorData.message || "Invalid request"), "error");

      } else if (response.status === 429) {
        console.log("❌ Too many login attempts");
        showStatus("✗ Too many login attempts. Please try again later", "error");

      } else if (response.status === 500) {
        console.log("❌ Server error: 500");
        showStatus("✗ Server error. Please try again later", "error");

      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("❌ Login failed - Status:", response.status);
        console.log("   Response:", errorData);
        showStatus("✗ Login failed. Please try again", "error");
      }

    } catch (error) {
      console.error("❌ Network/Fetch Error:", error);
      console.error("   Error Type:", error.name);
      console.error("   Error Message:", error.message);

      if (error.message.includes("fetch") || error.message.includes("Failed to fetch")) {
        showStatus("✗ Cannot connect to server. Is it running?", "error");
        console.error("   → Check if server is running on http://localhost:5000");
      } else {
        showStatus("✗ An error occurred. Please try again", "error");
      }

    } finally {
      loginButton.disabled = false;
      buttonText.textContent = originalText;
      loginButton.style.background = "";
    }
  }

  // ============================================
  // STATUS MESSAGE
  // ============================================

  function showStatus(message, type) {
    if (!message) {
      statusMessage.textContent = "";
      statusMessage.className = "status-message";
      return;
    }

    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (type === "error") {
      setTimeout(() => {
        statusMessage.classList.remove("show");
      }, 4000);
    }
  }

  // ============================================
  // CLEAR ERROR ON INPUT
  // ============================================

  emailInput.addEventListener("input", function () {
    if (statusMessage.classList.contains("show")) {
      statusMessage.classList.remove("show");
    }
  });

  passwordInput.addEventListener("input", function () {
    if (statusMessage.classList.contains("show")) {
      statusMessage.classList.remove("show");
    }
  });

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  emailInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      loginForm.dispatchEvent(new Event("submit"));
    }
  });

  // ============================================
  // FOCUS ON PAGE LOAD
  // ============================================

  window.addEventListener("load", function () {
    console.log("\n========== PAGE LOADED ==========");
    emailInput.focus();
    console.log("✓ Email input focused");
  });

  console.log("\n========== LOGIN SYSTEM INFO ==========");
  console.log("✅ Frontend: Email only login");
  console.log("✅ Backend: Accepts 'mail' field");
  console.log("✅ Database Column: 'mail' (not 'email')");
  console.log("✅ Server URL: http://localhost:5000");
  console.log("✅ Endpoint: POST /login");
  console.log("\n📋 Request Format:");
  console.log("   {");
  console.log('     "mail": "user@example.com",');
  console.log('     "password": "password123"');
  console.log("   }");
  console.log("\n✅ Ready for login!");

});

// ============================================
// LOGOUT FUNCTION
// ============================================

function logout() {
  console.log("🚪 Logging out...");
  localStorage.removeItem("user");
  console.log("✓ User data cleared");
  window.location.href = "login.html";
}

// ============================================
// GET CURRENT USER
// ============================================

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// ============================================
// CHECK AUTHENTICATION
// ============================================

function isAuthenticated() {
  return localStorage.getItem("user") !== null;
}