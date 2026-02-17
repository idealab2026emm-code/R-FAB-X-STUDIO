// ============================================
// STOCK PAGE JAVASCRIPT
// Auto-search as you type + Copy Item Code
// ============================================

let allMaterialsCache = null;

// ============================================
// LOAD ON PAGE LOAD
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

  // Load all materials on page load
  loadAllMaterials();
  
  // Load and display all stock
  loadStock();
  
  // Setup search event listener
  setupSearch();
}

// ============================================
// LOAD ALL MATERIALS (for search)
// ============================================

async function loadAllMaterials() {
  try {
    const response = await fetch(`http://localhost:5000/materials`);
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
// SETUP SEARCH EVENT LISTENER
// ============================================

function setupSearch() {
  const searchInput = document.getElementById("material_code");
  
  searchInput.addEventListener("input", function () {
    const query = this.value.trim();
    
    if (query.length === 0) {
      // Show all if search is empty
      loadStock();
      return;
    }
    
    // Search as you type
    performSearch(query);
  });
}

// ============================================
// PERFORM SEARCH (auto-trigger as you type)
// ============================================

async function performSearch(query) {
  const stockTable = document.getElementById("stockTable");
  const statusMessage = document.getElementById("statusMessage");

  try {
    let results = [];

    // SEARCH BY CODE (Exact Match)
    try {
      const codeResponse = await fetch(`http://localhost:5000/materials/${encodeURIComponent(query)}`);
      if (codeResponse.ok) {
        const material = await codeResponse.json();
        results.push({
          ...material,
          matchType: "code"
        });
      }
    } catch (e) {
      console.log("Code search failed, continuing...");
    }

    // SEARCH BY NAME (Client-side - partial match)
    if (allMaterialsCache && allMaterialsCache.length > 0) {
      const nameMatches = allMaterialsCache.filter(mat => {
        // Get field values with fallbacks
        const materialName = mat.material_name || mat.item_name || '';
        const materialCode = mat.material_code || mat.item_code || '';
        
        const nameMatch = materialName.toLowerCase().includes(query.toLowerCase());
        const codeMatch = materialCode.toLowerCase().includes(query.toLowerCase());
        
        // Exclude exact code matches to avoid duplicates
        const isExactCodeMatch = results.some(r => {
          const rCode = r.material_code || r.item_code || '';
          const matCode = mat.material_code || mat.item_code || '';
          return rCode === matCode;
        });
        
        return (nameMatch || codeMatch) && !isExactCodeMatch;
      });

      results = results.concat(nameMatches.map(mat => ({
        ...mat,
        matchType: "name"
      })));
    }

    // Display results
    if (results.length === 0) {
      stockTable.innerHTML = `
        <div class="no-data">
          <i class="fas fa-search"></i>
          <p>No materials found</p>
        </div>
      `;
      statusMessage.classList.remove("show");
      return;
    }

    displayTable(results);
    statusMessage.classList.remove("show");
  } catch (error) {
    console.error("Search error:", error);
    stockTable.innerHTML = `
      <div class="no-data">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error searching materials</p>
      </div>
    `;
  }
}

// ============================================
// LOAD ALL STOCK
// ============================================

async function loadStock() {
  const stockTable = document.getElementById("stockTable");
  const statusMessage = document.getElementById("statusMessage");

  // Hide status message
  statusMessage.classList.remove("show");
  statusMessage.classList.remove("error");
  statusMessage.classList.remove("success");

  try {
    const response = await fetch("http://localhost:5000/materials");

    if (!response.ok) {
      showStatus("Unable to load stock", "error");
      stockTable.innerHTML = `
        <div class="no-data">
          <i class="fas fa-inbox"></i>
          <p>Unable to load stock data</p>
        </div>
      `;
      return;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      stockTable.innerHTML = `
        <div class="no-data">
          <i class="fas fa-inbox"></i>
          <p>No materials in stock</p>
        </div>
      `;
      return;
    }

    console.log('📊 Loaded materials:', data.length);
    console.log('📋 Sample material:', data[0]);

    displayTable(data);
    showStatus(`Loaded ${data.length} materials`, "success");

    // Hide status after 2 seconds
    setTimeout(() => {
      statusMessage.classList.remove("show");
    }, 2000);
  } catch (error) {
    console.error("Error loading stock:", error);
    showStatus("Server connection error", "error");
    stockTable.innerHTML = `
      <div class="no-data">
        <i class="fas fa-exclamation-circle"></i>
        <p>Unable to connect to server</p>
      </div>
    `;
  }
}

// ============================================
// DISPLAY TABLE
// ============================================

function displayTable(data) {
  const stockTable = document.getElementById("stockTable");

  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>
            <i class="fas fa-barcode"></i> Material Code
          </th>
          <th>
            <i class="fas fa-cube"></i> Material Name
          </th>
          <th>
            <i class="fas fa-boxes"></i> Total Quantity
          </th>
          <th>
            <i class="fas fa-check-circle"></i> Available Quantity
          </th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map((item) => {
            // Get field values with fallbacks for different database column names
            const materialCode = item.material_code || item.item_code || '-';
            const materialName = item.material_name || item.item_name || '-';
            const totalQty = item.total_qty || item.balance || 0;
            const availableQty = item.available_qty || item.available_quantity || 0;
            
            return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="copyToClipboard('${materialCode}', this)" title="Click to copy">
                <strong style="color: var(--primary-blue);">${materialCode}</strong>
                <i class="fas fa-copy" style="color: var(--primary-blue); font-size: 12px; opacity: 0.7;"></i>
              </div>
            </td>
            <td>${materialName}</td>
            <td style="text-align: center; font-weight: 600;">${totalQty}</td>
            <td style="text-align: center;">
              <span style="
                color: ${availableQty > 0 ? '#10b981' : '#ef4444'};
                font-weight: 600;
              ">
                ${availableQty}
              </span>
            </td>
          </tr>
        `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  stockTable.innerHTML = tableHTML;
}

// ============================================
// COPY TO CLIPBOARD
// ============================================

function copyToClipboard(text, element) {
  // Copy to clipboard
  navigator.clipboard.writeText(text).then(() => {
    // Show feedback
    const icon = element.querySelector('i');
    
    // Change icon to checkmark
    icon.classList.remove('fa-copy');
    icon.classList.add('fa-check');
    element.style.color = '#10b981';
    
    // Show tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: #10b981;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      animation: fadeIn 0.3s ease-out;
      z-index: 1000;
      top: -35px;
      left: 50%;
      transform: translateX(-50%);
    `;
    tooltip.textContent = 'Copied!';
    element.parentElement.style.position = 'relative';
    element.parentElement.appendChild(tooltip);
    
    // Revert after 2 seconds
    setTimeout(() => {
      icon.classList.add('fa-copy');
      icon.classList.remove('fa-check');
      element.style.color = '';
      tooltip.remove();
    }, 2000);
    
    console.log(`✓ Copied: ${text}`);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}

// ============================================
// SHOW STATUS MESSAGE
// ============================================

function showStatus(message, type) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = message;
  statusMessage.classList.add("show");
  statusMessage.classList.remove("error", "success");
  statusMessage.classList.add(type);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", function (e) {
  // Alt+S - Focus search input
  if (e.altKey && e.key === "s") {
    e.preventDefault();
    document.getElementById("material_code").focus();
  }

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
  "%c📦 Stock Page Loaded",
  "color: #0066ff; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c✅ Features:\n✓ Auto-search as you type\n✓ Copy Material Code (Click to copy)\n✓ Works with both old and new database columns",
  "color: #10b981; font-size: 12px;"
);
console.log(
  "%cKeyboard shortcuts:\nAlt+S - Focus search\nAlt+B - Back",
  "color: #666; font-size: 12px;"
);