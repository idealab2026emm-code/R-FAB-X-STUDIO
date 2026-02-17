// ============================================
// STOCK BOOK PAGE JAVASCRIPT
// Complete view with ALL columns + Edit/Delete (No Category)
// ============================================

let allMaterials = [];
let currentEditId = null;

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

  // Check if user is admin
  const userData = JSON.parse(user);
  if (userData.role !== 'admin') {
    alert('Admin access required');
    window.location.href = "login.html";
    return;
  }

  // Load all materials
  loadMaterials();

  // Setup search
  setupSearch();

  // Close modal on outside click
  window.addEventListener('click', function (event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
      closeEditModal();
    }
  });
}

// ============================================
// SETUP SEARCH
// ============================================

function setupSearch() {
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', function () {
    const query = this.value.trim();
    const clearBtn = document.getElementById('searchClear');

    if (query.length > 0) {
      clearBtn.classList.remove('hidden');
      performSearch(query);
    } else {
      clearBtn.classList.add('hidden');
      displayMaterials(allMaterials);
    }
  });
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.add('hidden');
  displayMaterials(allMaterials);
}

// ============================================
// PERFORM SEARCH
// ============================================

function performSearch(query) {
  const lowerQuery = query.toLowerCase();

  const filtered = allMaterials.filter(material => {
    // Get field values with fallbacks
    const code = (material.material_code || material.item_code || '').toLowerCase();
    const name = (material.material_name || material.item_name || '').toLowerCase();

    return code.includes(lowerQuery) || name.includes(lowerQuery);
  });

  console.log(`🔍 Search "${query}": Found ${filtered.length} materials`);
  displayMaterials(filtered);
}

// ============================================
// LOAD MATERIALS
// ============================================

async function loadMaterials() {
  const stockTable = document.getElementById("stockTable");

  try {
    const response = await fetch("http://localhost:5000/materials");

    if (!response.ok) {
      stockTable.innerHTML = `
        <div class="no-data">
          <i class="fas fa-inbox"></i>
          <p>Unable to load materials</p>
        </div>
      `;
      return;
    }

    const data = await response.json();
    allMaterials = data;

    console.log('✅ Loaded materials:', data.length);
    console.log('📋 Sample material:', data[0]);

    if (!data || data.length === 0) {
      stockTable.innerHTML = `
        <div class="no-data">
          <i class="fas fa-inbox"></i>
          <p>No materials found</p>
        </div>
      `;
      return;
    }

    displayMaterials(data);
    updateStats(data);
    console.log(`✓ Loaded ${data.length} materials`);
  } catch (error) {
    console.error("Error loading materials:", error);
    stockTable.innerHTML = `
      <div class="no-data">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error connecting to server</p>
      </div>
    `;
  }
}

// ============================================
// UPDATE STATS
// ============================================

function updateStats(data) {
  const totalCount = allMaterials.length;
  const shownCount = data.length;

  // Calculate total balance
  const totalBalance = data.reduce((sum, item) => {
    const balance = item.balance || item.available_qty || item.total_qty || 0;
    return sum + balance;
  }, 0);

  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('shownCount').textContent = shownCount;
  document.getElementById('totalBalance').textContent = totalBalance;
}

// ============================================
// DISPLAY MATERIALS TABLE - NO CATEGORY COLUMN
// ============================================

