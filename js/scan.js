// ============================================
// SCAN PAGE JAVASCRIPT
// Modern QR scanning with client-side search
// ============================================

let html5QrCode = null;
let isScannerActive = false;
let currentMaterial = null;
let allMaterialsCache = null; // Cache for all materials

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener("load", function () {
  initializePage();
});

function initializePage() {
  // Check authentication
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Setup search functionality
  setupSearch();

  // Initialize QR code scanner
  initializeQRScanner();

  // Load all materials on page load for client-side search
  loadAllMaterials();
}

// ============================================
// LOAD ALL MATERIALS (for client-side search)
// ============================================

async function loadAllMaterials() {
  try {
    const response = await fetch(`/materials`);
    if (response.ok) {
      allMaterialsCache = await response.json();
      console.log(`✓ Loaded ${allMaterialsCache.length} materials for search`);
      console.log('📋 Sample material:', allMaterialsCache[0]);
    }
  } catch (error) {
    console.error("Error loading materials:", error);
  }
}

// ============================================
// QR SCANNER INITIALIZATION
// ============================================

function initializeQRScanner() {
  try {
    html5QrCode = new Html5Qrcode("reader");
    console.log("✓ QR Code scanner initialized successfully");
  } catch (error) {
    console.error("Error initializing QR scanner:", error);
    alert("Error initializing QR scanner. Please refresh the page.");
  }
}

function startScanner() {
  const startBtn = document.getElementById("startScanBtn");
  const stopBtn = document.getElementById("stopScanBtn");

  if (isScannerActive) {
    console.warn("⚠️ Scanner already active");
    return;
  }

  console.log("📱 Starting QR scanner...");
  startBtn.style.display = "none";
  stopBtn.style.display = "flex";
  isScannerActive = true;
  updateScanStatus("Scanning...", true);

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
  };

  html5QrCode
    .start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        console.log("✓ QR Code detected:", decodedText);
        // Stop scanner immediately
        if (isScannerActive) {
          isScannerActive = false;
          try {
            await html5QrCode.stop();
            console.log("✓ Scanner stopped after detection");
          } catch (e) {
            console.error("Error stopping scanner after detection:", e);
          }
        }
        // Process the material
        await handleScannedCode(decodedText);
      },
      (error) => {
        // Ignore - normal scanning errors
      }
    )
    .catch((err) => {
      console.error("❌ Camera error:", err);
      alert("Camera access denied! Please allow camera access and try again.");
      isScannerActive = false;
      startBtn.style.display = "flex";
      stopBtn.style.display = "none";
      updateScanStatus("Camera error", false);
    });
}

function stopScanner() {
  console.log("🛑 Stop button clicked - isScannerActive:", isScannerActive);

  const startBtn = document.getElementById("startScanBtn");
  const stopBtn = document.getElementById("stopScanBtn");

  if (!isScannerActive) {
    console.log("⚠️ Scanner not active, nothing to stop");
    startBtn.style.display = "flex";
    stopBtn.style.display = "none";
    return;
  }

  isScannerActive = false;
  console.log("⏹️ Marked scanner as inactive");

  startBtn.style.display = "flex";
  stopBtn.style.display = "none";
  updateScanStatus("Ready to scan", false);

  if (html5QrCode) {
    html5QrCode
      .stop()
      .then(() => {
        console.log("✓ Scanner stopped successfully");
      })
      .catch((err) => {
        console.error("⚠️ Error stopping scanner:", err);
      });
  } else {
    console.log("⚠️ Scanner not initialized");
  }
}

// ============================================
// HANDLE SCANNED CODE
// ============================================

async function handleScannedCode(code) {
  updateScanStatus("Loading material...", true);
  console.log(`🔍 Fetching material for code: "${code}"`);

  try {
    // Use encodeURIComponent to handle special characters in the code
    const response = await fetch(`/materials/${encodeURIComponent(code)}`);

    if (!response.ok) {
      showError(
        "Material Not Found",
        `The code "${code}" does not exist in the system.`
      );
      updateScanStatus("Material not found", false);
      return;
    }

    const material = await response.json();
    console.log('✅ Fetched material details:', material);
    displayMaterialDetails(material);
    updateScanStatus("Material loaded - Ready to process", false);
  } catch (error) {
    console.error("Error fetching material:", error);
    showError(
      "Server Error",
      "Unable to connect to server. Please try again."
    );
    updateScanStatus("Server error", false);
  }
}

