// PulseCare+ Hospital Management System - Client Application Controller
const AppState = {
  user: null,
  view: 'dashboard',
  beds: [],
  medicines: [],
  selectedMedicine: { name: '', price: 0, stock: 0 }
};

// Lifecycle Bootstrapper
document.addEventListener('DOMContentLoaded', async () => {
  await restoreSession();
  if (AppState.user) {
    updateUIPermissions();
    refreshDashboard();
  }
});

/* ==========================================================================
   1. AUTHENTICATION & PASSWORD VISIBILITY
   ========================================================================== */

function togglePasswordVisibility(fieldId, iconId) {
  const field = document.getElementById(fieldId);
  const icon = document.getElementById(iconId);
  if (!field || !icon) return;

  const isHidden = field.type === 'password';
  field.type = isHidden ? 'text' : 'password';
  icon.classList.toggle('fa-eye', !isHidden);
  icon.classList.toggle('fa-eye-slash', isHidden);
}

function switchAuthTab(targetTab) {
  const isSignIn = targetTab === 'login';
  document.getElementById('login-form')?.classList.toggle('hidden', !isSignIn);
  document.getElementById('signup-form')?.classList.toggle('hidden', isSignIn);
  document.getElementById('tab-login')?.classList.toggle('active', isSignIn);
  document.getElementById('tab-signup')?.classList.toggle('active', !isSignIn);
}

async function fillDemo(username, password) {
  const uBox = document.getElementById('login-username');
  const pBox = document.getElementById('login-password');
  if (uBox && pBox) {
    uBox.value = username;
    pBox.value = password;
    const submitEvt = new Event('submit', { cancelable: true });
    await handleLogin(submitEvt);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const u = document.getElementById('login-username')?.value.trim();
  const p = document.getElementById('login-password')?.value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Authentication failed');

    AppState.user = result.user;
    triggerToast(`Welcome back, ${AppState.user.name}!`, 'success');
    mountPortalView();
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const n = document.getElementById('signup-name')?.value.trim();
  const m = document.getElementById('signup-mobile')?.value.trim();
  const u = document.getElementById('signup-username')?.value.trim();
  const p = document.getElementById('signup-password')?.value.trim();
  const r = document.querySelector('input[name="signup-role"]:checked')?.value || 'patient';

  if (!u || !p) {
    triggerToast('Please provide both username and password.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, mobile_no: m, username: u, password: p, role: r })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');

    AppState.user = result.user;
    triggerToast(result.message || 'Account successfully created!', 'success');
    mountPortalView();
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

async function restoreSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated) {
      AppState.user = data.user;
      mountPortalView();
    } else {
      unmountPortalView();
    }
  } catch {
    unmountPortalView();
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  AppState.user = null;
  triggerToast('Signed out successfully.', 'info');
  unmountPortalView();
}

function mountPortalView() {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-screen')?.classList.remove('hidden');

  const nameEl = document.getElementById('display-user-name');
  const handleEl = document.getElementById('display-user-handle');
  const badgeEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar-initials');

  if (nameEl) nameEl.textContent = AppState.user.name || AppState.user.username;
  if (handleEl) handleEl.textContent = `@${AppState.user.username}`;
  if (avatarEl) avatarEl.textContent = (AppState.user.name || AppState.user.username).slice(0, 2).toUpperCase();

  if (badgeEl) {
    badgeEl.textContent = AppState.user.role.toUpperCase();
    badgeEl.classList.toggle('role-patient', AppState.user.role === 'patient');
  }

  updateUIPermissions();
  switchView('dashboard');
}

function unmountPortalView() {
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.getElementById('app-screen')?.classList.add('hidden');
}

function updateUIPermissions() {
  const isStaff = AppState.user && AppState.user.role === 'staff';
  document.querySelectorAll('.staff-only').forEach(el => el.classList.toggle('hidden', !isStaff));
  document.querySelectorAll('.patient-only').forEach(el => el.classList.toggle('hidden', isStaff));
}

/* ==========================================================================
   2. VIEW NAVIGATION & TOP BUTTON VISIBILITY
   ========================================================================== */

function switchView(viewName) {
  AppState.view = viewName;

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(viewName));
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });

  // Top Action Button: ONLY visible on Dashboard & Consultations
  const quickBtn = document.getElementById('top-quick-action-container');
  if (quickBtn) {
    quickBtn.classList.toggle('hidden', !(viewName === 'dashboard' || viewName === 'consultations'));
  }

  const titles = {
    dashboard: ['Hospital Overview', 'Real-time clinical metrics & status'],
    beds: ['Hospital Ward Bed Matrix (70 Beds)', 'Live theatre-style visualization of admitted patients & occupancy'],
    employees: ['Medical Specialists & Doctors', 'Registry of 10 clinical practitioners and specialists'],
    patients: ['Patient Database (20 Records)', 'Master hospital patient registry and billing records'],
    profile: ['My Health Record & Medical Profile', 'Personal medical records, diagnosis, and medicine purchase history'],
    consultations: ['Consultation Appointments', 'Scheduled clinical appointments & status'],
    prescriptions: ['Digital Prescriptions & Rx Slip', 'Doctor diagnoses, dosage plans & printable slips'],
    pharmacy: ['Pharmacy Stock & Formulations', 'Inventory levels, rates & patient purchases'],
    emt: ['Emergency Medical Fleet (EMT)', 'Ambulance readiness & emergency hotline']
  };

  if (titles[viewName]) {
    document.getElementById('page-title').textContent = titles[viewName][0];
    document.getElementById('page-subtitle').textContent = titles[viewName][1];
  }

  if (viewName === 'dashboard') refreshDashboard();
  if (viewName === 'beds') fetchWardBeds();
  if (viewName === 'employees') fetchEmployees();
  if (viewName === 'patients') fetchPatients();
  if (viewName === 'profile') loadPatientProfile();
  if (viewName === 'consultations') fetchConsultations();
  if (viewName === 'prescriptions') fetchPrescriptions();
  if (viewName === 'pharmacy') fetchPharmacyInventory();
  if (viewName === 'emt') fetchAmbulanceFleet();
}

