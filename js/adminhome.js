console.log('🏠 Admin Dashboard Loaded');

let selectedMaterialsFile = null;
let materialsFileData = [];
let selectedUsersFile = null;
let usersFileData = [];

// ==================== AUTHENTICATION CHECK ====================
window.addEventListener('load', function () {
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
  loadStats();
  setupDragDrop();
});

// ==================== LOAD STATISTICS ====================
async function loadStats() {
  console.log('📊 Loading statistics...');

  try {
    console.log('📥 Fetching materials...');
    const mat = await fetch('/materials');
    if (mat.ok) {
      const data = await mat.json();
      document.getElementById('totalMat').textContent = data.length;
      console.log('✅ Materials:', data.length);
    }
  } catch (e) {
    console.error('❌ Materials error:', e);
    document.getElementById('totalMat').textContent = '0';
  }

  try {
    console.log('📥 Fetching users...');
    const users = await fetch('/users');
    if (users.ok) {
      const data = await users.json();
      document.getElementById('totalUsers').textContent = data.length;
      console.log('✅ Total Users:', data.length);
    }
  } catch (e) {
    console.error('❌ Users error:', e);
    document.getElementById('totalUsers').textContent = '0';
  }

  console.log('✅ Statistics loaded');
}

// ==================== NAVIGATION ====================
function goPage(page) {
  console.log('📍 Going to:', page);
  window.location.href = page;
}

function logout() {
  console.log('🚪 Logging out...');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ==================== MANAGE USERS MODAL ====================
function openManageUsersModal() {
  console.log('📂 Opening manage users modal...');
  document.getElementById('manageUsersModal').classList.add('show');
}

function closeManageUsersModal() {
  console.log('❌ Closing manage users modal...');
  document.getElementById('manageUsersModal').classList.remove('show');
}

// ==================== VIEW MATERIALS MODAL ====================
function openViewMaterialsModal() {
  console.log('📂 Opening view materials modal...');
  document.getElementById('viewMaterialsModal').classList.add('show');
}

function closeViewMaterialsModal() {
  console.log('❌ Closing view materials modal...');
  document.getElementById('viewMaterialsModal').classList.remove('show');
}

// ==================== DOWNLOAD TEMPLATES ====================
function downloadUsersTemplate() {
  console.log('📥 Generating users template...');

  // Create sample data
  const templateData = [
    {
      'Username': 'Name',
      'Mail': 'john@rathinam.in',
      'Password': 'password@123',
      'Full Name': 'FULL NAME',
      'Roll No': '241100840',
      'Department': 'CSE(AIML)'
    }
  ];

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 },  // Username
    { wch: 25 },  // Mail
    { wch: 15 },  // Password
    { wch: 20 },  // Full Name
    { wch: 15 },  // Roll No
    { wch: 25 }   // Department
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users Template');

  // Generate file
  XLSX.writeFile(wb, 'Users_Upload_Template.xlsx');

  console.log('✅ Users template downloaded');
}

function downloadMaterialsTemplate() {
  console.log('📥 Generating materials template...');

  // Create sample data
  const templateData = [
    {
      'material_code': 'RES001',
      'material_name': 'Resistor 10K Ohm'
    },
    {
      'material_code': 'CAP002',
      'material_name': 'Capacitor 100uF'
    },
    {
      'material_code': 'LED003',
      'material_name': 'LED Red 5mm'
    }
  ];

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },  // material_code
    { wch: 40 }   // material_name
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Materials Template');

  // Generate file
  XLSX.writeFile(wb, 'Materials_Upload_Template.xlsx');

  console.log('✅ Materials template downloaded');
}

// ==================== UPLOAD USERS MODAL ====================
function openUploadUsersModal() {
  console.log('📂 Opening users upload modal...');
  document.getElementById('uploadUsersModal').classList.add('show');
  resetUsersUploadForm();
}

function closeUploadUsersModal() {
  console.log('❌ Closing users upload modal...');
  document.getElementById('uploadUsersModal').classList.remove('show');
  resetUsersUploadForm();
}