// ============================================
// SEARCH SETUP
// ============================================

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  if (!searchInput) {
    console.error("❌ Search input not found! ID: searchInput");
    return;
  }

  if (!searchResults) {
    console.error("❌ Search results container not found! ID: searchResults");
    return;
  }

  console.log("✅ Search elements found, setting up listeners");

  searchInput.addEventListener("input", function () {
    const query = this.value.trim();
    console.log("🔍 Search input changed:", query);

    if (query.length < 1) {
      searchResults.classList.remove("show");
      return;
    }

    // Search immediately on any input
    performSearch(query);
  });

  searchInput.addEventListener("focus", function () {
    // Show results if there's content when focused
    if (this.value.trim().length > 0) {
      searchResults.classList.add("show");
    }
  });

  // Close search results when clicking outside
  document.addEventListener("click", function (e) {
    const searchSection = document.querySelector(".search-box-container");
    if (searchSection && !searchSection.contains(e.target)) {
      searchResults.classList.remove("show");
    }
  });

  // Keep search results visible when clicking on them
  searchResults.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  console.log("✅ Search setup complete");
}

// ============================================
// PERFORM SEARCH (Client-side + Backend)
// ============================================

async function performSearch(query) {
  try {
    updateScanStatus("Searching...", true);
    const resultsContainer = document.getElementById("searchResults");

    console.log(`🔍 Searching for: "${query}"`);

    let codeMatches = [];
    let nameMatches = [];

    // SEARCH BY CODE - Always try to get exact code from backend
    try {
      const codeResponse = await fetch(
        `/materials/${encodeURIComponent(query)}`
      );

      if (codeResponse.ok) {
        const material = await codeResponse.json();
        codeMatches.push(material);
        console.log(`✓ Found 1 exact code match`);
      }
    } catch (e) {
      console.log("Exact code search failed, continuing...");
    }

    // SEARCH BY NAME - Client-side search from cached materials
    if (allMaterialsCache && allMaterialsCache.length > 0) {
      nameMatches = allMaterialsCache.filter(mat => {
        // Get field values with fallbacks
        const materialName = mat.material_name || mat.item_name || '';
        const materialCode = mat.material_code || mat.item_code || '';

        const nameMatch = materialName.toLowerCase().includes(query.toLowerCase());
        const codeMatch = materialCode.toLowerCase().includes(query.toLowerCase());

        // Exclude exact code matches from name matches to avoid duplicates
        const isExactCodeMatch = codeMatches.some(c => {
          const cCode = c.material_code || c.item_code || '';
          const matCode = mat.material_code || mat.item_code || '';
          return cCode === matCode;
        });

        return (nameMatch || codeMatch) && !isExactCodeMatch;
      });

      if (nameMatches.length > 0) {
        console.log(`✓ Found ${nameMatches.length} name/code match(es)`);
      }
    } else {
      // If cache is empty, try to load materials first
      if (!allMaterialsCache) {
        await loadAllMaterials();
        if (allMaterialsCache && allMaterialsCache.length > 0) {
          nameMatches = allMaterialsCache.filter(mat => {
            const materialName = mat.material_name || mat.item_name || '';
            const materialCode = mat.material_code || mat.item_code || '';
            const nameMatch = materialName.toLowerCase().includes(query.toLowerCase());
            const codeMatch = materialCode.toLowerCase().includes(query.toLowerCase());
            const isExactCodeMatch = codeMatches.some(c => {
              const cCode = c.material_code || c.item_code || '';
              const matCode = mat.material_code || mat.item_code || '';
              return cCode === matCode;
            });
            return (nameMatch || codeMatch) && !isExactCodeMatch;
          });
        }
      }
    }

    // Combine all results
    const allResults = [...codeMatches, ...nameMatches];

    // Display results
    if (allResults.length === 0) {
      resultsContainer.innerHTML =
        '<div style="padding: 16px; text-align: center; color: #999;"><i class="fas fa-search"></i> No materials found</div>';
      resultsContainer.classList.add("show");
      updateScanStatus("No results found", false);
      return;
    }

    // Highlight matching words in results
    const highlightQuery = (text, query) => {
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark style="background-color: #fff3cd; color: #000; font-weight: 600;">$1</mark>');
    };

    // Build HTML with TWO SECTIONS
    let html = '';

    // SECTION 1: EXACT CODE MATCHES
    if (codeMatches.length > 0) {
      html += '<div style="padding: 8px 16px; background: #dbe6ff; font-weight: 600; color: #0066ff; font-size: 12px; border-bottom: 2px solid #0066ff; text-transform: uppercase;"><i class="fas fa-barcode"></i> Matching Code (Exact)</div>';
      html += codeMatches.map(mat => {
        const matName = mat.material_name || mat.item_name || '-';
        const matCode = mat.material_code || mat.item_code || '-';
        const availQty = mat.available_qty || mat.available_quantity || 0;

        return `
        <div class="search-result-item" onclick="selectSearchResult('${matCode}')">
          <div class="result-name">
            <i class="fas fa-barcode"></i> ${highlightQuery(matName, query)}
          </div>
          <div class="result-code">
            Code: ${highlightQuery(matCode, query)} | Available: <strong>${availQty}</strong>
          </div>
        </div>
      `;
      }).join('');
    }

    // SECTION 2: NAME/CODE MATCHES
    if (nameMatches.length > 0) {
      html += '<div style="padding: 8px 16px; background: #f0f4ff; font-weight: 600; color: #0066ff; font-size: 12px; border-bottom: 2px solid #0066ff; text-transform: uppercase;"><i class="fas fa-search"></i> Matching Name</div>';
      html += nameMatches.map(mat => {
        const matName = mat.material_name || mat.item_name || '-';
        const matCode = mat.material_code || mat.item_code || '-';
        const availQty = mat.available_qty || mat.available_quantity || 0;

        return `
        <div class="search-result-item" onclick="selectSearchResult('${matCode}')">
          <div class="result-name">
            <i class="fas fa-box"></i> ${highlightQuery(matName, query)}
          </div>
          <div class="result-code">
            Code: ${highlightQuery(matCode, query)} | Available: <strong>${availQty}</strong>
          </div>
        </div>
      `;
      }).join('');
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add("show");
    updateScanStatus(`Found ${allResults.length} material(s)`, false);
    console.log(`✓ Displaying ${codeMatches.length} code match(es) + ${nameMatches.length} name match(es)`);

  } catch (error) {
    console.error("Search error:", error);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML =
      '<div style="padding: 16px; text-align: center; color: #d32f2f;"><i class="fas fa-exclamation-circle"></i> Search error</div>';
    resultsContainer.classList.add("show");
    updateScanStatus("Ready to scan", false);
  }
}

async function selectSearchResult(itemCode) {
  const searchResults = document.getElementById("searchResults");

  updateScanStatus("Loading material...", true);

  try {
    const response = await fetch(`/materials/${itemCode}`);

    if (!response.ok) {
      showError("Material Not Found", "Unable to load material details.");
      updateScanStatus("Error loading material", false);
      return;
    }

    const material = await response.json();
    displayMaterialDetails(material);
    updateScanStatus("Material loaded - Ready to process", false);

    // Hide search results after selection
    setTimeout(() => {
      searchResults.classList.remove("show");
    }, 300);
  } catch (error) {
    console.error("Error fetching material:", error);
    showError("Server Error", "Unable to connect to server.");
    updateScanStatus("Server error", false);
  }
}

// ============================================
// DISPLAY MATERIAL DETAILS
// ============================================

function displayMaterialDetails(material) {
  if (!material) return;
  currentMaterial = material;

  // Get field values with fallbacks for different database column names
  // Priority: actual column names from lab_inventory
  const materialName = material.material_name || material.item_name || 'Unnamed Material';
  const materialCode = material.material_code || material.item_code || 'No Code';
  const totalQty = material.balance !== undefined ? material.balance : (material.total_qty || 0);
  const availableQty = material.available_quantity !== undefined ? material.available_quantity : (material.available_qty || 0);

  console.log('📋 Updating UI with material:', {
    name: materialName,
    code: materialCode,
    total: totalQty,
    available: availableQty
  });

  // Update DOM elements
  const nameEl = document.getElementById("materialName");
  const codeEl = document.getElementById("itemCode");
  const totalEl = document.getElementById("totalQty");
  const availEl = document.getElementById("availableQty");

  if (nameEl) nameEl.textContent = materialName;
  if (codeEl) codeEl.textContent = materialCode;
  if (totalEl) totalEl.textContent = totalQty;
  if (availEl) {
    availEl.textContent = availableQty;
    availEl.className = availableQty > 0 ? "info-value available" : "info-value out-of-stock";
  }

  // Reset quantity to 1
  const qtyInput = document.getElementById("quantityInput");
  if (qtyInput) {
    qtyInput.value = "1";
    qtyInput.max = availableQty || 999;
  }

  // Hide error container and show details
  const errorCont = document.getElementById("errorContainer");
  const detailsCont = document.getElementById("detailsContainer");

  if (errorCont) errorCont.style.display = "none";
  if (detailsCont) detailsCont.style.display = "block";

  // Focus on quantity input
  setTimeout(() => {
    if (qtyInput) qtyInput.focus();
  }, 100);
}

// ============================================
// QUANTITY MANAGEMENT
// ============================================

function increaseQuantity() {
  const input = document.getElementById("quantityInput");
  const currentValue = parseInt(input.value) || 1;
  const maxValue = parseInt(input.max) || 999;

  if (currentValue < maxValue) {
    input.value = currentValue + 1;
  }
}

function decreaseQuantity() {
  const input = document.getElementById("quantityInput");
  const currentValue = parseInt(input.value) || 1;

  if (currentValue > 1) {
    input.value = currentValue - 1;
  }
}

// ============================================
// CHECKOUT & CHECKIN
// ============================================

async function checkout() {
  if (!currentMaterial) {
    alert("No material selected");
    return;
  }

  const quantity = parseInt(document.getElementById("quantityInput").value) || 1;
  const user = getCurrentUser();

  // Get available quantity with fallback
  // Ensure we parse as integer to avoid string comparison issues
  const availableQty = parseInt(currentMaterial.available_qty || currentMaterial.available_quantity || 0);
  const materialName = currentMaterial.material_name || currentMaterial.item_name || 'material';
  const materialCode = currentMaterial.material_code || currentMaterial.item_code || '';

  // Validation 1: Check if item is out of stock
  if (availableQty <= 0) {
    alert(`Item is out of stock! (Available: 0)`);
    return;
  }

  // Validation 2: Check if requested quantity is available
  // LIMIT IS AVAILABLE QUANTITY
  if (quantity > availableQty) {
    alert(`Cannot checkout ${quantity}. Only ${availableQty} available.`);
    return;
  }

  try {
    const response = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        material_code: materialCode,
        quantity: quantity,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess(
        "Checkout Successful",
        `${quantity} unit(s) of "${materialName}" checked out`
      );
      // Refresh cache to update available quantity for search
      loadAllMaterials();

      setTimeout(() => {
        scanAgain();
      }, 1500);
    } else {
      alert(data.message || "Checkout failed");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Error during checkout. Please try again.");
  }
}

async function checkin() {
  if (!currentMaterial) {
    alert("No material selected");
    return;
  }

  const quantity = parseInt(document.getElementById("quantityInput").value) || 1;
  const user = getCurrentUser();

  const materialName = currentMaterial.material_name || currentMaterial.item_name || 'material';
  const materialCode = currentMaterial.material_code || currentMaterial.item_code || '';

  try {
    // STEP 1: Check how much this user has borrowed (and not yet returned)
    console.log(`🔍 Checking borrowed quantity for user: ${user.username}, material: ${materialCode}`);

    const borrowResponse = await fetch(
      `/api/user-borrowed-quantity?username=${encodeURIComponent(user.username)}&material_code=${encodeURIComponent(materialCode)}`
    );

    if (!borrowResponse.ok) {
      alert("Error checking your borrow history. Please try again.");
      return;
    }

    const borrowData = await borrowResponse.json();
    console.log('📊 Borrow history:', borrowData);

    const { borrowed, returned, outstanding } = borrowData;

    // VALIDATION: User can only return what they have outstanding
    if (outstanding <= 0) {
      // Case 1: User never borrowed this item
      if (borrowed === 0) {
        alert(`You cannot check in "${materialName}".\n\nYou have not borrowed any units of this item.\n\nYour history:\n• Total borrowed: 0\n• Already returned: 0\n• Outstanding: 0`);
        return;
      }

      // Case 2: User has already returned everything
      alert(`You cannot check in "${materialName}".\n\nYou have already returned all items you borrowed.\n\nYour history:\n• Total borrowed: ${borrowed}\n• Already returned: ${returned}\n• Outstanding: 0`);
      return;
    }

    if (quantity > outstanding) {
      alert(`You cannot check in ${quantity} unit(s) of "${materialName}".\n\nYour borrow history:\n• Total borrowed: ${borrowed}\n• Already returned: ${returned}\n• Still outstanding: ${outstanding}\n\nYou can only return up to ${outstanding} unit(s).`);
      return;
    }

    console.log(`✓ Validation passed: User can return ${quantity} out of ${outstanding} outstanding`);

    // STEP 2: Proceed with check-in
    const response = await fetch("/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        material_code: materialCode,
        quantity: quantity,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess(
        "Check-in Successful",
        `${quantity} unit(s) of "${materialName}" checked in`
      );
      // Refresh cache to update available quantity for search
      loadAllMaterials();

      setTimeout(() => {
        scanAgain();
      }, 1500);
    } else {
      alert(data.message || "Check-in failed");
    }
  } catch (error) {
    console.error("Check-in error:", error);
    alert("Error during check-in. Please try again.");
  }
}


// ============================================
// ERROR & SUCCESS DISPLAY
// ============================================

function showError(title, message) {
  document.getElementById("errorContainer").style.display = "block";
  document.getElementById("detailsContainer").style.display = "none";
  document.getElementById("errorMessage").textContent = message;

  const errorCard = document.querySelector(".error-card");
  if (errorCard) {
    errorCard.querySelector("h3").textContent = title;
  }
}

function showSuccess(title, message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    max-width: 400px;
  `;

  notification.innerHTML = `
    <h4 style="margin: 0 0 4px 0; font-size: 16px;">✓ ${title}</h4>
    <p style="margin: 0; font-size: 14px;">${message}</p>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ============================================
// CLEAR & RESET
// ============================================

function clearDetails() {
  document.getElementById("detailsContainer").style.display = "none";
  document.getElementById("errorContainer").style.display = "none";
  currentMaterial = null;

  if (!isScannerActive) {
    document.getElementById("startScanBtn").style.display = "flex";
    document.getElementById("stopScanBtn").style.display = "none";
  }
}

function scanAgain() {
  clearDetails();
  document.getElementById("searchInput").value = "";

  // Reset to initial state - DO NOT AUTO START SCANNER
  const startBtn = document.getElementById("startScanBtn");
  const stopBtn = document.getElementById("stopScanBtn");

  if (isScannerActive) {
    console.log("⏹️ Stopping active scanner before reset");
    stopScanner();
  }

  // Ensure Start button is visible
  startBtn.style.display = "flex";
  stopBtn.style.display = "none";
  updateScanStatus("Ready to scan", false);
}

// ============================================
// STATUS UPDATE
// ============================================

function updateScanStatus(message, isLoading = false) {
  const statusEl = document.getElementById("scanStatus");
  statusEl.innerHTML = `
    ${isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-check-circle"></i>'}
    ${message}
  `;
}

// ============================================
// UTILITIES
// ============================================

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", function (e) {
  if (e.altKey && e.key === "s") {
    e.preventDefault();
    if (!isScannerActive) {
      startScanner();
    }
  }

  if (e.altKey && e.key === "q") {
    e.preventDefault();
    document.getElementById("quantityInput").focus();
  }

  if (e.altKey && e.key === "c") {
    e.preventDefault();
    checkout();
  }

  if (e.altKey && e.key === "i") {
    e.preventDefault();
    checkin();
  }

  if (e.altKey && e.key === "r") {
    e.preventDefault();
    scanAgain();
  }

  if (e.altKey && e.key === "b") {
    e.preventDefault();
    window.location.href = "userhome.html";
  }
});

console.log(
  "%c📱 Scan Page Loaded",
  "color: #0066ff; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c✅ Features:\n✓ Works with both old and new database columns\n✓ Search by Item Code (Exact Match)\n✓ Search by Item Name (Client-side)\n✓ Two separate result sections\n✓ Supports: material_code/item_code, material_name/item_name, total_qty/balance, available_qty/available_quantity",
  "color: #10b981; font-size: 12px;"
);