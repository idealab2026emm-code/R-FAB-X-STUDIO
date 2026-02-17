console.log('📊 All Transactions Page Loaded');

let allTransactions = [];
let currentFilter = 'all'; // 'all', 'checkout', 'checkin', 'pending'
let pendingItems = []; // Calculated list of pending (unreturned) items with quantities

// ==================== AUTH CHECK ====================
window.addEventListener('load', () => {
  console.log('✓ Page loaded, checking authentication...');

  const user = localStorage.getItem('user');
  if (!user) {
    console.warn('❌ No user found in localStorage');
    window.location.href = 'login.html';
    return;
  }

  const userData = JSON.parse(user);
  console.log('✅ User:', userData.username, 'Role:', userData.role);

  if (userData.role !== 'admin') {
    console.warn('❌ Not admin');
    alert('Admin access required');
    window.location.href = 'login.html';
    return;
  }

  console.log('✅ Admin verified');
  loadTransactions();
});

// ==================== LOAD ALL TRANSACTIONS ====================
async function loadTransactions() {
  console.log('📥 Loading all transactions...');

  try {
    console.log('🌐 Fetching: http://localhost:5000/transactions');
    const res = await fetch('http://localhost:5000/transactions');

    console.log('📍 Response status:', res.status);

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    allTransactions = await res.json();

    if (!Array.isArray(allTransactions)) {
      throw new Error('Invalid response - not an array');
    }

    console.log('✅ Fetched', allTransactions.length, 'transactions');

    if (allTransactions.length === 0) {
      displayNoData();
      return;
    }

    // Sort by newest first
    allTransactions.sort((a, b) =>
      new Date(b.scan_time) - new Date(a.scan_time)
    );

    // Calculate pending items
    calculatePending();

    // Display based on current filter
    applyFilter();
    updateStats();

  } catch (err) {
    console.error('❌ Error:', err.message);
    displayError(err.message);
  }
}

// ==================== CALCULATE PENDING ====================
// Pending = for each user+item, total checkout qty - total checkin qty
// If positive → that many items are still pending return
function calculatePending() {
  const userItemMap = {};

  // Process all transactions
  allTransactions.forEach(t => {
    const key = `${(t.username || '').toLowerCase()}|${(t.item_code || '').toLowerCase()}`;
    const action = (t.action || '').toLowerCase();
    const qty = parseInt(t.quantity) || 1; // Default to 1 for old records without quantity

    if (!userItemMap[key]) {
      userItemMap[key] = {
        username: t.username,
        item_code: t.item_code,
        item_name: t.item_name,
        totalCheckout: 0,
        totalCheckin: 0,
        lastCheckoutTime: null
      };
    }

    if (action.includes('checkout')) {
      userItemMap[key].totalCheckout += qty;
      // Track latest checkout time
      const time = new Date(t.scan_time);
      if (!userItemMap[key].lastCheckoutTime || time > userItemMap[key].lastCheckoutTime) {
        userItemMap[key].lastCheckoutTime = time;
      }
    } else if (action.includes('checkin')) {
      userItemMap[key].totalCheckin += qty;
    }
  });

  // Build pending list: only items with checkout > checkin
  pendingItems = [];
  Object.values(userItemMap).forEach(entry => {
    const pendingQty = entry.totalCheckout - entry.totalCheckin;
    if (pendingQty > 0) {
      pendingItems.push({
        username: entry.username,
        item_code: entry.item_code,
        item_name: entry.item_name,
        quantity: pendingQty,
        totalCheckout: entry.totalCheckout,
        totalCheckin: entry.totalCheckin,
        scan_time: entry.lastCheckoutTime, // Show last checkout date
        action: 'pending'
      });
    }
  });

  // Sort by most recent first
  pendingItems.sort((a, b) => new Date(b.scan_time) - new Date(a.scan_time));

  console.log(`🕐 Pending items: ${pendingItems.length} (${pendingItems.reduce((sum, p) => sum + p.quantity, 0)} total qty)`);
}

