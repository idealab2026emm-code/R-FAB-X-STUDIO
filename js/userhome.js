window.addEventListener("load", function () {
  initializeDashboard();
});

function initializeDashboard() {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.role === "admin") {
    window.location.href = "adminhome.html";
    return;
  }

  // Username
  document.getElementById("userName").textContent = user.username || "User";

  // Email
  document.getElementById("userEmail").textContent = user.mail || "Not available";

  // Department
  document.getElementById("department").textContent = user.department || "General";

  // Roll No
  document.getElementById("rollno").textContent = user.rollno || "Not assigned";

  // Hours Logged (Auto Calculated)
  const timeStr = user.total_time || "00:00:00";
  document.getElementById("hoursLogged").textContent = formatHours(timeStr);
}

// Convert "HH:MM:SS" into "X.XX hrs"
function formatHours(timeStr) {
  const parts = timeStr.split(":");

  if (parts.length !== 3) return "0.00 hrs";

  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;

  const totalHours = hours + minutes / 60 + seconds / 3600;

  return totalHours.toFixed(2) + " hrs";
}

function goScan() {
  window.location.href = "scan.html";
}

function goStock() {
  window.location.href = "stock.html";
}

function goProfile() {
  window.location.href = "profile.html";
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}