function resetUsersUploadForm() {
  selectedUsersFile = null;
  usersFileData = [];

  document.getElementById('usersFileInput').value = '';
  document.getElementById('usersFileInfo').classList.remove('show');
  document.getElementById('usersPreviewSection').classList.remove('show');
  document.getElementById('uploadUsersBtn').style.display = 'none';
  document.getElementById('uploadUsersMessage').textContent = '';
  document.getElementById('uploadUsersMessage').className = 'alert';
}

// ==================== UPLOAD MATERIALS MODAL ====================
function openUploadMaterialsModal() {
  console.log('📂 Opening materials upload modal...');
  document.getElementById('uploadMaterialsModal').classList.add('show');
  resetMaterialsUploadForm();
}

function closeUploadMaterialsModal() {
  console.log('❌ Closing materials upload modal...');
  document.getElementById('uploadMaterialsModal').classList.remove('show');
  resetMaterialsUploadForm();
}

function resetMaterialsUploadForm() {
  selectedMaterialsFile = null;
  materialsFileData = [];

  document.getElementById('materialsFileInput').value = '';
  document.getElementById('materialsFileInfo').classList.remove('show');
  document.getElementById('materialsPreviewSection').classList.remove('show');
  document.getElementById('uploadMaterialsBtn').style.display = 'none';
  document.getElementById('uploadMaterialsMessage').textContent = '';
  document.getElementById('uploadMaterialsMessage').className = 'alert';
}

// ==================== DRAG AND DROP ====================
function setupDragDrop() {
  // Materials drag and drop
  const materialsUploadArea = document.getElementById('uploadMaterialsArea');

  if (materialsUploadArea) {
    materialsUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      materialsUploadArea.style.borderColor = 'var(--primary-dark)';
    });

    materialsUploadArea.addEventListener('dragleave', function () {
      materialsUploadArea.style.borderColor = 'var(--primary)';
    });

    materialsUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      materialsUploadArea.style.borderColor = 'var(--primary)';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleMaterialsFileSelection(files[0]);
      }
    });
  }

  // Users drag and drop
  const usersUploadArea = document.getElementById('uploadUsersArea');

  if (usersUploadArea) {
    usersUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      usersUploadArea.style.borderColor = 'var(--primary-dark)';
    });

    usersUploadArea.addEventListener('dragleave', function () {
      usersUploadArea.style.borderColor = 'var(--primary)';
    });

    usersUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      usersUploadArea.style.borderColor = 'var(--primary)';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUsersFileSelection(files[0]);
      }
    });
  }
}

// ==================== USERS FILE HANDLING ====================
function triggerUsersFileInput() {
  document.getElementById('usersFileInput').click();
}

function handleUsersFile(event) {
  console.log('📂 Users file selected');
  const files = event.target.files;
  if (files.length > 0) {
    handleUsersFileSelection(files[0]);
  }
}

function handleUsersFileSelection(file) {
  console.log('📄 Processing users file:', file.name);

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    console.error('❌ Invalid file type');
    showUsersAlert('❌ Please select an Excel file (.xlsx or .xls)', 'error');
    return;
  }

  selectedUsersFile = file;
  console.log('✅ Users file selected:', file.name);

  document.getElementById('usersFileInfo').classList.add('show');
  document.getElementById('usersFileName').textContent = file.name;

  readUsersExcelFile(file);
}

