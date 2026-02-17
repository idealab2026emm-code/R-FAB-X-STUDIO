// ============================================
// MANAGE USERS - JAVASCRIPT (FIXED)
// ============================================

let allUsers = [];
let currentEditingUser = null;

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener("load", function () {
  console.log("👥 Manage Users Page Loaded");
  initializePage();
});

function initializePage() {
  // Check authentication
  const user = localStorage.getItem("user");
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  console.log("✓ User authenticated:", JSON.parse(user).username);
  loadAllUsers();
}

// ============================================
// NAVIGATION
// ============================================

function goBack() {
  console.log("⬅️ Going back to admin dashboard");
  window.location.href = "adminhome.html";
}

// ============================================
// LOAD ALL USERS (FILTERED)
// ============================================

async function loadAllUsers() {
  console.log("📋 Loading all users from database...");
  try {
    const response = await fetch("http://localhost:5000/users");

    console.log("Response status:", response.status);
    console.log("Response type:", response.headers.get("content-type"));

    if (!response.ok) {
      console.error("Error response:", response.status);
      showError("Failed to load users. Status: " + response.status);
      return;
    }

    // Get the response text first to debug
    const text = await response.text();
    console.log("Response text (first 200 chars):", text.substring(0, 200));

    // Check if response is actually JSON
    if (!text.startsWith('{') && !text.startsWith('[')) {
      console.error("Response is not JSON:", text.substring(0, 100));
      showError("Server returned invalid response. Check server connection.");
      return;
    }

    try {
      const data = JSON.parse(text);
      console.log("Parsed data:", data);

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        showError("Invalid response format from server");
        return;
      }

      // ✅ FILTER OUT ADMIN USERS - Only show regular users
      const adminUsers = ['admin', 'admin1', 'admin2', 'administrator'];
      const regularUsers = data.filter(user => !adminUsers.includes(user.username.toLowerCase()));

      allUsers = regularUsers;

      const adminCount = data.length - allUsers.length;
      console.log(`✓ Loaded ${allUsers.length} regular users (${adminCount} admin users hidden)`);
      displayUsers(allUsers);
      showSuccess(`✓ Loaded ${allUsers.length} regular users`);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      showError("Failed to parse server response: " + parseError.message);
    }
  } catch (error) {
    console.error("❌ Error loading users:", error);
    showError("Error loading users: " + error.message);
  }
}

// ============================================
// DISPLAY USERS TABLE
// ============================================