function openNewActionModal() {
  openModal('modal-add-consultation');
}

/* ==========================================================================
   3. DASHBOARD METRICS
   ========================================================================== */

async function refreshDashboard() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const stats = await res.json();
    const isPatient = AppState.user?.role === 'patient';

    const tTitle = document.getElementById('stat-consultations-title');
    const tMeta = document.getElementById('stat-consultations-meta');
    if (tTitle) tTitle.textContent = isPatient ? 'My Appointments' : 'Total Hospital Appointments';
    if (tMeta) tMeta.innerHTML = isPatient ? '<i class="fa-solid fa-user-check"></i> Booked by you' : '<i class="fa-solid fa-hospital"></i> Hospital-wide';

    document.getElementById('stat-consultations').textContent = stats.scheduled_consultations || 0;
    document.getElementById('stat-available-beds').textContent = stats.available_beds || 0;
    document.getElementById('stat-patients').textContent = stats.patients || 0;
    document.getElementById('stat-employees').textContent = stats.employees || 0;
    document.getElementById('stat-ambulances').textContent = stats.available_ambulances || 0;

    const conRes = await fetch('/api/consultations');
    const appts = await conRes.json();
    const cBody = document.getElementById('dash-consultations-tbody');
    if (cBody) {
      cBody.innerHTML = appts.slice(0, 4).map(c => `
        <tr>
          <td><strong>${sanitize(c.PATIENT_NAME)}</strong></td>
          <td>${sanitize(c.DOCTOR_NAME)}</td>
          <td>${sanitize(c.REASON)}</td>
          <td><span class="status-pill status-${c.STATUS.toLowerCase()}">${c.STATUS}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="text-muted">No scheduled visits.</td></tr>';
    }

    const emtRes = await fetch('/api/emt');
    const emts = await emtRes.json();
    const eBody = document.getElementById('dash-emt-tbody');
    if (eBody) {
      eBody.innerHTML = emts.slice(0, 4).map(e => `
        <tr>
          <td><strong>${sanitize(e.VNO)}</strong></td>
          <td>${sanitize(e.VTYPE)}</td>
          <td>${sanitize(e.DRIVER_NAME)}</td>
          <td><span class="status-pill status-${e.STATUS.toLowerCase()}">${e.STATUS}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="4">No ambulances found.</td></tr>';
    }
  } catch (err) {
    console.error('Error refreshing dashboard metrics:', err);
  }
}

/* ==========================================================================
   4. WARD BEDS (70 BEDS THEATRE MATRIX & 1-BED LIMIT)
   ========================================================================== */

async function fetchWardBeds() {
  try {
    const res = await fetch('/api/beds');
    AppState.beds = await res.json();
    drawBedsMatrix(AppState.beds);
  } catch {
    triggerToast('Could not load hospital ward beds.', 'error');
  }
}