function readUsersExcelFile(file) {
  console.log('📖 Reading users Excel file...');

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      console.log('✓ File read, parsing...');

      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('✅ Data parsed:', jsonData.length, 'rows');

      if (jsonData.length === 0) {
        showUsersAlert('❌ No data found in Excel file', 'error');
        return;
      }

      usersFileData = jsonData;
      showUsersPreview(jsonData);
      document.getElementById('uploadUsersBtn').style.display = 'flex';
      showUsersAlert('📊 File loaded successfully! Review and click "Upload to Database".', 'info');

    } catch (e) {
      console.error('❌ Error reading file:', e);
      showUsersAlert('❌ Error reading file: ' + e.message, 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

function showUsersPreview(data) {
  const tbody = document.querySelector('#usersPreviewBody');
  tbody.innerHTML = '';

  const preview = data.slice(0, 5);

  preview.forEach((row) => {
    const allKeys = Object.keys(row);

    let username = '', mail = '', password = '', fullName = '', rollNo = '', department = '';

    for (let key of allKeys) {
      const lowerKey = key.toLowerCase().trim();
      if (lowerKey.includes('user') && !lowerKey.includes('full') && !username) username = row[key];
      else if ((lowerKey.includes('mail') || lowerKey.includes('email')) && !mail) mail = row[key];
      else if (lowerKey.includes('pass') && !password) password = row[key];
      else if (lowerKey.includes('full') && lowerKey.includes('name') && !fullName) fullName = row[key];
      else if (lowerKey.includes('roll') && !rollNo) rollNo = row[key];
      else if ((lowerKey.includes('dept') || lowerKey.includes('department')) && !department) department = row[key];
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(username)}</td>
      <td>${escapeHtml(mail)}</td>
      <td>${escapeHtml(fullName)}</td>
      <td>${escapeHtml(rollNo)}</td>
      <td>${escapeHtml(department)}</td>
      <td>${password ? '••••••' : ''}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('usersPreviewSection').classList.add('show');
}

async function uploadUsersData() {
  console.log('📤 Starting users upload...');

  if (usersFileData.length === 0) {
    showUsersAlert('❌ No data to upload', 'error');
    return;
  }

  const btn = document.getElementById('uploadUsersBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading...';

  try {
    const users = usersFileData.map((row) => {
      const allKeys = Object.keys(row);

      let username = '', mail = '', password = '', full_name = '', roll_no = '', department = '';

      for (let key of allKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (lowerKey.includes('user') && !lowerKey.includes('full') && !username) username = row[key];
        else if ((lowerKey.includes('mail') || lowerKey.includes('email')) && !mail) mail = row[key];
        else if (lowerKey.includes('pass') && !password) password = row[key];
        else if (lowerKey.includes('full') && lowerKey.includes('name') && !full_name) full_name = row[key];
        else if (lowerKey.includes('roll') && !roll_no) roll_no = row[key];
        else if ((lowerKey.includes('dept') || lowerKey.includes('department')) && !department) department = row[key];
      }

      return {
        username: username || '',
        mail: mail || '',
        password: password || '',
        full_name: full_name || '',
        roll_no: roll_no || '',
        department: department || '',
        role: 'user'
      };
    });

    const response = await fetch('/upload-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });

    const result = await response.json();

    if (response.ok) {
      showUsersAlert('✅ ' + (result.message || 'Users uploaded successfully!'), 'success');
      setTimeout(() => {
        closeUploadUsersModal();
        loadStats();
      }, 1500);
    } else {
      showUsersAlert('❌ ' + (result.message || 'Upload failed'), 'error');
    }
  } catch (e) {
    showUsersAlert('❌ Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function removeUsersFile() {
  selectedUsersFile = null;
  usersFileData = [];
  document.getElementById('usersFileInput').value = '';
  document.getElementById('usersFileInfo').classList.remove('show');
  document.getElementById('usersPreviewSection').classList.remove('show');
  document.getElementById('uploadUsersBtn').style.display = 'none';
  showUsersAlert('', '');
}

function showUsersAlert(msg, type) {
  const el = document.getElementById('uploadUsersMessage');
  if (!msg) {
    el.textContent = '';
    el.className = 'alert';
    return;
  }
  el.textContent = msg;
  el.className = `alert show ${type}`;
}

// ==================== MATERIALS FILE HANDLING ====================
function triggerMaterialsFileInput() {
  document.getElementById('materialsFileInput').click();
}

function handleMaterialsFile(event) {
  const files = event.target.files;
  if (files.length > 0) {
    handleMaterialsFileSelection(files[0]);
  }
}

function handleMaterialsFileSelection(file) {
  console.log('📄 Processing materials file:', file.name);

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showMaterialsAlert('❌ Please select an Excel file (.xlsx or .xls)', 'error');
    return;
  }

  selectedMaterialsFile = file;
  document.getElementById('materialsFileInfo').classList.add('show');
  document.getElementById('materialsFileName').textContent = file.name;

  readMaterialsExcelFile(file);
}

function readMaterialsExcelFile(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        showMaterialsAlert('❌ No data found in Excel file', 'error');
        return;
      }

      materialsFileData = jsonData;
      showMaterialsPreview(jsonData);
      document.getElementById('uploadMaterialsBtn').style.display = 'flex';
      showMaterialsAlert('📊 File loaded successfully! Review and click "Upload to Database".', 'info');

    } catch (e) {
      showMaterialsAlert('❌ Error reading file: ' + e.message, 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

function showMaterialsPreview(data) {
  const tbody = document.querySelector('#materialsPreviewBody');
  tbody.innerHTML = '';

  const preview = data.slice(0, 5);

  preview.forEach((row) => {
    const itemCode = row['material_code'] || row['Item Code'] || row['item_code'] || row['Code'] || '';
    const itemName = row['material_name'] || row['Item Name'] || row['item_name'] || row['Name'] || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(itemCode)}</td>
      <td>${escapeHtml(itemName)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('materialsPreviewSection').classList.add('show');
}

async function uploadMaterialsData() {
  if (materialsFileData.length === 0) {
    showMaterialsAlert('❌ No data to upload', 'error');
    return;
  }

  const btn = document.getElementById('uploadMaterialsBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading...';

  try {
    const materials = materialsFileData.map(row => {
      // Normalize row keys for flexible matching (lowercase, trimmed, single spaces)
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.toString().trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
        normalizedRow[cleanKey] = row[key];
      });

      const getVal = (possibleKeys) => {
        for (const k of possibleKeys) {
          if (normalizedRow[k] !== undefined) return normalizedRow[k];
        }
        return undefined;
      };

      return {
        material_code: getVal(['material_code', 'item code', 'material code', 'code', 'id']) || '',
        material_name: getVal(['material_name', 'item name', 'material name', 'name', 'item', 'description']) || ''
      };
    });

    console.log('📤 Sending mapped materials:', materials); // Debug log

    // Client-side validation
    const invalidRows = materials.filter(m => !m.material_code || !m.material_name);
    if (invalidRows.length > 0) {
      console.error("❌ Client-side validation failed. Invalid rows:", invalidRows);
      showMaterialsAlert(`⚠️ Mapping Error: ${invalidRows.length} rows are missing 'material_code' or 'material_name'. Please check your Excel headers.`, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    const response = await fetch('/upload-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials })
    });

    const result = await response.json();

    if (response.ok) {
      showMaterialsAlert('✅ ' + (result.message || 'Materials uploaded successfully!'), 'success');
      setTimeout(() => {
        closeUploadMaterialsModal();
        loadStats();
      }, 1500);
    } else {
      let msg = result.message || 'Upload failed';
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        msg += ': ' + result.errors.slice(0, 3).join(', ');
        if (result.errors.length > 3) msg += ` (+${result.errors.length - 3} more)`;
      }
      showMaterialsAlert('❌ ' + msg, 'error');
    }
  } catch (e) {
    showMaterialsAlert('❌ Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function removeMaterialsFile() {
  selectedMaterialsFile = null;
  materialsFileData = [];
  document.getElementById('materialsFileInput').value = '';
  document.getElementById('materialsFileInfo').classList.remove('show');
  document.getElementById('materialsPreviewSection').classList.remove('show');
  document.getElementById('uploadMaterialsBtn').style.display = 'none';
  showMaterialsAlert('', '');
}

function showMaterialsAlert(msg, type) {
  const el = document.getElementById('uploadMaterialsMessage');
  if (!msg) {
    el.textContent = '';
    el.className = 'alert';
    return;
  }
  el.textContent = msg;
  el.className = `alert show ${type}`;
}

// ==================== UTILITY ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modals on outside click
window.addEventListener('click', function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
});

console.log('✅ Admin Dashboard Ready!');