// ==================== FILTER BY CARD ====================
function filterByCard(type) {
  console.log(`🔽 Filter: ${type}`);
  currentFilter = type;

  // Update active card styling
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.remove('active');
  });

  const cardId = type === 'all' ? 'cardAll' :
    type === 'checkout' ? 'cardCheckout' :
      type === 'checkin' ? 'cardCheckin' : 'cardPending';
  const activeCard = document.getElementById(cardId);
  if (activeCard) activeCard.classList.add('active');

  applyFilter();
}

// ==================== APPLY FILTER ====================
function applyFilter() {
  let filtered;

  switch (currentFilter) {
    case 'checkout':
      filtered = allTransactions.filter(t =>
        (t.action || '').toLowerCase().includes('checkout')
      );
      displayTransactions(filtered);
      break;
    case 'checkin':
      filtered = allTransactions.filter(t =>
        (t.action || '').toLowerCase().includes('checkin')
      );
      displayTransactions(filtered);
      break;
    case 'pending':
      displayPendingItems(pendingItems);
      break;
    default:
      displayTransactions(allTransactions);
  }
}

// ==================== DISPLAY TRANSACTIONS ====================
function displayTransactions(transactions) {
  const tbody = document.getElementById('tableBody');
  const noDataMsg = document.getElementById('noDataMsg');

  if (!transactions || transactions.length === 0) {
    displayNoData();
    return;
  }

  noDataMsg.style.display = 'none';
  tbody.innerHTML = '';

  transactions.forEach(t => {
    const tr = document.createElement('tr');

    // Format date and time
    const transDate = new Date(t.scan_time);
    const dateTime = transDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Check action type
    const action = (t.action || '').toLowerCase();
    const isCheckin = action.includes('checkin') || action === 'check-in';
    const badgeClass = isCheckin ? 'checkin' : 'checkout';
    const badgeText = isCheckin ? '↓ CHECKIN' : '↑ CHECKOUT';
    const qty = parseInt(t.quantity) || 1;

    tr.innerHTML = `
      <td>${escapeHtml(dateTime)}</td>
      <td><strong>${escapeHtml(t.username || 'N/A')}</strong></td>
      <td>${escapeHtml(t.item_code || 'N/A')}</td>
      <td>${escapeHtml(t.item_name || 'N/A')}</td>
      <td style="text-align:center; font-weight:600;">${qty}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
    `;

    tbody.appendChild(tr);
  });

  console.log('✅ Displayed', transactions.length, 'transactions (filter:', currentFilter + ')');
}

// ==================== DISPLAY PENDING ITEMS ====================
// Shows detailed pending view: user, item, checked out qty, returned qty, pending qty
function displayPendingItems(items) {
  const tbody = document.getElementById('tableBody');
  const noDataMsg = document.getElementById('noDataMsg');

  if (!items || items.length === 0) {
    displayNoData();
    return;
  }

  noDataMsg.style.display = 'none';
  tbody.innerHTML = '';

  items.forEach(item => {
    const tr = document.createElement('tr');

    // Format the last checkout date
    const transDate = new Date(item.scan_time);
    const dateTime = transDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    tr.innerHTML = `
      <td>${escapeHtml(dateTime)}</td>
      <td><strong>${escapeHtml(item.username || 'N/A')}</strong></td>
      <td>${escapeHtml(item.item_code || 'N/A')}</td>
      <td>${escapeHtml(item.item_name || 'N/A')}</td>
      <td style="text-align:center; font-weight:700; color:#c05621;">
        <span title="Checked out: ${item.totalCheckout}, Returned: ${item.totalCheckin}">
          ${item.quantity}
        </span>
      </td>
      <td><span class="badge pending">⏳ PENDING</span></td>
    `;

    tbody.appendChild(tr);
  });

  console.log('✅ Displayed', items.length, 'pending items');
}

// ==================== UPDATE STATS ====================
function updateStats() {
  const total = allTransactions.length;
  const checkout = allTransactions.filter(t =>
    (t.action || '').toLowerCase().includes('checkout')
  ).length;
  const checkin = allTransactions.filter(t =>
    (t.action || '').toLowerCase().includes('checkin')
  ).length;
  const pending = pendingItems.length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('checkoutCount').textContent = checkout;
  document.getElementById('checkinCount').textContent = checkin;
  document.getElementById('pendingCount').textContent = pending;

  console.log(`📊 Stats: Total=${total}, Checkout=${checkout}, Checkin=${checkin}, Pending=${pending}`);
}