function displayUsers(users) {
  const container = document.getElementById("usersContainer");
  const countEl = document.getElementById("userCount");

  console.log("📊 Displaying", users.length, "users");

  if (!users || users.length === 0) {
    container.innerHTML = `
      <p style="text-align: center; color: #666; padding: 40px;">
        <i class="fas fa-inbox"></i> No users found
      </p>
    `;
    countEl.textContent = "(0 users)";
    return;
  }

  countEl.textContent = `(${users.length} users)`;

  let html = `<table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: linear-gradient(135deg, #0066ff 0%, #0099ff 100%); color: white;">
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0066ff; color: white;">Username</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0066ff; color: white;">Full Name</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0066ff; color: white;">Email</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0066ff; color: white;">Roll No</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0066ff; color: white;">Department</th>
        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #0066ff; color: white;">Actions</th>
      </tr>
    </thead>
    <tbody>`;

  users.forEach((user, index) => {
    html += `
      <tr style="border-bottom: 1px solid #e0e0e0; background: #ffffff; ${index % 2 === 0 ? 'background: #ffffff;' : 'background: #f9fafb;'}">
        <td style="padding: 12px; color: #000000; font-weight: 600;">
          <i class="fas fa-user-circle" style="margin-right: 8px; color: #0066ff;"></i>
          ${escapeHtml(user.username)}
        </td>
        <td style="padding: 12px; color: #000000;">${escapeHtml(user.fullname || '--')}</td>
        <td style="padding: 12px; color: #000000;">${escapeHtml(user.mail || '--')}</td>
        <td style="padding: 12px; color: #000000;">${escapeHtml(user.rollno || '--')}</td>
        <td style="padding: 12px; color: #000000;">${escapeHtml(user.department || '--')}</td>
        <td style="padding: 12px; text-align: center;">
          <button 
            class="table-btn table-btn-edit"
            onclick="openEditModal('${escapeAttr(user.username)}')" 
            title="Edit user details"
            style="padding: 8px 12px; background: linear-gradient(135deg, #0066ff, #0099ff); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; margin-right: 5px;"
          >
            <i class="fas fa-edit"></i> Edit
          </button>
          <button 
            class="table-btn table-btn-delete"
            onclick="deleteUser('${escapeAttr(user.username)}')"
            title="Delete this user"
            style="padding: 8px 12px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;"
          >
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ============================================
// FILTER USERS (SIMPLE DOM-BASED - GUARANTEED TO WORK)
// ============================================

function filterUsers() {
  console.log("🔍 Starting search...");

  // Get search term from input box
  var searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
  console.log("📝 Search term:", searchTerm);

  // Get the table
  var table = document.querySelector('table');

  if (!table) {
    console.error("❌ Table not found in DOM!");
    alert("Error: Table element not found. Check page loaded correctly.");
    return;
  }

  // Get all rows from table body
  var tbody = table.getElementsByTagName("tbody")[0];
  if (!tbody) {
    console.error("❌ Table tbody not found!");
    return;
  }

  var rows = tbody.getElementsByTagName("tr");
  console.log("📊 Total rows in table:", rows.length);

  var matchCount = 0;
  var hideCount = 0;

  // Loop through each row and show/hide based on search
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowText = row.innerText.toLowerCase();

    // If search is empty or term matches row text, show the row
    if (searchTerm === "" || rowText.includes(searchTerm)) {
      row.style.display = "";
      matchCount++;
    } else {
      // Hide rows that don't match
      row.style.display = "none";
      hideCount++;
    }
  }

  console.log(`✅ Search complete:`);
  console.log(`   Showing: ${matchCount} rows`);
  console.log(`   Hidden: ${hideCount} rows`);
}

// ============================================
// CLEAR SEARCH
// ============================================

function clearSearch() {
  console.log("🗑️ Clearing search...");

  // Clear the search box
  document.getElementById("searchInput").value = "";

  // Show all table rows again
  var table = document.querySelector('table');
  if (table) {
    var rows = table.getElementsByTagName("tr");
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.display = "";
    }
    console.log(`✓ All ${rows.length} rows now visible`);
  }

  console.log("✓ Search cleared");
}

// ============================================
// EDIT USER MODAL
// ============================================

function openEditModal(username) {
  console.log("✏️ Opening edit modal for:", username);

  currentEditingUser = allUsers.find(u => u.username === username);

  if (!currentEditingUser) {
    console.error("User not found:", username);
    showError("User not found");
    return;
  }

  // Populate form fields
  document.getElementById("editUsername").value = currentEditingUser.username;
  document.getElementById("editPassword").value = currentEditingUser.password || "";
  document.getElementById("editFullname").value = currentEditingUser.fullname || "";
  document.getElementById("editEmail").value = currentEditingUser.mail || "";
  document.getElementById("editRollNo").value = currentEditingUser.rollno || "";
  document.getElementById("editDepartment").value = currentEditingUser.department || "";
  document.getElementById("editMessage").style.display = "none";

  // Set password field to TEXT type (visible by default)
  const passwordInput = document.getElementById("editPassword");
  const toggleButton = document.getElementById("togglePasswordBtn");

  if (passwordInput && toggleButton) {
    passwordInput.type = "text";
    toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
    toggleButton.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    console.log("✓ Password field set to visible");
  }

  // Show modal
  document.getElementById("editModal").style.display = "flex";
  console.log("✓ Edit modal opened");
}

// ============================================
// CLOSE EDIT MODAL (FIXED - REMOVED DUPLICATE)
// ============================================

function closeEditModal() {
  console.log("❌ Closing edit modal");
  const modal = document.getElementById("editModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentEditingUser = null;
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("editPassword");
  const toggleButton = document.getElementById("togglePasswordBtn");

  if (!passwordInput || !toggleButton) {
    console.error("❌ Password input or toggle button not found");
    return;
  }

  if (passwordInput.type === "text") {
    // Hide password - change to asterisks
    passwordInput.type = "password";
    toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
    toggleButton.style.background = "linear-gradient(135deg, #0066ff, #0099ff)";
    console.log("🔒 Password hidden");
  } else {
    // Show password - change to text
    passwordInput.type = "text";
    toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
    toggleButton.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    console.log("👁️ Password visible");
  }
}

// ============================================
// SAVE USER CHANGES (FULLY FIXED)
// ============================================

async function saveUserChanges() {
  const messageDiv = document.getElementById("editMessage");

  if (!currentEditingUser) {
    showMessage(messageDiv, "❌ No user selected", "error");
    return;
  }

  // Get form values
  const newUsername = document.getElementById("editUsername").value.trim();
  const password = document.getElementById("editPassword").value.trim();
  const fullname = document.getElementById("editFullname").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const rollno = document.getElementById("editRollNo").value.trim();
  const department = document.getElementById("editDepartment").value.trim();

  // Validation
  if (!newUsername || !fullname || !email || !rollno || !department) {
    showMessage(messageDiv, "❌ All fields are required", "error");
    return;
  }

  if (newUsername.length < 3) {
    showMessage(messageDiv, "❌ Username must be at least 3 characters", "error");
    return;
  }

  if (email && !isValidEmail(email)) {
    showMessage(messageDiv, "❌ Invalid email address", "error");
    return;
  }

  if (!password) {
    showMessage(messageDiv, "❌ Password is required", "error");
    return;
  }

  try {
    console.log("💾 Saving user changes");
    console.log("Old username:", currentEditingUser.username);
    console.log("New username:", newUsername);

    const oldUsername = currentEditingUser.username;
    const usernameChanged = oldUsername !== newUsername;

    if (usernameChanged) {
      console.log("🔄 Username will be changed from:", oldUsername, "to:", newUsername);
    }

    const requestBody = {
      username: newUsername,
      password: password,
      fullname: fullname,
      mail: email,
      rollno: rollno,
      department: department
    };

    console.log("📤 Sending PUT request");
    console.log("URL: http://localhost:5000/admin/users/" + oldUsername);
    console.log("Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`http://localhost:5000/admin/users/${oldUsername}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("✓ Response received");
    console.log("  Status:", response.status);
    console.log("  Status Text:", response.statusText);

    // Read response as text first
    const responseText = await response.text();
    console.log("  Body (first 300 chars):", responseText.substring(0, 300));

    // Try to parse as JSON
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
      console.log("  Parsed JSON:", result);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", parseError);
      showMessage(messageDiv, "❌ Invalid server response. Check server logs.", "error");
      return;
    }

    // Check if response is ok (status 200-299)
    if (response.ok) {
      console.log("✅ UPDATE SUCCESSFUL!");

      if (usernameChanged) {
        showMessage(messageDiv, `✅ User updated successfully! Username changed to "${newUsername}"`, "success");
      } else {
        showMessage(messageDiv, "✅ User updated successfully!", "success");
      }

      // Reload users after 1 second
      setTimeout(() => {
        closeEditModal();
        loadAllUsers();
      }, 1500);
    } else {
      // Server returned error status
      console.error("❌ Server returned error status:", response.status);
      console.error("Error response:", result);

      const errorMsg = result.message || result.error || `Server error (${response.status})`;
      showMessage(messageDiv, "❌ " + errorMsg, "error");
    }

  } catch (error) {
    console.error("❌ Network/Request error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    showMessage(messageDiv, "❌ Network error: " + error.message, "error");
  }
}

// ============================================
// DELETE USER
// ============================================

async function deleteUser(username) {
  console.log("🗑️ Delete user requested:", username);

  // Confirmation removed
  // const confirmed = confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`);

  // if (!confirmed) {
  //   console.log("❌ Delete cancelled by user");
  //   return;
  // }

  try {
    console.log("🗑️ Sending DELETE request for user:", username);

    const response = await fetch(`http://localhost:5000/admin/users/${username}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Response status:", response.status);

    // Read response text first
    const responseText = await response.text();
    console.log("Response text:", responseText);

    // Try to parse JSON
    let result = {};
    try {
      if (responseText) {
        result = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Failed to parse response as JSON", parseError);
    }

    console.log("Parsed response:", result);

    if (response.ok || response.status === 200) {
      showSuccess("✓ User deleted successfully!");
      console.log("✓ User deleted:", username);
      loadAllUsers();
    } else {
      showError("❌ " + (result.message || result.error || "Delete failed"));
      console.error("Delete error:", result);
    }
  } catch (error) {
    console.error("❌ Delete request error:", error);
    showError("Error: " + error.message);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showMessage(element, message, type) {
  if (!element) {
    console.error("Message element not found!");
    return;
  }

  console.log(`[${type.toUpperCase()}] ${message}`);
  element.textContent = message;
  element.className = `status-message ${type}`;
  element.style.display = "block";
}

function showError(message) {
  console.error("❌", message);
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
    z-index: 10000;
    animation: slideDown 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `;
  notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escapeHtml(message)}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showSuccess(message) {
  console.log("✓", message);
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
    z-index: 10000;
    animation: slideDown 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `;
  notification.innerHTML = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", function (e) {
  // Alt+B - Back to admin dashboard
  if (e.altKey && e.key === "b") {
    e.preventDefault();
    goBack();
  }

  // Escape - Close modal
  if (e.key === "Escape") {
    closeEditModal();
  }

  // Alt+S - Focus search
  if (e.altKey && e.key === "s") {
    e.preventDefault();
    document.getElementById("searchInput").focus();
  }
});

// ============================================
// CONSOLE MESSAGES
// ============================================

console.log(
  "%c👥 Manage Users Page",
  "color: #0066ff; font-size: 14px; font-weight: bold;"
);
console.log(
  "%cFeatures:\n✓ View all REGULAR users (admin users hidden)\n✓ Search users\n✓ Edit user details\n✓ Delete users\n\nShortcuts:\nAlt+B - Back\nAlt+S - Search\nEsc - Close modal",
  "color: #10b981; font-size: 12px; font-weight: bold;"
);