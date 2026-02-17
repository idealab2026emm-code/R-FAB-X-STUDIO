// ============================================
// PROFILE PAGE JAVASCRIPT
// ============================================

// ============================================
// LOAD PROFILE ON PAGE LOAD
// ============================================

window.addEventListener("load", function () {
  initializePage();
});

function initializePage() {
  // Check authentication
  const user = localStorage.getItem("user");
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load profile data
  loadProfile();
}

// ============================================
// LOAD PROFILE DATA
// ============================================

async function loadProfile() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("=== LOADING USER PROFILE ===");
    console.log("User data:", user);

    // ACCOUNT INFO - username
    document.getElementById("accountUsername").textContent = user.username || "--";
    console.log("✓ username → Account Info Section:", user.username);

    // PROFILE HEADER - fullname
    document.getElementById("profileName").textContent = user.fullname || user.name || user.username;
    console.log("✓ fullname → Profile Header:", user.fullname);

    document.getElementById("profileEmail").textContent = user.username || "--";

    // FETCH FROM SERVER
    try {
      const response = await fetch(
        `/profile/${user.username}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Data from server:", data);

        // mail → Email
        const mail = data.mail || user.mail || user.email || "--";
        document.getElementById("displayEmail").textContent = mail;
        console.log("✓ mail → Email Display:", mail);

        // rollno → Roll Number
        const rollno = data.rollno || user.rollno || user.roll_number || "--";
        document.getElementById("displayRollNo").textContent = rollno;
        console.log("✓ rollno → Roll Number Display:", rollno);

        // department → Department
        const department = data.department || user.department || "--";
        document.getElementById("displayDepartment").textContent = department;
        console.log("✓ department → Department Display:", department);

        // Update localStorage
        user.mail = mail;
        user.rollno = rollno;
        user.department = department;
        localStorage.setItem("user", JSON.stringify(user));
        console.log("=== PROFILE LOADED ===");

      } else {
        console.warn("Server status:", response.status);
        setFallbackValues(user);
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setFallbackValues(user);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

function setFallbackValues(user) {
  console.log("Using fallback values from localStorage");

  // mail → Email
  const mail = user.mail || user.email || "--";
  document.getElementById("displayEmail").textContent = mail;
  console.log("✓ mail → Email Display (fallback):", mail);

  // rollno → Roll Number
  const rollno = user.rollno || user.roll_number || "--";
  document.getElementById("displayRollNo").textContent = rollno;
  console.log("✓ rollno → Roll Number Display (fallback):", rollno);

  // department → Department
  const department = user.department || "--";
  document.getElementById("displayDepartment").textContent = department;
  console.log("✓ department → Department Display (fallback):", department);
}

// ============================================
// UPDATE PROFILE
// ============================================

// ============================================
// FORM SUBMISSION
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  // Profile form removed - no editing functionality
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", function (e) {
  // Alt+B - Back to home
  if (e.altKey && e.key === "b") {
    e.preventDefault();
    window.location.href = "userhome.html";
  }
});

// ============================================
// CONSOLE MESSAGES
// ============================================

console.log(
  "%c👤 PROFILE PAGE DATA MAPPING",
  "color: #0066ff; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c📋 Database Fields → Display Locations:\n" +
  "   mail → Email (User Info Display)\n" +
  "   rollno → Roll Number (User Info Display)\n" +
  "   department → Department (User Info Display)\n" +
  "   fullname → Full Name (Profile Header)\n" +
  "   username → Username (Account Info)\n\n" +
  "⌨️ Keyboard: Alt+B - Back to Home",
  "color: #10b981; font-size: 12px; font-family: monospace;"
);