// ==================== SEARCH ====================
function search() {
  console.log('🔍 Searching...');

  const searchText = document.getElementById('search').value.toLowerCase().trim();

  if (!searchText) {
    applyFilter();
    return;
  }

  // Get the currently filtered data
  let baseData;
  switch (currentFilter) {
    case 'checkout':
      baseData = allTransactions.filter(t => (t.action || '').toLowerCase().includes('checkout'));
      break;
    case 'checkin':
      baseData = allTransactions.filter(t => (t.action || '').toLowerCase().includes('checkin'));
      break;
    case 'pending':
      baseData = pendingItems;
      break;
    default:
      baseData = allTransactions;
  }

  const filtered = baseData.filter(t => {
    return (
      (t.username || '').toLowerCase().includes(searchText) ||
      (t.item_code || '').toLowerCase().includes(searchText) ||
      (t.item_name || '').toLowerCase().includes(searchText)
    );
  });

  console.log('✅ Found', filtered.length, 'matches');

  if (currentFilter === 'pending') {
    displayPendingItems(filtered);
  } else {
    displayTransactions(filtered);
  }
}

// ==================== CLEAR SEARCH ====================
function clearSearch() {
  console.log('🧹 Clearing search...');
  document.getElementById('search').value = '';
  applyFilter();
}

// ==================== DOWNLOAD EXCEL ====================
function downloadAllTransactions() {
  console.log('📥 Downloading Excel...');

  if (allTransactions.length === 0 && pendingItems.length === 0) {
    alert('No transactions to download');
    return;
  }

  try {
    // Create CSV content
    // --- Section 1: All Transactions (Checkin & Checkout) ---
    let csv = 'ALL TRANSACTIONS\n';
    csv += 'Date & Time,Username,Item Code,Item Name,Quantity,Action\n';

    allTransactions.forEach(t => {
      const dateTime = new Date(t.scan_time).toLocaleString();
      const username = t.username || 'N/A';
      const itemCode = t.item_code || 'N/A';
      const itemName = t.item_name || 'N/A';
      const qty = parseInt(t.quantity) || 1;
      const action = (t.action || '').toUpperCase();
      csv += `"${dateTime}","${username}","${itemCode}","${itemName}","${qty}","${action}"\n`;
    });

    // --- Section 2: Pending Items ---
    csv += '\n\n';
    csv += 'PENDING ITEMS\n';
    csv += 'Last Checkout Date,Username,Item Code,Item Name,Pending Qty,Checked Out,Returned\n';

    if (pendingItems.length > 0) {
      pendingItems.forEach(item => {
        const dateTime = new Date(item.scan_time).toLocaleString();
        const username = item.username || 'N/A';
        const itemCode = item.item_code || 'N/A';
        const itemName = item.item_name || 'N/A';
        csv += `"${dateTime}","${username}","${itemCode}","${itemName}","${item.quantity}","${item.totalCheckout}","${item.totalCheckin}"\n`;
      });
    } else {
      csv += '"No pending items"\n';
    }

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('✅ Download started (includes pending items)');
  } catch (err) {
    console.error('❌ Download error:', err);
    alert('Download failed: ' + err.message);
  }
}

// ==================== DISPLAY NO DATA ====================
function displayNoData() {
  const tbody = document.getElementById('tableBody');
  const noDataMsg = document.getElementById('noDataMsg');

  tbody.innerHTML = '';
  noDataMsg.style.display = 'flex';
  console.log('📭 No data to display');
}

// ==================== DISPLAY ERROR ====================
function displayError(errorMsg) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:60px 20px;">
        <div style="color:#f56565; font-size:16px;">
          <i class="fas fa-exclamation-circle" style="font-size:32px; margin-bottom:10px; display:block;"></i>
          Error: ${escapeHtml(errorMsg)}
        </div>
      </td>
    </tr>
  `;
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
  console.log('🔙 Going back...');
  window.history.back();
}