function displayMaterials(data) {
  const stockTable = document.getElementById("stockTable");

  if (data.length === 0) {
    stockTable.innerHTML = `
      <div class="no-data">
        <i class="fas fa-search"></i>
        <p>No materials found matching your search</p>
      </div>
    `;
    updateStats([]);
    return;
  }

  const tableHTML = `
    <table class="stockbook-table">
      <thead>
        <tr>
          <th style="width: 10%;">Material Code</th>
          <th style="width: 15%;">Material Name</th>
          <th style="width: 10%;">Material Type</th>
          <th style="width: 13%;">Supplier Address</th>
          <th style="width: 8%;">Bill No/Invoice</th>
          <th style="width: 7%;">Opening Balance</th>
          <th style="width: 7%;">Qty Received</th>
          <th style="width: 7%;">Qty Issued</th>
          <th style="width: 7%;">Balance</th>
          <th style="width: 8%;">Amount with GST</th>
          <th style="width: 8%;">Available Qty</th>
          <th style="width: 8%;">Edit</th>
        </tr>
      </thead>
      <tbody>
        ${data
      .map((item) => {
        // Get all field values with fallbacks
        const materialCode = item.material_code || item.item_code || '-';
        const materialName = item.material_name || item.item_name || '-';
        const materialType = item.material_type || item.item_type || '-';
        const supplierAddress = item.supplier_address || '-';
        const billNo = item.bill_no_invoice || '-';
        const openingBalance = item.opening_balance || 0;
        const qtyReceived = item.quantity_received || 0;
        const qtyIssued = item.quantity_issued || 0;
        const balance = item.balance || 0;
        const amountWithGst = item.amount_with_gst || 0;
        const availableQty = item.available_quantity || item.available_qty || 0;

        // Format amount
        const formattedAmount = amountWithGst > 0
          ? '₹' + amountWithGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          : '-';

        // Find index in allMaterials array
        const materialIndex = allMaterials.findIndex(m => m.id === item.id);

        return `
          <tr>
            <td>
              <span class="code-col">${materialCode}</span>
            </td>
            <td class="name-col">${materialName}</td>
            <td>
              ${materialType !== '-' ? `<span class="badge badge-type">${materialType}</span>` : '<span class="badge-empty">-</span>'}
            </td>
            <td class="info-cell">${supplierAddress.length > 30 ? supplierAddress.substring(0, 30) + '...' : supplierAddress}</td>
            <td class="info-cell">${billNo}</td>
            <td class="number-cell">${openingBalance}</td>
            <td class="number-cell">${qtyReceived}</td>
            <td class="number-cell">${qtyIssued}</td>
            <td class="number-cell">${balance}</td>
            <td class="info-cell" style="text-align: right; font-weight: 600; color: #10b981;">${formattedAmount}</td>
            <td class="balance-cell">${availableQty}</td>
            <td style="text-align: center;">
              <button class="edit-btn" onclick="openEditModal(${materialIndex})">
                <i class="fas fa-edit"></i> Edit
              </button>
            </td>
          </tr>
        `;
      })
      .join("")}
      </tbody>
    </table>
  `;

  stockTable.innerHTML = tableHTML;
  updateStats(data);
}

// ============================================
// OPEN EDIT MODAL
// ============================================

function openEditModal(index) {
  const material = allMaterials[index];
  currentEditId = index;

  console.log('Opening edit modal for:', material);

  // Set form values - use correct database column names with fallbacks
  document.getElementById('editId').value = index;
  document.getElementById('editMaterialCode').value = material.material_code || material.item_code || '';
  document.getElementById('editMaterialName').value = material.material_name || material.item_name || '';

  // Set Item Type dropdown value
  const itemType = material.material_type || material.item_type || '';
  document.getElementById('editItemType').value = itemType;

  document.getElementById('editSupplierAddress').value = material.supplier_address || '';
  document.getElementById('editBillNo').value = material.bill_no_invoice || '';
  document.getElementById('editOpeningBalance').value = material.opening_balance || 0;
  document.getElementById('editQuantityReceived').value = material.quantity_received || 0;
  document.getElementById('editQuantityIssued').value = material.quantity_issued || 0;
  document.getElementById('editBalance').value = material.balance || 0;
  document.getElementById('editAmountWithGst').value = material.amount_with_gst || 0;
  document.getElementById('editAvailableQty').value = material.available_quantity || material.available_qty || 0;

  // Clear message
  clearEditMessage();

  // Show modal
  document.getElementById('editModal').classList.add('show');
}

// ============================================
// CLOSE EDIT MODAL
// ============================================

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  document.getElementById('editForm').reset();
  currentEditId = null;
  clearEditMessage();
}

// ============================================
// SAVE MATERIAL DATA
// ============================================

function saveMaterialData(event) {
  event.preventDefault();

  if (currentEditId === null) {
    showEditMessage('Error: No material selected', 'error');
    return;
  }

  const material = allMaterials[currentEditId];

  // Collect form data with correct database column names (NO CATEGORY)
  const updatedData = {
    id: material.id,
    material_code: document.getElementById('editMaterialCode').value,
    material_name: document.getElementById('editMaterialName').value,
    material_type: document.getElementById('editItemType').value, // Dropdown value
    supplier_address: document.getElementById('editSupplierAddress').value,
    bill_no_invoice: document.getElementById('editBillNo').value,
    opening_balance: parseInt(document.getElementById('editOpeningBalance').value) || 0,
    quantity_received: parseInt(document.getElementById('editQuantityReceived').value) || 0,
    quantity_issued: parseInt(document.getElementById('editQuantityIssued').value) || 0,
    balance: parseInt(document.getElementById('editBalance').value) || 0,
    amount_with_gst: parseFloat(document.getElementById('editAmountWithGst').value) || 0,
    available_qty: parseInt(document.getElementById('editAvailableQty').value) || 0
  };

  // Validate required fields
  if (!updatedData.material_code.trim() || !updatedData.material_name.trim()) {
    showEditMessage('Material Code and Name are required', 'error');
    return;
  }

  console.log('Saving material:', updatedData);

  // Send to server
  updateMaterialOnServer(updatedData);
}

// ============================================
// UPDATE MATERIAL ON SERVER
// ============================================

