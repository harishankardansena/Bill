// === SERVICE WORKER (FOR APP INSTALLATION) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered!', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

let defaultCgst = 6;
let defaultSgst = 6;
let globalItems = [{ name: 'Fly Ash Bricks', hsn: '681599' }];

document.addEventListener('DOMContentLoaded', () => {
  const isAuth = localStorage.getItem('auth_ayush_traders') === 'true';
  if (isAuth) {
    loadSettings(); // Load settings regardless of which screen we are on
    const currentScreen = localStorage.getItem('current_screen');
    if (currentScreen === 'invoice') showInvoiceMaker();
    else if (currentScreen === 'settings') showSettings();
    else showDashboard();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
  }

  // Auto-fill today's date
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  document.getElementById('i-date').value = `${dd}-${mm}-${yyyy}`;

  // Add initial blank row
  addRow('', '', 1, 0, defaultCgst, defaultSgst);
});

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value;
  const pass = document.getElementById('login-password').value;
  if (id === 'Ayush Traders' && pass === 'Ayush@31') {
    localStorage.setItem('auth_ayush_traders', 'true');
    document.getElementById('login-screen').style.display = 'none';
    showDashboard();
  } else {
    document.getElementById('login-error').innerText = 'Invalid ID or Password';
  }
});

async function fetchNextInvoiceNo() {
  try {
    const res = await fetch('/api/next-invoice-no');
    const data = await res.json();
    if (data.success) {
      document.getElementById('i-no').value = data.invoiceNo;
    }
  } catch (error) {
    console.error('Failed to fetch next invoice number:', error);
  }
}

// === NAVIGATION & SETTINGS LOGIC ===
let currentEditId = null;

function hideAllScreens() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('settings-screen').style.display = 'none';
  document.getElementById('view-bills-screen').style.display = 'none';
}

function showDashboard() {
  hideAllScreens();
  document.getElementById('dashboard-screen').style.display = 'block';
  localStorage.setItem('current_screen', 'dashboard');
}

function showInvoiceMaker() {
  hideAllScreens();
  document.getElementById('app-screen').style.display = 'block';
  document.querySelector('.no-print').style.display = 'flex'; // Ensure top bar is visible
  
  // Re-enable all inputs in case they were disabled by view mode
  const allInputs = document.querySelectorAll('#app-screen input, #app-screen textarea, #app-screen select');
  allInputs.forEach(el => el.disabled = false);
  
  document.getElementById('btn-save-reset').innerText = "Create Invoice";
  document.getElementById('btn-save-print').innerText = "Create & Print Invoice";
  currentEditId = null;
  
  localStorage.setItem('current_screen', 'invoice');
  fetchNextInvoiceNo();
}

function showSettings() {
  hideAllScreens();
  document.getElementById('settings-screen').style.display = 'flex';
  localStorage.setItem('current_screen', 'settings');
}

let savedInvoices = [];

