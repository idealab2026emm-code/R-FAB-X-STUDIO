console.log('📦 View Materials Page Loaded');

let allMaterials = [];
let filteredMaterials = [];

// ==================== AUTHENTICATION CHECK ====================
window.addEventListener('load', function() {
  console.log('✓ Page loaded, checking authentication...');
  
  const user = localStorage.getItem('user');
  if (!user) {
    console.log('❌ No user found');
    window.location.href = 'login.html';
    return;
  }
  
  const userData = JSON.parse(user);
  console.log('✅ User:', userData.username, 'Role:', userData.role);
  
  if (userData.role !== 'admin') {
    console.log('❌ Not admin');
    alert('Admin access required');
    window.location.href = 'login.html';
    return;
  }

  console.log('✅ Admin verified');
  loadMaterials();
});

// ==================== LOAD MATERIALS ====================
async function loadMaterials() {
  console.log('📥 Loading materials...');
  
  try {
    const res = await fetch('http://localhost:5000/materials');
    if (!res.ok) throw new Error('Failed to fetch materials');
    
    allMaterials = await res.json();
    
    console.log('✅ Fetched', allMaterials.length, 'materials');
    console.log('📋 Sample material:', allMaterials[0]);
    
    // Display materials
    displayMaterials(allMaterials);
    updateStats();
    
  } catch(e) {
    console.error('❌ Error loading materials:', e);
    document.getElementById('materialsBody').innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: #ef4444;">
          <i class="fas fa-exclamation-circle"></i> Error loading materials
        </td>
      </tr>
    `;
  }
}

// ==================== DISPLAY MATERIALS ====================
function displayMaterials(materials) {
  console.log('📋 Displaying', materials.length, 'materials');
  
  const tbody = document.getElementById('materialsBody');
  const noDataMsg = document.getElementById('noDataMsg');
  
  if (materials.length === 0) {
    tbody.innerHTML = '';
    noDataMsg.style.display = 'block';
    console.log('⚠️ No materials to display');
    return;
  }
  
  noDataMsg.style.display = 'none';
  tbody.innerHTML = '';
  
  materials.forEach((material) => {
    const tr = document.createElement('tr');
    
    // Get material code - try both field names
    const materialCode = material.material_code || material.item_code || '-';
    
    // Get material name - try both field names
    const materialName = material.material_name || material.item_name || '-';
    
    // Get total quantity - try multiple field names
    const totalQty = material.total_qty || material.balance || 0;
    
    // Get available quantity - try multiple field names
    const availableQty = material.available_qty || material.available_quantity || 0;
    
    tr.innerHTML = `
      <td class="code-cell">${escapeHtml(materialCode)}</td>
      <td>${escapeHtml(materialName)}</td>
      <td class="qty-cell">${totalQty}</td>
      <td class="qty-cell">${availableQty}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  console.log('✅ Materials displayed');
}

// ==================== UPDATE STATISTICS ====================
function updateStats() {
  console.log('📊 Updating statistics...');
  
  const totalItems = allMaterials.length;
  
  // Calculate total quantity
  const totalQuantity = allMaterials.reduce((sum, m) => {
    const qty = m.total_qty || m.balance || 0;
    return sum + qty;
  }, 0);
  
  // Calculate total available
  const totalAvailable = allMaterials.reduce((sum, m) => {
    const avail = m.available_qty || m.available_quantity || 0;
    return sum + avail;
  }, 0);
  
  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('totalQuantity').textContent = totalQuantity;
  document.getElementById('totalAvailable').textContent = totalAvailable;
  
  console.log(`✅ Stats: Items=${totalItems}, Total Qty=${totalQuantity}, Available=${totalAvailable}`);
}

// ==================== FILTER MATERIALS ====================
function filterMaterials() {
  console.log('🔍 Filtering materials...');
  
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  
  filteredMaterials = allMaterials.filter(m => {
    const code = (m.material_code || m.item_code || '').toLowerCase();
    const name = (m.material_name || m.item_name || '').toLowerCase();
    
    return code.includes(searchText) || name.includes(searchText);
  });
  
  console.log(`✅ Filtered to ${filteredMaterials.length} materials`);
  displayMaterials(filteredMaterials);
  
  // Update stats for filtered data
  if (filteredMaterials.length > 0) {
    const totalItems = filteredMaterials.length;
    const totalQuantity = filteredMaterials.reduce((sum, m) => {
      const qty = m.total_qty || m.balance || 0;
      return sum + qty;
    }, 0);
    const totalAvailable = filteredMaterials.reduce((sum, m) => {
      const avail = m.available_qty || m.available_quantity || 0;
      return sum + avail;
    }, 0);
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalQuantity').textContent = totalQuantity;
    document.getElementById('totalAvailable').textContent = totalAvailable;
  }
}

// ==================== DOWNLOAD MATERIALS ====================
function downloadMaterials() {
  console.log('📥 Starting materials download...');
  
  try {
    const materialsToExport = filteredMaterials.length > 0 ? filteredMaterials : allMaterials;
    
    if (materialsToExport.length === 0) {
      alert('No materials to download');
      return;
    }
    
    // Prepare data for Excel - 4 columns only
    const dataForExcel = materialsToExport.map(m => {
      return {
        'Material Code': m.material_code || m.item_code || '',
        'Material Name': m.material_name || m.item_name || '',
        'Total Quantity': m.total_qty || m.balance || 0,
        'Available Quantity': m.available_qty || m.available_quantity || 0
      };
    });
    
    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 },  // Material Code
      { wch: 35 },  // Material Name
      { wch: 15 },  // Total Quantity
      { wch: 18 }   // Available Quantity
    ];
    
    // Generate filename with date
    const date = new Date().toISOString().slice(0, 10);
    const filename = `materials_inventory_${date}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    console.log('✅ Download started:', filename);
  } catch(e) {
    console.error('❌ Download error:', e);
    alert('Download failed: ' + e.message);
  }
}

// ==================== ESCAPE HTML ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== GO BACK ====================
function goBack() {
  console.log('🔙 Going back to dashboard...');
  window.history.back();
}

console.log('✅ View Materials Page Ready!');