function drawBedsMatrix(bedList) {
  const container = document.getElementById('ward-sections-container');
  if (!container) return;

  const grouped = bedList.reduce((acc, b) => {
    acc[b.WARD_TYPE] = acc[b.WARD_TYPE] || [];
    acc[b.WARD_TYPE].push(b);
    return acc;
  }, {});

  const isStaff = AppState.user?.role === 'staff';

  container.innerHTML = Object.keys(grouped).map(ward => {
    const list = grouped[ward];
    const free = list.filter(b => b.STATUS === 'Available').length;

    return `
      <div class="ward-block glass-panel">
        <div class="ward-block-header">
          <h3><i class="fa-solid fa-hospital"></i> ${sanitize(ward)}</h3>
          <span class="ward-badge">${free} of ${list.length} Beds Available</span>
        </div>
        <div class="beds-grid-theatre">
          ${list.map(b => {
            const isOcc = b.STATUS === 'Occupied';
            return `
              <div class="bed-seat-card state-${b.STATUS.toLowerCase()}" onclick="handleBedSeatClick('${b.BED_ID}')">
                <i class="fa-solid fa-bed"></i>
                <span class="bed-number">${sanitize(b.BED_NUMBER)}</span>
                <span class="bed-status-tag">${b.STATUS}</span>
                ${isOcc ? `
                  <div class="bed-tooltip">
                    <h4><i class="fa-solid fa-user"></i> ${sanitize(b.PATIENT_NAME || 'Patient')}</h4>
                    <p><strong>Age/Gender:</strong> ${b.PATIENT_AGE || '--'} / ${sanitize(b.PATIENT_GENDER || '--')}</p>
                    <p><strong>Diagnosis:</strong> ${sanitize(b.PATIENT_ISSUE || 'Under care')}</p>
                    <p><strong>Blood:</strong> ${sanitize(b.BLOOD_GROUP || 'Unknown')}</p>
                    <p><strong>Admitted:</strong> ${sanitize(b.ASSIGNED_DATE || 'Recent')}</p>
                    ${isStaff ? '<p style="color:#38bdf8;font-weight:bold;margin-top:4px;">Click to Discharge</p>' : ''}
                  </div>
                ` : `
                  <div class="bed-tooltip">
                    <h4>Bed ${sanitize(b.BED_NUMBER)}</h4>
                    <p style="color:#34d399;">Sanitized & Available.</p>
                    <p style="color:#38bdf8;font-weight:bold;margin-top:4px;">
                      ${isStaff ? 'Click to Allocate' : 'Click to Reserve'}
                    </p>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function handleBedSeatClick(bedId) {
  const bed = AppState.beds.find(b => b.BED_ID === bedId);
  if (!bed) return;

  if (AppState.user?.role === 'patient') {
    if (bed.STATUS === 'Available') {
      if (confirm(`Would you like to reserve Bed ${bed.BED_NUMBER} in ${bed.WARD_TYPE}?`)) {
        try {
          const res = await fetch('/api/beds/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ BED_ID: bedId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not reserve bed');

          triggerToast(data.message, 'success');
          await fetchWardBeds();
          await refreshDashboard();
        } catch (err) {
          triggerToast(err.message, 'error');
        }
      }
    } else {
      triggerToast(`Bed ${bed.BED_NUMBER} is ${bed.STATUS.toLowerCase()}.`, 'info');
    }
    return;
  }

  // Staff Operations
  if (bed.STATUS === 'Occupied') {
    if (confirm(`Discharge patient ${bed.PATIENT_NAME} from ${bed.BED_NUMBER} (${bed.WARD_TYPE})?`)) {
      const res = await fetch('/api/beds/vacate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ BED_ID: bedId })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(data.message, 'success');
        await fetchWardBeds();
        await refreshDashboard();
      } else {
        triggerToast(data.error, 'error');
      }
    }
  } else if (bed.STATUS === 'Available') {
    openModal('modal-assign-bed');
    setTimeout(() => {
      const select = document.getElementById('bed-select-id');
      if (select) select.value = bedId;
    }, 150);
  }
}

async function handleAssignBed(event) {
  event.preventDefault();
  const bid = document.getElementById('bed-select-id')?.value;
  const pid = document.getElementById('bed-patient-id')?.value;

  try {
    const res = await fetch('/api/beds/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ BED_ID: bid, PATIENT_ID: pid })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Allocation failed');

    triggerToast(data.message, 'success');
    closeModal('modal-assign-bed');
    await fetchWardBeds();
    await refreshDashboard();
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

/* ==========================================================================
   5. PATIENT MEDICAL PROFILE & HEALTH RECORDS
   ========================================================================= */

async function loadPatientProfile() {
  try {
    const res = await fetch('/api/patient/profile');
    const profile = await res.json();
    if (!res.ok) throw new Error(profile.error || 'Profile load failed');

    document.getElementById('prof-name').value = profile.NAME || '';
    document.getElementById('prof-mobile').value = profile.MOBILE_NO || '';
    document.getElementById('prof-age').value = profile.AGE || '';
    document.getElementById('prof-gender').value = profile.GENDER || 'Male';
    document.getElementById('prof-blood').value = profile.BLOOD_GROUP || 'Unknown';
    document.getElementById('prof-allergies').value = profile.ALLERGIES || '';
    document.getElementById('prof-issue').value = profile.ISSUE || '';
    document.getElementById('prof-history').value = profile.MEDICAL_HISTORY || '';

    const pBadge = document.getElementById('profile-pid-badge');
    if (pBadge) pBadge.textContent = profile.PID || 'PAT';

    const bBadge = document.getElementById('prof-bed-info');
    if (bBadge) {
      if (profile.BED_NUMBER) {
        bBadge.innerHTML = `<i class="fa-solid fa-bed"></i> Bed: ${profile.BED_NUMBER} (${profile.WARD_TYPE})`;
        bBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        bBadge.style.color = '#f87171';
      } else {
        bBadge.innerHTML = `<i class="fa-solid fa-bed"></i> Bed: Not currently admitted`;
        bBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        bBadge.style.color = '#34d399';
      }
    }

    const billEl = document.getElementById('prof-bill-info');
    if (billEl) billEl.textContent = `Bill No: ${profile.BILL_NO || 'N/A'}`;

    await loadPurchaseReceipts('profile-purchases-tbody');
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const payload = {
    NAME: document.getElementById('prof-name').value.trim(),
    MOBILE_NO: document.getElementById('prof-mobile').value.trim(),
    AGE: parseInt(document.getElementById('prof-age').value, 10),
    GENDER: document.getElementById('prof-gender').value,
    BLOOD_GROUP: document.getElementById('prof-blood').value,
    ALLERGIES: document.getElementById('prof-allergies').value.trim(),
    ISSUE: document.getElementById('prof-issue').value.trim(),
    MEDICAL_HISTORY: document.getElementById('prof-history').value.trim()
  };

  try {
    const res = await fetch('/api/patient/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');

    triggerToast(data.message, 'success');
    AppState.user.name = payload.NAME;
    document.getElementById('display-user-name').textContent = payload.NAME;
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

/* ==========================================================================
   6. PHARMACY INVENTORY & MEDICINE PURCHASING
   ========================================================================== */

async function fetchPharmacyInventory() {
  try {
    const res = await fetch('/api/pharmacy');
    AppState.medicines = await res.json();
    const tbody = document.getElementById('pharmacy-tbody');
    const isStaff = AppState.user?.role === 'staff';

    tbody.innerHTML = AppState.medicines.map(m => {
      const inStock = m.STOCK > 0;
      return `
        <tr>
          <td><strong>${sanitize(m.MEDICINE_NAME)}</strong></td>
          <td><span class="badge-role">${sanitize(m.MEDICINE_TYPE)}</span></td>
          <td>
            ${isStaff ? `
              <span style="color:${m.STOCK < 50 ? '#f87171' : '#34d399'};font-weight:700;">
                ${m.STOCK} units ${m.STOCK < 50 ? '(Low)' : ''}
              </span>
            ` : `
              <span class="stock-badge-tag ${inStock ? 'stock-in' : 'stock-out'}">
                <i class="fa-solid ${inStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                ${inStock ? 'Available' : 'Out of Stock'}
              </span>
            `}
          </td>
          <td>₹${Number(m.PRICE).toFixed(2)}</td>
          <td>
            ${isStaff ? `
              <button class="btn btn-sm btn-outline" onclick="promptStockUpdate('${sanitize(m.MEDICINE_NAME)}', ${m.STOCK})">
                <i class="fa-solid fa-boxes-stacked"></i> Update Stock
              </button>
            ` : `
              <button class="btn btn-sm btn-primary" onclick="openBuyMedicineModal('${sanitize(m.MEDICINE_NAME)}', ${m.PRICE}, ${m.STOCK})" ${!inStock ? 'disabled' : ''}>
                <i class="fa-solid fa-cart-plus"></i> Buy Medicine
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5">Pharmacy catalog is empty.</td></tr>';

    if (isStaff) {
      await loadPurchaseReceipts('admin-purchases-tbody');
    }
  } catch {
    triggerToast('Failed to load pharmacy catalog.', 'error');
  }
}

function openBuyMedicineModal(name, price, stock) {
  AppState.selectedMedicine = { name, price, stock };
  document.getElementById('buy-med-name').value = name;
  document.getElementById('buy-med-price').value = `₹${price.toFixed(2)}`;
  document.getElementById('buy-med-qty').value = 1;
  calculatePurchaseTotal();
  openModal('modal-buy-medicine');
}

function calculatePurchaseTotal() {
  const qBox = document.getElementById('buy-med-qty');
  const qty = parseInt(qBox.value, 10) || 1;

  if (qty > AppState.selectedMedicine.stock) {
    triggerToast(`Warning: Requested quantity (${qty}) exceeds stock (${AppState.selectedMedicine.stock} units).`, 'error');
  }

  const amt = qty * AppState.selectedMedicine.price;
  document.getElementById('buy-med-total').textContent = `₹${amt.toFixed(2)}`;
}

async function handleBuyMedicine(event) {
  event.preventDefault();
  const name = document.getElementById('buy-med-name').value;
  const qty = parseInt(document.getElementById('buy-med-qty').value, 10);

  if (qty > AppState.selectedMedicine.stock) {
    triggerToast(`Cannot proceed: Request exceeds available units (${AppState.selectedMedicine.stock}).`, 'error');
    return;
  }

  try {
    const res = await fetch('/api/pharmacy/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MEDICINE_NAME: name, QUANTITY: qty })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Purchase failed');

    triggerToast(data.message, 'success');
    closeModal('modal-buy-medicine');
    await fetchPharmacyInventory();
    await refreshDashboard();
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

async function loadPurchaseReceipts(targetTbodyId) {
  const tbody = document.getElementById(targetTbodyId);
  if (!tbody) return;

  try {
    const res = await fetch('/api/pharmacy/purchases');
    const items = await res.json();

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No purchase records found.</td></tr>';
      return;
    }

    const isStaffTable = targetTbodyId === 'admin-purchases-tbody';
    tbody.innerHTML = items.map(o => `
      <tr>
        <td><code>${sanitize(o.PURCHASE_ID)}</code></td>
        ${isStaffTable ? `<td><strong>${sanitize(o.PATIENT_NAME)}</strong></td>` : ''}
        <td><strong>${sanitize(o.MEDICINE_NAME)}</strong></td>
        <td>${o.QUANTITY}</td>
        <td><strong style="color:#34d399;">₹${Number(o.TOTAL_PRICE).toFixed(2)}</strong></td>
        <td><small>${sanitize(o.PURCHASE_DATE)}</small></td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Failed to load purchase records.</td></tr>';
  }
}

async function handleAddMedicine(event) {
  event.preventDefault();
  const payload = {
    MEDICINE_NAME: document.getElementById('med-name').value.trim(),
    MEDICINE_TYPE: document.getElementById('med-type').value,
    STOCK: parseInt(document.getElementById('med-stock').value, 10),
    PRICE: parseFloat(document.getElementById('med-price').value)
  };

  const res = await fetch('/api/pharmacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    triggerToast(data.message, 'success');
    closeModal('modal-add-medicine');
    await fetchPharmacyInventory();
    await refreshDashboard();
  } else {
    triggerToast(data.error, 'error');
  }
}

async function promptStockUpdate(name, currentStock) {
  const val = prompt(`Update stock count for ${name}:`, currentStock);
  if (val !== null && !isNaN(val)) {
    await fetch(`/api/pharmacy/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ STOCK: parseInt(val, 10) })
    });
    triggerToast(`Stock updated for ${name}`, 'success');
    await fetchPharmacyInventory();
  }
}

/* ==========================================================================
   7. EMPLOYEES (DOCTORS REGISTRY)
   ========================================================================== */

async function fetchEmployees() {
  try {
    const res = await fetch('/api/employees');
    const docs = await res.json();
    const tbody = document.getElementById('employees-tbody');

    tbody.innerHTML = docs.map(d => `
      <tr>
        <td><code>${sanitize(d.EID)}</code></td>
        <td><strong>${sanitize(d.NAME)}</strong></td>
        <td><span class="badge-role">${sanitize(d.DEPARTMENT)}</span></td>
        <td>${d.AGE} / ${sanitize(d.GENDER)}</td>
        <td>₹${Number(d.SALARY).toLocaleString()}</td>
        <td><a href="tel:${d.MOBILE_NO}" style="color:#38bdf8;text-decoration:none;"><i class="fa-solid fa-phone"></i> ${sanitize(d.MOBILE_NO || 'N/A')}</a></td>
        <td>
          <button class="btn-danger-sm" onclick="deleteDoctor('${d.EID}')" title="Delete doctor record">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7">No medical staff found.</td></tr>';
  } catch {
    triggerToast('Failed to load doctors list', 'error');
  }
}

async function handleAddEmployee(event) {
  event.preventDefault();
  const payload = {
    EID: document.getElementById('emp-eid').value.trim(),
    NAME: document.getElementById('emp-name').value.trim(),
    DEPARTMENT: document.getElementById('emp-dept').value.trim(),
    MOBILE_NO: document.getElementById('emp-mobile').value.trim(),
    AGE: parseInt(document.getElementById('emp-age').value, 10),
    GENDER: document.getElementById('emp-gender').value,
    SALARY: parseFloat(document.getElementById('emp-salary').value)
  };

  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    triggerToast(data.message, 'success');
    closeModal('modal-add-employee');
    await fetchEmployees();
    await refreshDashboard();
  } else {
    triggerToast(data.error, 'error');
  }
}

async function deleteDoctor(eid) {
  if (confirm(`Remove doctor/staff record for ${eid}?`)) {
    const res = await fetch(`/api/employees/${eid}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      triggerToast(data.message, 'success');
      await fetchEmployees();
      await refreshDashboard();
    } else {
      triggerToast(data.error, 'error');
    }
  }
}

/* ==========================================================================
   8. PATIENTS REGISTRY (STAFF VIEW)
   ========================================================================== */

async function fetchPatients() {
  try {
    const res = await fetch('/api/patients');
    const pats = await res.json();
    const tbody = document.getElementById('patients-tbody');

    tbody.innerHTML = pats.map(p => `
      <tr>
        <td><code>${sanitize(p.PID)}</code></td>
        <td><strong>${sanitize(p.NAME)}</strong></td>
        <td>${sanitize(p.ISSUE || 'General Checkup')}</td>
        <td>${sanitize(p.BLOOD_GROUP || 'Unknown')} / <small>${sanitize(p.ALLERGIES || 'None')}</small></td>
        <td>${p.AGE || '--'} / ${sanitize(p.GENDER || '--')}</td>
        <td>${p.BED_NUMBER ? `<span class="badge-role" style="background:rgba(239,68,68,0.2);color:#f87171;">${p.BED_NUMBER} (${p.WARD_TYPE})</span>` : '<span class="text-muted">None</span>'}</td>
        <td><a href="tel:${p.MOBILE_NO}" style="color:#38bdf8;text-decoration:none;"><i class="fa-solid fa-phone"></i> ${sanitize(p.MOBILE_NO || 'N/A')}</a></td>
        <td><span class="badge-role">${sanitize(p.BILL_NO || 'N/A')}</span></td>
        <td>
          <button class="btn-danger-sm" onclick="deletePatientRecord('${p.PID}')" title="Delete record">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="9">No patient records available.</td></tr>';
  } catch {
    triggerToast('Failed to load patient database', 'error');
  }
}

async function handleAddPatient(event) {
  event.preventDefault();
  const payload = {
    NAME: document.getElementById('pat-name').value.trim(),
    ISSUE: document.getElementById('pat-issue').value.trim(),
    AGE: parseInt(document.getElementById('pat-age').value, 10),
    GENDER: document.getElementById('pat-gender').value,
    FEES: parseFloat(document.getElementById('pat-fees').value),
    MOBILE_NO: document.getElementById('pat-mobile').value.trim()
  };

  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    triggerToast(data.message, 'success');
    closeModal('modal-add-patient');
    await fetchPatients();
    await refreshDashboard();
  } else {
    triggerToast(data.error, 'error');
  }
}

async function deletePatientRecord(pid) {
  if (confirm(`Are you sure you want to delete patient ${pid}?`)) {
    const res = await fetch(`/api/patients/${pid}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      triggerToast(data.message, 'success');
      await fetchPatients();
      await refreshDashboard();
    } else {
      triggerToast(data.error, 'error');
    }
  }
}

/* ==========================================================================
   9. CONSULTATIONS & PRESCRIBE
   ========================================================================== */

async function fetchConsultations() {
  try {
    const res = await fetch('/api/consultations');
    const items = await res.json();
    const tbody = document.getElementById('consultations-tbody');
    const isStaff = AppState.user?.role === 'staff';

    tbody.innerHTML = items.map(c => `
      <tr>
        <td><code>${sanitize(c.CONSULTATION_ID)}</code></td>
        <td><strong>${sanitize(c.PATIENT_NAME)}</strong></td>
        <td>${sanitize(c.DOCTOR_NAME)} <small style="color:#94a3b8;">(${sanitize(c.DEPARTMENT)})</small></td>
        <td>${sanitize(c.REASON)}</td>
        <td>₹${Number(c.FEES || 0).toLocaleString()}</td>
        <td>${sanitize(c.TIME)}</td>
        <td><span class="status-pill status-${c.STATUS.toLowerCase()}">${c.STATUS}</span></td>
        ${isStaff ? `
          <td>
            ${c.STATUS === 'Scheduled' ? `
              <button class="btn btn-sm btn-primary" onclick="preparePrescriptionFor('${c.CONSULTATION_ID}')">
                <i class="fa-solid fa-file-prescription"></i> Prescribe
              </button>
            ` : '<small class="text-muted"><i class="fa-solid fa-check"></i> Completed</small>'}
          </td>
        ` : ''}
      </tr>
    `).join('') || '<tr><td colspan="8">No consultations scheduled.</td></tr>';
  } catch {
    triggerToast('Failed to load consultations list', 'error');
  }
}

async function handleBookConsultation(event) {
  event.preventDefault();
  const payload = {
    PATIENT_ID: document.getElementById('con-patient-id')?.value,
    EMP_ID: document.getElementById('con-doctor-id').value,
    REASON: document.getElementById('con-reason').value.trim(),
    FEES: parseFloat(document.getElementById('con-fee').value),
    TIME: document.getElementById('con-time').value.replace('T', ' ')
  };

  const res = await fetch('/api/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    triggerToast(data.message, 'success');
    closeModal('modal-add-consultation');
    await fetchConsultations();
    await refreshDashboard();
  } else {
    triggerToast(data.error, 'error');
  }
}

async function preparePrescriptionFor(cid) {
  try {
    const res = await fetch(`/api/consultations/${cid}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fetch failed');

    openModal('modal-add-prescription');
    setTimeout(() => {
      const drop = document.getElementById('rx-consultation-id');
      if (drop) {
        drop.innerHTML = `<option value="${data.CONSULTATION_ID}" selected>${data.CONSULTATION_ID} - ${data.PATIENT_NAME} (Dr. ${data.DOCTOR_NAME})</option>`;
      }
      document.getElementById('rx-diagnosis').value = data.REASON || '';
    }, 150);
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

function addMedicineRow() {
  const cont = document.getElementById('rx-meds-container');
  const row = document.createElement('div');
  row.className = 'medicine-row';
  row.innerHTML = `
    <input type="text" placeholder="Medicine Name (e.g. Paracetamol 650mg)" class="rx-med-name" required />
    <input type="text" placeholder="Dosage (e.g. 1 Tablet)" class="rx-med-dosage" value="1 Tablet" />
    <input type="text" placeholder="Frequency (e.g. Twice daily)" class="rx-med-freq" value="Twice daily after meals" />
    <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()" title="Remove"><i class="fa-solid fa-xmark"></i></button>
  `;
  cont.appendChild(row);
}

async function handleCreatePrescription(event) {
  event.preventDefault();
  const rows = document.querySelectorAll('.medicine-row');
  const meds = [];

  rows.forEach(r => {
    const name = r.querySelector('.rx-med-name')?.value.trim();
    if (name) {
      meds.push({
        name,
        dosage: r.querySelector('.rx-med-dosage')?.value.trim() || '1 Tablet',
        frequency: r.querySelector('.rx-med-freq')?.value.trim() || 'Twice daily',
        duration: '5 Days'
      });
    }
  });

  const payload = {
    CONSULTATION_ID: document.getElementById('rx-consultation-id').value,
    DIAGNOSIS: document.getElementById('rx-diagnosis').value.trim(),
    INSTRUCTIONS: document.getElementById('rx-instructions').value.trim(),
    MEDICINES: meds
  };

  try {
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prescription creation failed');

    triggerToast(data.message, 'success');
    closeModal('modal-add-prescription');
    switchView('prescriptions');
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

/* ==========================================================================
   10. PRESCRIPTIONS LIST & PRINTABLE RX SLIP
   ========================================================================== */

async function fetchPrescriptions() {
  try {
    const res = await fetch('/api/prescriptions');
    const items = await res.json();
    const cont = document.getElementById('prescriptions-container');

    cont.innerHTML = items.map(rx => `
      <div class="prescription-card">
        <div>
          <div class="rx-head">
            <span class="rx-num"><i class="fa-solid fa-file-waveform"></i> ${sanitize(rx.PRESCRIPTION_ID)}</span>
            <span class="rx-date"><i class="fa-solid fa-calendar"></i> ${sanitize(rx.DATE)}</span>
          </div>
          <div class="rx-patient">${sanitize(rx.PATIENT_NAME)}</div>
          <small class="text-muted"><i class="fa-solid fa-user-doctor"></i> Dr. ${sanitize(rx.DOCTOR_NAME)} (${sanitize(rx.DEPARTMENT)})</small>
          <div class="rx-diag"><strong>Diagnosis:</strong> ${sanitize(rx.DIAGNOSIS)}</div>
          ${rx.INSTRUCTIONS ? `<div class="rx-diag"><strong>Advice:</strong> ${sanitize(rx.INSTRUCTIONS)}</div>` : ''}
          <div class="rx-meds-list">
            ${rx.medicines.map(m => `
              <div class="rx-med-item">
                <span><strong>${sanitize(m.MEDICINE_NAME)}</strong> (${sanitize(m.DOSAGE)})</span>
                <span>${sanitize(m.FREQUENCY)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <button class="btn btn-sm btn-outline btn-block" onclick="openPrescriptionSlip('${rx.PRESCRIPTION_ID}')" style="margin-top:10px;">
          <i class="fa-solid fa-download"></i> Download / Print Rx Slip
        </button>
      </div>
    `).join('') || '<p class="text-muted">No prescriptions recorded yet.</p>';
  } catch {
    triggerToast('Failed to load prescriptions', 'error');
  }
}

async function openPrescriptionSlip(rxId) {
  try {
    const res = await fetch(`/api/prescriptions/${rxId}`);
    const rx = await res.json();
    if (!res.ok) throw new Error(rx.error || 'Slip fetch failed');

    const cont = document.getElementById('printable-rx-content');
    cont.innerHTML = `
      <div class="prescription-slip">
        <div class="slip-header">
          <div>
            <div class="slip-hospital-title">PulseCare+ Specialty Hospital</div>
            <p style="font-size:12px;color:#64748b;">Emergency Care & Multi-Specialty Clinical Center</p>
            <p style="font-size:11px;color:#64748b;">24/7 Helpline: +91 98765 43210 | www.pulsecare.hospital</p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:18px;font-weight:800;color:#0284c7;">℞ PRESCRIPTION</span>
            <p style="font-size:12px;font-weight:700;">ID: ${sanitize(rx.PRESCRIPTION_ID)}</p>
            <p style="font-size:12px;">Date: ${sanitize(rx.DATE)}</p>
          </div>
        </div>
        <div class="slip-patient-info">
          <div>
            <p><strong>Patient:</strong> ${sanitize(rx.PATIENT_NAME)} (PID: ${sanitize(rx.PATIENT_ID)})</p>
            <p><strong>Age/Gender:</strong> ${rx.PATIENT_AGE || '--'} / ${sanitize(rx.PATIENT_GENDER || '--')}</p>
            <p><strong>Mobile:</strong> ${sanitize(rx.PATIENT_MOBILE || 'N/A')}</p>
          </div>
          <div>
            <p><strong>Doctor:</strong> ${sanitize(rx.DOCTOR_NAME)}</p>
            <p><strong>Department:</strong> ${sanitize(rx.DEPARTMENT)}</p>
            <p><strong>Ref:</strong> ${sanitize(rx.CONSULTATION_ID)}</p>
          </div>
        </div>
        <div style="margin:14px 0;">
          <p><strong>Diagnosis:</strong> <span style="font-weight:700;">${sanitize(rx.DIAGNOSIS)}</span></p>
          ${rx.INSTRUCTIONS ? `<p style="margin-top:4px;"><strong>Advice:</strong> ${sanitize(rx.INSTRUCTIONS)}</p>` : ''}
        </div>
        <table class="slip-table">
          <thead>
            <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
          </thead>
          <tbody>
            ${rx.medicines.map((m, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${sanitize(m.MEDICINE_NAME)}</strong></td>
                <td>${sanitize(m.DOSAGE)}</td>
                <td>${sanitize(m.FREQUENCY)}</td>
                <td>${sanitize(m.DURATION)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="slip-footer">
          <p style="font-size:11px;color:#64748b;">Digitally validated clinical record.</p>
          <div class="slip-sign-line">
            Dr. ${sanitize(rx.DOCTOR_NAME)}<br>
            <span style="font-size:10px;font-weight:normal;">Attending Medical Specialist</span>
          </div>
        </div>
      </div>
    `;

    openModal('modal-download-prescription');
  } catch (err) {
    triggerToast(err.message, 'error');
  }
}

/* ==========================================================================
   11. AMBULANCE FLEET (EMT)
   ========================================================================== */

async function fetchAmbulanceFleet() {
  try {
    const res = await fetch('/api/emt');
    const fleet = await res.json();
    const tbody = document.getElementById('emt-tbody');
    const isStaff = AppState.user?.role === 'staff';

    tbody.innerHTML = fleet.map(a => `
      <tr>
        <td><code>${sanitize(a.VNO)}</code></td>
        <td><strong>${sanitize(a.VTYPE)}</strong></td>
        <td>${sanitize(a.DRIVER_NAME)}</td>
        <td><a href="tel:${a.MOBILE_NO}" style="color:#38bdf8;text-decoration:none;"><i class="fa-solid fa-phone"></i> ${sanitize(a.MOBILE_NO)}</a></td>
        <td><span class="status-pill status-${a.STATUS.toLowerCase()}">${a.STATUS}</span></td>
        ${isStaff ? `
          <td>
            <select onchange="changeAmbulanceStatus('${a.VNO}', this.value)" style="padding:4px 8px;border-radius:6px;background:rgba(0,0,0,0.5);color:#fff;border:1px solid var(--border-color);">
              <option value="Available" ${a.STATUS === 'Available' ? 'selected' : ''}>Available</option>
              <option value="Dispatched" ${a.STATUS === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
              <option value="Maintenance" ${a.STATUS === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
          </td>
        ` : ''}
      </tr>
    `).join('') || '<tr><td colspan="6">No ambulances registered.</td></tr>';
  } catch {
    triggerToast('Failed to load EMT fleet.', 'error');
  }
}

async function handleAddEmt(event) {
  event.preventDefault();
  const payload = {
    VNO: document.getElementById('emt-vno').value.trim(),
    VTYPE: document.getElementById('emt-vtype').value,
    DRIVER_NAME: document.getElementById('emt-driver').value.trim(),
    MOBILE_NO: document.getElementById('emt-mobile').value.trim(),
    STATUS: 'Available'
  };

  const res = await fetch('/api/emt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    triggerToast(data.message, 'success');
    closeModal('modal-add-emt');
    await fetchAmbulanceFleet();
    await refreshDashboard();
  } else {
    triggerToast(data.error, 'error');
  }
}

async function changeAmbulanceStatus(vno, nextStatus) {
  try {
    const res = await fetch(`/api/emt/${vno}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ STATUS: nextStatus })
    });
    if (res.ok) {
      triggerToast(`Ambulance ${vno} marked as ${nextStatus}`, 'success');
      await refreshDashboard();
    }
  } catch {
    triggerToast('Could not update vehicle state.', 'error');
  }
}

/* ==========================================================================
   12. MODALS, UTILITIES & HELPERS
   ========================================================================== */

function openModal(id) {
  if (id === 'modal-add-consultation') initConsultationSelectors();
  if (id === 'modal-add-prescription') {
    initPrescriptionSelectors();
    const cont = document.getElementById('rx-meds-container');
    if (cont) cont.innerHTML = '';
    addMedicineRow();
  }
  if (id === 'modal-assign-bed') initBedSelectors();
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

async function initConsultationSelectors() {
  const pDrop = document.getElementById('con-patient-id');
  const dDrop = document.getElementById('con-doctor-id');

  if (pDrop) {
    const pRes = await fetch('/api/patients');
    const pList = await pRes.json();
    pDrop.innerHTML = pList.map(p => `<option value="${p.PID}">${p.NAME} (${p.PID})</option>`).join('');
  }

  if (dDrop) {
    const dRes = await fetch('/api/employees');
    const dList = await dRes.json();
    dDrop.innerHTML = dList.map(d => `<option value="${d.EID}">${d.NAME} - ${d.DEPARTMENT}</option>`).join('');
  }

  const dt = new Date();
  dt.setHours(dt.getHours() + 1);
  dt.setMinutes(0);
  document.getElementById('con-time').value = dt.toISOString().slice(0, 16);
}

async function initPrescriptionSelectors() {
  const rxDrop = document.getElementById('rx-consultation-id');
  const res = await fetch('/api/consultations');
  const list = await res.json();
  const sched = list.filter(c => c.STATUS === 'Scheduled');
  rxDrop.innerHTML = sched.map(c => `<option value="${c.CONSULTATION_ID}">${c.CONSULTATION_ID} - ${c.PATIENT_NAME} (Dr. ${c.DOCTOR_NAME})</option>`).join('') || '<option value="">No Active Consultations</option>';
}

async function initBedSelectors() {
  const bDrop = document.getElementById('bed-select-id');
  const pDrop = document.getElementById('bed-patient-id');

  if (bDrop) {
    const free = AppState.beds.filter(b => b.STATUS === 'Available');
    bDrop.innerHTML = free.map(b => `<option value="${b.BED_ID}">${b.BED_ID} - ${b.WARD_TYPE} (${b.BED_NUMBER})</option>`).join('') || '<option value="">No Available Beds</option>';
  }

  if (pDrop) {
    const pRes = await fetch('/api/patients');
    const pList = await pRes.json();
    pDrop.innerHTML = pList.map(p => `<option value="${p.PID}">${p.NAME} (${p.PID}) - ${p.ISSUE || 'Patient'}</option>`).join('');
  }
}

async function resetDatabasePrompt() {
  if (confirm('Reset the database with 70 Ward Beds, 10 Doctors, and 20 Patients?')) {
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    const data = await res.json();
    triggerToast(data.message, 'success');
    await refreshDashboard();
    if (AppState.view === 'beds') await fetchWardBeds();
    if (AppState.view === 'employees') await fetchEmployees();
    if (AppState.view === 'patients') await fetchPatients();
    if (AppState.view === 'pharmacy') await fetchPharmacyInventory();
    if (AppState.view === 'profile') await loadPatientProfile();
  }
}

function filterTable(tableId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterPrescriptions(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.prescription-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function triggerToast(msg, type = 'info') {
  const box = document.getElementById('toast-container');
  if (!box) return;

  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${sanitize(msg)}</span>`;
  box.appendChild(item);
  setTimeout(() => item.remove(), 4000);
}

function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
