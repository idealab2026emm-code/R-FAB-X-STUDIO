/* qrcodes.js - QR Generation Logic */

let allMaterials = [];

window.addEventListener('load', () => {
    loadMaterials();

    // Add Search Listener
    const searchInput = document.getElementById('matSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderTable(e.target.value);
        });
    }
});

async function loadMaterials() {
    const tableBody = document.getElementById('materialsBody');
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading materials...</td></tr>`;

    try {
        // Add timeout to fetch to prevent infinite hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('/materials', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Server returned ${response.status} ${response.statusText}`);

        allMaterials = await response.json();
        console.log('✅ Loaded materials for QR generation:', allMaterials.length);

        if (!Array.isArray(allMaterials)) throw new Error('Invalid data format received from server');

        renderTable();
    } catch (err) {
        console.error('Load Error:', err);
        let errorMsg = err.message;
        if (err.name === 'AbortError') errorMsg = 'Connection timed out. Server is not responding.';
        if (err.message.includes('Failed to fetch')) errorMsg = 'Cannot connect to server. Is the backend running on port 5000?';

        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                    <strong>Error loading materials</strong><br>
                    ${errorMsg}<br><br>
                    <button class="btn btn-secondary" onclick="loadMaterials()">
                        <i class="fas fa-redo"></i> Retry Connection
                    </button>
                    <div style="font-size: 11px; margin-top: 15px; color: #666;">
                        Troubleshooting:<br>
                        1. Ensure backend server is running (node server.js)<br>
                        2. Check if http://localhost:5000 is accessible<br>
                        3. Refresh the page
                    </div>
                </td>
            </tr>`;
    }
}

function renderTable(filter = '') {
    const tableBody = document.getElementById('materialsBody');

    const filtered = allMaterials.filter(mat => {
        const name = (mat.material_name || mat.item_name || '').toLowerCase();
        const code = (mat.material_code || mat.item_code || '').toLowerCase();
        const q = filter.trim().toLowerCase();
        return name.includes(q) || code.includes(q);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No materials found matching your search</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(mat => `
    <tr>
      <td class="checkbox-col">
        <input type="checkbox" class="mat-checkbox" data-id="${mat.id}" checked>
      </td>
      <td><strong>${mat.material_code || mat.item_code || '-'}</strong></td>
      <td>${mat.material_name || mat.item_name || '-'}</td>
      <td>${mat.material_type || mat.item_type || '-'}</td>
    </tr>
  `).join('');
}

function selectAll(checked) {
    const checkboxes = document.querySelectorAll('.mat-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

function generateSelected() {
    const grid = document.getElementById('qrGrid');
    const checkboxes = document.querySelectorAll('.mat-checkbox:checked');

    if (checkboxes.length === 0) {
        alert('Please select at least one material.');
        return;
    }

    grid.innerHTML = ''; // Clear previous

    checkboxes.forEach(cb => {
        const id = parseInt(cb.getAttribute('data-id'));
        const mat = allMaterials.find(m => m.id === id);
        if (!mat) return;

        const code = mat.material_code || mat.item_code || 'N/A';
        const name = mat.material_name || mat.item_name || 'N/A';

        // Create element structure
        const item = document.createElement('div');
        item.className = 'qr-item';

        // Header
        const header = document.createElement('div');
        header.className = 'qr-header';
        header.textContent = 'R-FAB X-LAB';
        item.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'qr-body';
        item.appendChild(body);

        const canvasDiv = document.createElement('div');
        canvasDiv.className = 'qr-canvas';
        body.appendChild(canvasDiv);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = name;
        body.appendChild(nameDiv);

        const codeDiv = document.createElement('div');
        codeDiv.className = 'code';
        codeDiv.textContent = code;
        body.appendChild(codeDiv);

        grid.appendChild(item);

        // Generate QR using qrcode.js
        try {
            if (typeof QRCode === 'undefined') {
                throw new Error('QR library not loaded - Check internet connection');
            }

            // Create a temporary container for the library to render into
            const tempDiv = document.createElement('div');

            new QRCode(tempDiv, {
                text: code,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // The library creates an img tag inside tempDiv
            // We need to wait a brief moment for it to generate the data URL (sync usually, but safe to check)
            const img = tempDiv.querySelector('img');

            if (img) {
                img.style.display = 'block';
                canvasDiv.appendChild(img);
            } else {
                // Fallback: sometimes it renders a canvas if image is not ready
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    const newImg = document.createElement('img');
                    newImg.src = canvas.toDataURL("image/png");
                    newImg.style.width = '150px';
                    newImg.style.height = '150px';
                    canvasDiv.appendChild(newImg);
                } else {
                    // If no image or canvas found, it failed
                    throw new Error('QR Generation failed');
                }
            }

        } catch (e) {
            console.error('QR Gen Error:', e);
            canvasDiv.innerHTML = '<div style="color: red; font-size: 12px; padding: 10px;">Error: ' + e.message + '<br><br>Please check your internet connection to load the QR library.</div>';
        }
    });
}