async function updateMaterialOnServer(data) {
  try {
    const response = await fetch(`http://localhost:5000/materials/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✓ Material updated:', result);
      showEditMessage('✓ Material updated successfully!', 'success');

      setTimeout(() => {
        closeEditModal();
        loadMaterials(); // Reload table
      }, 1500);
    } else {
      const error = await response.json();
      console.error('❌ Update failed:', error);
      showEditMessage(error.message || 'Failed to update material', 'error');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    showEditMessage('Error: ' + error.message, 'error');
  }
}

// ============================================
// DELETE MATERIAL
// ============================================

function deleteMaterial() {
  if (currentEditId === null) {
    showEditMessage('Error: No material selected', 'error');
    return;
  }

  // Confirmation removed as per user request
  // if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
  //   return;
  // }

  const material = allMaterials[currentEditId];

  console.log('Deleting material:', material.material_code || material.item_code);

  deleteMaterialOnServer(material.id);
}

// ============================================
// DELETE MATERIAL ON SERVER
// ============================================

async function deleteMaterialOnServer(id) {
  try {
    const response = await fetch(`http://localhost:5000/materials/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Delete response status:', response.status);

    if (response.ok) {
      console.log('✓ Material deleted');
      showEditMessage('✓ Material deleted successfully!', 'success');

      setTimeout(() => {
        closeEditModal();
        loadMaterials(); // Reload table
      }, 1500);
    } else {
      const error = await response.json();
      console.error('❌ Delete failed:', error);
      showEditMessage(error.message || 'Failed to delete material', 'error');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    showEditMessage('Error: ' + error.message, 'error');
  }
}

// ============================================
// SHOW/CLEAR MESSAGES
// ============================================

function showEditMessage(message, type) {
  const messageEl = document.getElementById('editMessage');
  messageEl.textContent = message;
  messageEl.className = `alert-message show ${type}`;
  console.log(`[${type.toUpperCase()}]`, message);
}

function clearEditMessage() {
  const messageEl = document.getElementById('editMessage');
  messageEl.textContent = '';
  messageEl.className = 'alert-message';
}

// ============================================
// DOWNLOAD EXCEL
// ============================================

function downloadExcel() {
  if (!allMaterials || allMaterials.length === 0) {
    alert('No materials data to download.');
    return;
  }

  // Prepare data rows with clean column headers
  const excelData = allMaterials.map((item, index) => ({
    'S.No': index + 1,
    'Material Code': item.material_code || item.item_code || '',
    'Material Name': item.material_name || item.item_name || '',
    'Material Type': item.material_type || item.item_type || '',
    'Supplier Address': item.supplier_address || '',
    'Bill No / Invoice': item.bill_no_invoice || '',
    'Opening Balance': item.opening_balance || 0,
    'Quantity Received': item.quantity_received || 0,
    'Quantity Issued': item.quantity_issued || 0,
    'Balance': item.balance || 0,
    'Amount with GST': item.amount_with_gst || 0,
    'Available Quantity': item.available_quantity || item.available_qty || 0
  }));

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const colWidths = [
    { wch: 6 },   // S.No
    { wch: 16 },  // Material Code
    { wch: 40 },  // Material Name
    { wch: 20 },  // Material Type
    { wch: 30 },  // Supplier Address
    { wch: 18 },  // Bill No
    { wch: 16 },  // Opening Balance
    { wch: 18 },  // Qty Received
    { wch: 15 },  // Qty Issued
    { wch: 10 },  // Balance
    { wch: 16 },  // Amount with GST
    { wch: 18 },  // Available Qty
  ];
  ws['!cols'] = colWidths;

  // Create workbook and add the worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Book');

  // Generate filename with date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `StockBook_${dateStr}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);

  console.log(`✅ Excel downloaded: ${filename} (${allMaterials.length} records)`);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", function (e) {
  // Escape - Close modal
  if (e.key === "Escape") {
    closeEditModal();
  }

  // Alt+S - Focus search
  if (e.altKey && e.key === "s") {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }

  // Alt+B - Back to admin home
  if (e.altKey && e.key === "b") {
    e.preventDefault();
    window.location.href = "adminhome.html";
  }
});

console.log(
  "%c📚 Stock Book Page Loaded",
  "color: #0066ff; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c✅ Complete View - NO CATEGORY Column:\n✓ Material Code\n✓ Material Name\n✓ Material Type (Dropdown: Mandatory Equipment, Consumable, Tool)\n✓ Supplier Address\n✓ Bill No/Invoice\n✓ Opening Balance\n✓ Quantity Received\n✓ Quantity Issued\n✓ Balance\n✓ Amount with GST\n✓ Available Quantity\n✓ Edit & Delete functionality",
  "color: #10b981; font-size: 12px;"
);