async function showViewBills(isEditMode = false) {
  hideAllScreens();
  document.getElementById('view-bills-screen').style.display = 'block';
  localStorage.setItem('current_screen', 'view_bills');
  
  const tbody = document.getElementById('bills-table-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading bills...</td></tr>';
  
  try {
    const res = await fetch('/api/invoices');
    const json = await res.json();
    if (json.success) {
      savedInvoices = json.data;
      renderBillsTable(isEditMode);
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Failed to load bills.</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Error connecting to server.</td></tr>';
  }
}

function renderBillsTable(isEditMode) {
  const tbody = document.getElementById('bills-table-body');
  tbody.innerHTML = '';
  
  if (savedInvoices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No bills saved yet.</td></tr>';
    return;
  }
  
  savedInvoices.forEach((inv, index) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    
    tr.innerHTML = `
      <td style="padding:12px;">${inv.invoiceNo || 'N/A'}</td>
      <td style="padding:12px;">${inv.date || 'N/A'}</td>
      <td style="padding:12px;">${inv.clientName || 'N/A'}</td>
      <td style="padding:12px; font-weight:bold;">₹ ${inv.totalAmount || 0}</td>
      <td style="padding:12px; text-align:right;">
        ${isEditMode ? 
          `<button onclick="editSavedBill(${index})" style="background:#5E2C11; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Edit</button>` :
          `<button onclick="viewSavedBill(${index}, false)" style="background:#002B5B; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-right:5px;">View</button>
           <button onclick="viewSavedBill(${index}, true)" style="background:#5E2C11; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Print</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateInvoiceData(d) {
  document.getElementById('c-name').value = d.clientDetails?.name || '';
  document.getElementById('c-address').value = d.clientDetails?.address || '';
  document.getElementById('c-phone').value = d.clientDetails?.phone || '';
  document.getElementById('c-state').value = d.clientDetails?.state || '';
  
  document.getElementById('i-no').value = d.invoice?.no || '';
  document.getElementById('i-date').value = d.invoice?.date || '';
  document.getElementById('i-supply').value = d.invoice?.supply || '22-Chhattisgarh';
  
  document.getElementById('items-body').innerHTML = '';
  if (d.items && d.items.length > 0) {
    d.items.forEach(item => {
      addRow(item.name, item.hsn, item.qty, item.price, item.cgstPct, item.sgstPct);
    });
  }
  calculate();
}

function viewSavedBill(index, autoPrint) {
  const inv = savedInvoices[index];
  if (!inv || !inv.data) return;
  
  hideAllScreens();
  document.getElementById('app-screen').style.display = 'block';
  
  document.querySelector('.no-print').style.display = 'none';
  
  populateInvoiceData(inv.data);
  
  const allInputs = document.querySelectorAll('#app-screen input, #app-screen textarea, #app-screen select');
  allInputs.forEach(el => el.disabled = true);
  
  const backBtn = document.createElement('button');
  backBtn.innerText = '← Back to Bills';
  backBtn.style.cssText = 'position:fixed; top:20px; left:20px; z-index:9999; padding:10px; background:#555; color:#fff; border:none; border-radius:4px; cursor:pointer;';
  backBtn.className = 'no-print preview-back-btn';
  backBtn.onclick = () => {
    document.querySelector('.preview-back-btn')?.remove();
    document.querySelector('.no-print').style.display = 'flex';
    showViewBills();
  };
  document.body.appendChild(backBtn);
  
  if (autoPrint) {
    setTimeout(() => {
      window.print();
    }, 500);
  }
}

function editSavedBill(index) {
  const inv = savedInvoices[index];
  if (!inv || !inv.data) return;
  
  currentEditId = inv._id;
  hideAllScreens();
  document.getElementById('app-screen').style.display = 'block';
  document.querySelector('.no-print').style.display = 'flex';
  
  const allInputs = document.querySelectorAll('#app-screen input, #app-screen textarea, #app-screen select');
  allInputs.forEach(el => el.disabled = false);
  
  document.getElementById('btn-save-reset').innerText = "Update Invoice";
  document.getElementById('btn-save-print').innerText = "Update & Print";
  
  populateInvoiceData(inv.data);
}

function promptEditBill() {
  const pwd = prompt("Please enter the password to edit previous bills:");
  if (pwd === '24082003') {
    showViewBills(true);
  } else if (pwd !== null) {
    alert("Incorrect Password!");
  }
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const json = await res.json();
    if (json.success) {
      const s = json.data;
      // Populate Settings Form
      document.getElementById('set-name').value = s.firmName;
      document.getElementById('set-msme').value = s.msme;
      document.getElementById('set-address').value = s.address;
      document.getElementById('set-phone').value = s.phone;
      document.getElementById('set-email').value = s.email;
      document.getElementById('set-gstin').value = s.gstin;
      document.getElementById('set-state').value = s.state;
      document.getElementById('set-cgst').value = s.cgstPct;
      document.getElementById('set-sgst').value = s.sgstPct;

      defaultCgst = s.cgstPct || 6;
      defaultSgst = s.sgstPct || 6;
      globalItems = s.items || [{ name: 'Fly Ash Bricks', hsn: '681599' }];

      renderSettingsItems();

      // Populate Invoice HTML
      document.getElementById('f-name').innerText = s.firmName;
      document.getElementById('f-name-sign').innerText = s.firmName;
      document.getElementById('f-msme').innerText = s.msme;
      document.getElementById('f-address').innerText = s.address;
      document.getElementById('f-phone').innerText = s.phone;
      document.getElementById('f-email').innerText = s.email;
      document.getElementById('f-gstin').innerText = s.gstin;
      document.getElementById('f-state').innerText = s.state;
    }
  } catch (err) {
    console.error('Failed to load settings (might be offline)', err);
    // Offline Fallback
    const fallbackName = 'Ayush Traders (Offline)';
    document.getElementById('set-name').value = fallbackName;
    document.getElementById('f-name').innerText = fallbackName;
    document.getElementById('f-name-sign').innerText = fallbackName;
    
    document.getElementById('f-msme').innerText = 'CG-13-0020998';
    document.getElementById('f-address').innerText = 'Near Padma Petrol Pump, Bhalumar Road Gharghoda';
    document.getElementById('f-phone').innerText = '+918319269867';
    document.getElementById('f-email').innerText = 'ayushpanda.ap87@gmail.com';
    document.getElementById('f-gstin').innerText = '22GXDPP8956G1Z1';
    document.getElementById('f-state').innerText = '22-Chhattisgarh';
    
    document.getElementById('set-cgst').value = 6;
    document.getElementById('set-sgst').value = 6;
    defaultCgst = 6;
    defaultSgst = 6;
    globalItems = [{ name: 'Fly Ash Bricks', hsn: '681599' }];
    renderSettingsItems();
  }
}

// === SETTINGS ITEMS LOGIC ===
function renderSettingsItems() {
  const container = document.getElementById('settings-items-container');
  container.innerHTML = '';
  globalItems.forEach((item, index) => {
    addSettingItemRow(item.name, item.hsn);
  });
}

function addSettingItemRow(name = '', hsn = '') {
  const container = document.getElementById('settings-items-container');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '5px';
  div.className = 'setting-item-row';
  div.innerHTML = `
    <input type="text" class="si-name" placeholder="Item Name" value="${name}" style="flex:2; padding:6px; margin:0;">
    <input type="text" class="si-hsn" placeholder="HSN/SAC" value="${hsn}" style="flex:1; padding:6px; margin:0;">
    <button type="button" onclick="this.parentElement.remove()" style="width:auto; padding:6px; background:#cc0000; margin:0;">X</button>
  `;
  container.appendChild(div);
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const itemRows = document.querySelectorAll('.setting-item-row');
  const itemsArray = [];
  itemRows.forEach(row => {
    const n = row.querySelector('.si-name').value.trim();
    const h = row.querySelector('.si-hsn').value.trim();
    if (n) {
      itemsArray.push({ name: n, hsn: h });
    }
  });

  const payload = {
    firmName: document.getElementById('set-name').value,
    msme: document.getElementById('set-msme').value,
    address: document.getElementById('set-address').value,
    phone: document.getElementById('set-phone').value,
    email: document.getElementById('set-email').value,
    gstin: document.getElementById('set-gstin').value,
    state: document.getElementById('set-state').value,
    cgstPct: parseFloat(document.getElementById('set-cgst').value) || 0,
    sgstPct: parseFloat(document.getElementById('set-sgst').value) || 0,
    items: itemsArray
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Settings saved successfully!');
      showDashboard();
    }
  } catch (err) {
    alert('Failed to save settings.');
  }
});

// === INVOICE LOGIC ===
function previewImage(input, imgId) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById(imgId).src = e.target.result;
      document.getElementById(imgId).style.display = 'block';
      input.nextElementSibling.nextElementSibling.style.display = 'none'; // hide placeholder
    }
    reader.readAsDataURL(file);
  }
}

// Convert numbers to words
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees only';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees only' : 'Rupees only';
  return str.trim();
}

window.handleItemChange = function(input) {
  const row = input.closest('tr');
  const hsn = row.querySelector('.i-hsn');
  
  if (input.value === 'Other') {
    // Replace select with a text input for custom entry
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'i-name';
    textInput.placeholder = 'Enter Item Name';
    textInput.style.width = '100%';
    input.parentNode.replaceChild(textInput, input);
    hsn.value = '';
    return;
  }
  
  // Find predefined item to set HSN
  const selectedItem = globalItems.find(item => item.name === input.value);
  if (selectedItem) {
    hsn.value = selectedItem.hsn;
  } else {
    hsn.value = '';
  }
};

let rowCount = 0;
function addRow(name='', hsn='', qty=1, price=0, cgst=null, sgst=null) {
  const tbody = document.getElementById('items-body');
  const currentRowCount = tbody.children.length + 1;
  rowCount = currentRowCount;
  const tr = document.createElement('tr');
  tr.id = `row-${rowCount}`;
  
  const currentCgst = cgst !== null ? cgst : (settingsData?.cgstPct ?? defaultCgst);
  const currentSgst = sgst !== null ? sgst : (settingsData?.sgstPct ?? defaultSgst);
  
  let optionsHtml = '<option value="">-- Select Item --</option>';
  globalItems.forEach(item => {
    optionsHtml += `<option value="${item.name}" ${name === item.name ? 'selected' : ''}>${item.name}</option>`;
  });
  optionsHtml += '<option value="Other">Other (Custom)</option>';

  tr.innerHTML = `
    <td class="row-index">${rowCount}</td>
    <td>
      <select class="i-name" onchange="handleItemChange(this)" style="width:100%; padding:2px;">
        ${optionsHtml}
      </select>
    </td>
    <td><input type="text" class="i-hsn" value="${hsn}" style="width:100%"></td>
    <td><input type="number" class="i-qty" value="${qty === 1 ? '' : qty}" placeholder="1" oninput="calculate()" style="width:100%; text-align:right"></td>
    <td><input type="number" class="i-price" step="0.01" value="${price === 0 ? '' : price}" placeholder="0" oninput="calculate()" style="width:100%; text-align:right"></td>
    <td class="i-taxable">₹ 0.00</td>
    <td class="i-cgst" style="white-space:nowrap; text-align:center;">
      <span class="cgst-val">₹ 0.00</span><br>
      (<input type="number" class="i-cgst-pct" value="${currentCgst}" oninput="calculate()" style="width:30px; text-align:center; padding:1px; margin:0;">%)
    </td>
    <td class="i-sgst" style="white-space:nowrap; text-align:center;">
      <span class="sgst-val">₹ 0.00</span><br>
      (<input type="number" class="i-sgst-pct" value="${currentSgst}" oninput="calculate()" style="width:30px; text-align:center; padding:1px; margin:0;">%)
    </td>
    <td class="i-amt">₹ 0.00</td>
    <td class="no-print" style="white-space:nowrap; text-align:center;">
      <button onclick="addRow('', '', 1, 0)" class="add-btn" style="cursor:pointer; font-weight:bold; padding:2px 5px; margin-right:5px;">+</button>
      <button onclick="removeRow(${rowCount})" class="remove-btn" style="cursor:pointer; color:red; font-weight:bold; padding:2px 5px;">X</button>
    </td>
  `;
  tbody.appendChild(tr);
  updateRowIndices();
  calculate();
}

function removeRow(id) {
  document.getElementById(`row-${id}`).remove();
  updateRowIndices();
  calculate();
}

function updateRowIndices() {
  const rows = document.querySelectorAll('#items-body tr');
  rows.forEach((row, idx) => {
    row.querySelector('.row-index').innerText = idx + 1;
    // Hide X button if only 1 row exists
    const removeBtn = row.querySelector('.remove-btn');
    if (rows.length === 1) {
      removeBtn.style.display = 'none';
    } else {
      removeBtn.style.display = 'inline-block';
    }
  });
}

// Event listener for firm name sync removed as it's static

function calculate() {
  const rows = document.querySelectorAll('#items-body tr');
  
  let totalQty = 0, totalTaxable = 0, totalCgst = 0, totalSgst = 0, grandTotal = 0;

  rows.forEach(row => {
    const qtyStr = row.querySelector('.i-qty').value;
    const qty = qtyStr === '' ? 1 : (parseFloat(qtyStr) || 0);
    
    const priceStr = row.querySelector('.i-price').value;
    const price = priceStr === '' ? 0 : (parseFloat(priceStr) || 0);
    
    const cgstPct = parseFloat(row.querySelector('.i-cgst-pct').value) || 0;
    const sgstPct = parseFloat(row.querySelector('.i-sgst-pct').value) || 0;
    
    totalQty += qty;
    const taxable = qty * price;
    const cgst = taxable * (cgstPct / 100);
    const sgst = taxable * (sgstPct / 100);
    const amount = taxable + cgst + sgst;

    row.querySelector('.i-taxable').innerText = `₹ ${taxable.toFixed(2)}`;
    row.querySelector('.cgst-val').innerText = `₹ ${cgst.toFixed(2)}`;
    row.querySelector('.sgst-val').innerText = `₹ ${sgst.toFixed(2)}`;
    row.querySelector('.i-amt').innerText = `₹ ${amount.toFixed(2)}`;

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    grandTotal += amount;
  });

  document.getElementById('total-qty').innerText = totalQty;
  document.getElementById('total-taxable').innerText = `₹ ${totalTaxable.toFixed(2)}`;
  document.getElementById('total-cgst').innerText = `₹ ${totalCgst.toFixed(2)}`;
  document.getElementById('total-sgst').innerText = `₹ ${totalSgst.toFixed(2)}`;
  document.getElementById('grand-total').innerText = `₹ ${Math.round(grandTotal)}`;

  document.getElementById('tax-details-cgst').innerText = `₹ ${totalCgst.toFixed(2)}`;
  document.getElementById('tax-details-sgst').innerText = `₹ ${totalSgst.toFixed(2)}`;
  
  document.getElementById('amounts-subtotal').innerText = `₹ ${Math.round(grandTotal)}`;
  document.getElementById('amounts-total').innerText = `₹ ${Math.round(grandTotal)}`;
  
  document.getElementById('amount-words').innerText = numberToWords(Math.round(grandTotal));
}

// API Submission
async function saveInvoice(showAlert = true) {
  const invNo = document.getElementById('i-no').value;
  if (invNo === 'Loading...') {
    if (showAlert) alert('Please wait for the invoice number to load before saving.');
    return false;
  }

  const items = [];
  document.querySelectorAll('#items-body tr').forEach(row => {
    const nameEl = row.querySelector('.i-name');
    let nameVal = nameEl ? nameEl.value : '';
    if (nameVal === 'other') {
       const customEl = row.querySelector('input.i-name');
       nameVal = customEl ? customEl.value : '';
    }
    
    items.push({
      name: nameVal,
      hsn: row.querySelector('.i-hsn')?.value || '',
      qty: row.querySelector('.i-qty')?.value || '',
      price: row.querySelector('.i-price')?.value || '',
      cgstPct: row.querySelector('.i-cgst-pct')?.value || 0,
      sgstPct: row.querySelector('.i-sgst-pct')?.value || 0
    });
  });

  const payload = {
    firmDetails: {
      name: document.getElementById('f-name').innerText,
    },
    clientDetails: {
      name: document.getElementById('c-name').value,
      address: document.getElementById('c-address').value,
      phone: document.getElementById('c-phone').value,
      state: document.getElementById('c-state').value,
    },
    invoice: {
      no: document.getElementById('i-no').value,
      date: document.getElementById('i-date').value,
      supply: document.getElementById('i-supply').value
    },
    items: items,
    totals: {
      grandTotal: parseFloat(document.getElementById('amounts-total').innerText.replace('₹', ''))
    }
  };

  try {
    const url = currentEditId ? `/api/invoices/${currentEditId}` : '/api/invoices';
    const method = currentEditId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (showAlert) alert(currentEditId ? 'Invoice updated successfully!' : 'Invoice created successfully!');
      currentEditId = null;
      return true;
    } else {
      if (showAlert) alert('Failed to create invoice.');
      return false;
    }
  } catch (error) {
    console.error(error);
    if (showAlert) alert('Error connecting to backend.');
    return false;
  }
}

async function saveAndReset() {
  const success = await saveInvoice(true);
  if (success) {
    window.location.reload();
  }
}

async function saveAndPrint() {
  const success = await saveInvoice(false);
  if (success) {
    window.print();
    window.location.reload();
  } else {
    alert('Failed to save invoice. Cannot print.');
  }
}
