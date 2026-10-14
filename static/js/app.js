/* ==========================================================================
   PulseCare+ Hospital Management System - Complete Client Application Logic
   ========================================================================== */

let activeUser = null;
let activeView = 'dashboard';
let hospitalBedsCache = [];
let pharmacyInventoryCache = [];

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await verifySessionState();
  if (activeUser) {
    applyRolePermissions();
    refreshDashboard();
  }
});

/* --------------------------------------------------------------------------
   1. Password Toggle & Authentication Handlers
   -------------------------------------------------------------------------- */

function togglePasswordVisibility(inputFieldId, eyeIconId) {
  const passwordInput = document.getElementById(inputFieldId);
  const eyeIcon = document.getElementById(eyeIconId);

  if (!passwordInput || !eyeIcon) return;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
}

function switchAuthTab(targetTab) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginTabBtn = document.getElementById('tab-login');
  const signupTabBtn = document.getElementById('tab-signup');

  if (targetTab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.add('active');
  }
}

function fillDemo(username, password) {
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
}

async function handleLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value.trim();

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Login failed');

    activeUser = payload.user;
    notifyUser(`Welcome back, ${activeUser.name}!`, 'success');
    renderAuthenticatedPortal();
  } catch (err) {
    notifyUser(err.message, 'error');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const nameVal = document.getElementById('signup-name').value.trim();
  const mobileVal = document.getElementById('signup-mobile').value.trim();
  const usernameVal = document.getElementById('signup-username').value.trim();
  const passwordVal = document.getElementById('signup-password').value.trim();
  const roleVal = document.querySelector('input[name="signup-role"]:checked').value;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameVal,
        mobile_no: mobileVal,
        username: usernameVal,
        password: passwordVal,
        role: roleVal
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Registration failed');

    activeUser = payload.user;
    notifyUser(`Account registered as ${roleVal.toUpperCase()}!`, 'success');
    renderAuthenticatedPortal();
  } catch (err) {
    notifyUser(err.message, 'error');
  }
}

async function verifySessionState() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (data.authenticated) {
      activeUser = data.user;
      renderAuthenticatedPortal();
    } else {
      renderUnauthenticatedView();
    }
  } catch (err) {
    renderUnauthenticatedView();
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  activeUser = null;
  notifyUser('You have been logged out.', 'info');
  renderUnauthenticatedView();
}

function renderUnauthenticatedView() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function renderAuthenticatedPortal() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  document.getElementById('display-user-name').textContent = activeUser.name || activeUser.username;
  document.getElementById('display-user-handle').textContent = `@${activeUser.username}`;

  const initials = (activeUser.name || activeUser.username).slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials;

  const roleIndicator = document.getElementById('user-role-badge');
  roleIndicator.textContent = activeUser.role.toUpperCase();
  if (activeUser.role === 'patient') {
    roleIndicator.classList.add('role-patient');
  } else {
    roleIndicator.classList.remove('role-patient');
  }

  applyRolePermissions();
  switchView('dashboard');
}

function applyRolePermissions() {
  const isStaff = activeUser && activeUser.role === 'staff';

  document.querySelectorAll('.staff-only').forEach((elem) => {
    if (isStaff) {
      elem.classList.remove('hidden');
    } else {
      elem.classList.add('hidden');
    }
  });

  document.querySelectorAll('.patient-only').forEach((elem) => {
    if (!isStaff) {
      elem.classList.remove('hidden');
    } else {
      elem.classList.add('hidden');
    }
  });
}

/* --------------------------------------------------------------------------
   2. View Routing & Top Action Button Visibility Control
   -------------------------------------------------------------------------- */

function switchView(targetViewKey) {
  activeView = targetViewKey;

  // Update Sidebar Active States
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((button) => {
    button.classList.remove('active');
  });

  const activeNavButton = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'))
    .find((btn) => btn.getAttribute('onclick')?.includes(targetViewKey));
  if (activeNavButton) activeNavButton.classList.add('active');

  // Toggle View Panels
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
  const targetPanel = document.getElementById(`view-${targetViewKey}`);
  if (targetPanel) targetPanel.classList.add('active');

  // Top Action Button: ONLY displayed on Dashboard & Consultations
  const topActionContainer = document.getElementById('top-quick-action-container');
  if (topActionContainer) {
    if (targetViewKey === 'dashboard' || targetViewKey === 'consultations') {
      topActionContainer.classList.remove('hidden');
    } else {
      topActionContainer.classList.add('hidden');
    }
  }

  const routeHeaders = {
    dashboard: ['Hospital Overview', 'Real-time clinical metrics & status'],
    beds: ['Hospital Ward Bed Matrix (70 Beds)', 'Live theatre-style visualization of admitted patients & occupancy'],
    employees: ['Medical Specialists & Doctors', 'Registry of 10 clinical practitioners and specialists'],
    patients: ['Patient Database (20 Records)', 'Master hospital patient registry and billing details'],
    profile: ['My Health Record & Medical Profile', 'Personal medical records, diagnosis, and medicine purchase history'],
    consultations: ['Consultation Appointments', 'Scheduled clinical appointments & status'],
    prescriptions: ['Digital Prescriptions & Rx Slip', 'Doctor diagnoses, dosage plans & printable slips'],
    pharmacy: ['Pharmacy Stock & Formulations', 'Inventory levels, rates & patient purchases'],
    emt: ['Emergency Medical Fleet (EMT)', 'Ambulance readiness & emergency hotline']
  };

  if (routeHeaders[targetViewKey]) {
    document.getElementById('page-title').textContent = routeHeaders[targetViewKey][0];
    document.getElementById('page-subtitle').textContent = routeHeaders[targetViewKey][1];
  }

  if (targetViewKey === 'dashboard') refreshDashboard();
  if (targetViewKey === 'beds') loadWardBeds();
  if (targetViewKey === 'employees') loadDoctorsRegistry();
  if (targetViewKey === 'patients') loadPatientsRegistry();
  if (targetViewKey === 'profile') loadPatientProfile();
  if (targetViewKey === 'consultations') loadConsultationsRegistry();
  if (targetViewKey === 'prescriptions') loadPrescriptionsRegistry();
  if (targetViewKey === 'pharmacy') loadPharmacyInventory();
  if (targetViewKey === 'emt') loadAmbulanceFleet();
}

function openNewActionModal() {
  openModal('modal-add-consultation');
}

/* --------------------------------------------------------------------------
   3. Dashboard Overview Data
   -------------------------------------------------------------------------- */

async function refreshDashboard() {
  try {
    const statsResponse = await fetch('/api/dashboard/stats');
    const metrics = await statsResponse.json();

    const isPatient = activeUser && activeUser.role === 'patient';
    const apptTitle = document.getElementById('stat-consultations-title');
    const apptMeta = document.getElementById('stat-consultations-meta');

    if (apptTitle) apptTitle.textContent = isPatient ? 'My Appointments' : 'Total Hospital Appointments';
    if (apptMeta) apptMeta.innerHTML = isPatient ? '<i class="fa-solid fa-user-check"></i> Booked by you' : '<i class="fa-solid fa-hospital"></i> Hospital-wide';

    document.getElementById('stat-consultations').textContent = metrics.scheduled_consultations || 0;
    document.getElementById('stat-available-beds').textContent = metrics.available_beds || 0;
    document.getElementById('stat-patients').textContent = metrics.patients || 0;
    document.getElementById('stat-employees').textContent = metrics.employees || 0;
    document.getElementById('stat-ambulances').textContent = metrics.available_ambulances || 0;

    const consultationsResponse = await fetch('/api/consultations');
    const appointments = await consultationsResponse.json();
    const dashConTbody = document.getElementById('dash-consultations-tbody');
    dashConTbody.innerHTML = appointments.slice(0, 4).map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.PATIENT_NAME)}</strong></td>
        <td>${escapeHtml(item.DOCTOR_NAME)}</td>
        <td>${escapeHtml(item.REASON)}</td>
        <td><span class="status-pill status-${item.STATUS.toLowerCase()}">${item.STATUS}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted">No scheduled appointments.</td></tr>';

    const emtResponse = await fetch('/api/emt');
    const ambulances = await emtResponse.json();
    const dashEmtTbody = document.getElementById('dash-emt-tbody');
    dashEmtTbody.innerHTML = ambulances.slice(0, 4).map((amb) => `
      <tr>
        <td><strong>${escapeHtml(amb.VNO)}</strong></td>
        <td>${escapeHtml(amb.VTYPE)}</td>
        <td>${escapeHtml(amb.DRIVER_NAME)}</td>
        <td><span class="status-pill status-${amb.STATUS.toLowerCase()}">${amb.STATUS}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4">No ambulances found.</td></tr>';
  } catch (err) {
    console.error('Error loading dashboard statistics:', err);
  }
}

/* --------------------------------------------------------------------------
   4. Theatre-Style Hospital Ward Bed Map (70 Beds + 1-Bed Limit)
   -------------------------------------------------------------------------- */

async function loadWardBeds() {
  try {
    const response = await fetch('/api/beds');
    hospitalBedsCache = await response.json();
    renderBedsMatrix(hospitalBedsCache);
  } catch (err) {
    notifyUser('Failed to load ward beds layout', 'error');
  }
}

function renderBedsMatrix(beds) {
  const container = document.getElementById('ward-sections-container');
  if (!container) return;

  const groupedWards = beds.reduce((acc, bed) => {
    acc[bed.WARD_TYPE] = acc[bed.WARD_TYPE] || [];
    acc[bed.WARD_TYPE].push(bed);
    return acc;
  }, {});

  const isStaff = activeUser && activeUser.role === 'staff';

  container.innerHTML = Object.keys(groupedWards).map((wardName) => {
    const wardBeds = groupedWards[wardName];
    const availableCount = wardBeds.filter((b) => b.STATUS === 'Available').length;

    return `
      <div class="ward-block glass-panel">
        <div class="ward-block-header">
          <h3><i class="fa-solid fa-hospital"></i> ${escapeHtml(wardName)}</h3>
          <span class="ward-badge">${availableCount} of ${wardBeds.length} Beds Available</span>
        </div>
        <div class="beds-grid-theatre">
          ${wardBeds.map((bed) => {
            const stateClass = `state-${bed.STATUS.toLowerCase()}`;
            const isOccupied = bed.STATUS === 'Occupied';

            return `
              <div class="bed-seat-card ${stateClass}" onclick="handleBedCardClick('${bed.BED_ID}')">
                <i class="fa-solid fa-bed"></i>
                <span class="bed-number">${escapeHtml(bed.BED_NUMBER)}</span>
                <span class="bed-status-tag">${bed.STATUS}</span>
                
                ${isOccupied ? `
                  <div class="bed-tooltip">
                    <h4><i class="fa-solid fa-user"></i> ${escapeHtml(bed.PATIENT_NAME || 'Admitted Patient')}</h4>
                    <p><strong>Age/Gender:</strong> ${bed.PATIENT_AGE || '--'} yrs / ${escapeHtml(bed.PATIENT_GENDER || '--')}</p>
                    <p><strong>Diagnosis:</strong> ${escapeHtml(bed.PATIENT_ISSUE || 'Under observation')}</p>
                    <p><strong>Blood Group:</strong> ${escapeHtml(bed.BLOOD_GROUP || 'Unknown')}</p>
                    <p><strong>Admitted:</strong> ${escapeHtml(bed.ASSIGNED_DATE || 'Recent')}</p>
                    ${isStaff ? '<p style="color: #38bdf8; font-size: 11px; margin-top: 4px; font-weight: bold;">Click to Discharge / Free Bed</p>' : ''}
                  </div>
                ` : `
                  <div class="bed-tooltip">
                    <h4>Bed ${escapeHtml(bed.BED_NUMBER)}</h4>
                    <p style="color: #34d399;">Sanitized & Available.</p>
                    <p style="color: #38bdf8; font-size: 11px; margin-top: 4px; font-weight: bold;">
                      ${isStaff ? 'Click to Allocate Patient' : 'Click to Reserve this Bed'}
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

async function handleBedCardClick(bedId) {
  const bed = hospitalBedsCache.find((b) => b.BED_ID === bedId);
  if (!bed) return;

  // Patient Bed Booking Flow (Strict 1 Bed Check)
  if (activeUser.role === 'patient') {
    if (bed.STATUS === 'Available') {
      if (confirm(`Would you like to reserve Bed ${bed.BED_NUMBER} in ${bed.WARD_TYPE}?`)) {
        try {
          const response = await fetch('/api/beds/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ BED_ID: bedId })
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Failed to reserve bed');

          notifyUser(payload.message, 'success');
          loadWardBeds();
          refreshDashboard();
        } catch (err) {
          notifyUser(err.message, 'error');
        }
      }
    } else if (bed.STATUS === 'Occupied') {
      notifyUser(`Bed ${bed.BED_NUMBER} is occupied by ${bed.PATIENT_NAME}.`, 'info');
    } else {
      notifyUser(`Bed ${bed.BED_NUMBER} is currently under maintenance.`, 'info');
    }
    return;
  }

  // Staff Bed Actions (Discharge or Allocate)
  if (bed.STATUS === 'Occupied') {
    if (confirm(`Discharge patient ${bed.PATIENT_NAME} from ${bed.BED_NUMBER} (${bed.WARD_TYPE}) and make bed available?`)) {
      const response = await fetch('/api/beds/vacate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ BED_ID: bedId })
      });
      const data = await response.json();
      if (response.ok) {
        notifyUser(data.message, 'success');
        loadWardBeds();
        refreshDashboard();
      } else {
        notifyUser(data.error, 'error');
      }
    }
  } else if (bed.STATUS === 'Available') {
    openModal('modal-assign-bed');
    setTimeout(() => {
      const bedDropdown = document.getElementById('bed-select-id');
      if (bedDropdown) bedDropdown.value = bedId;
    }, 150);
  }
}

async function handleAssignBed(event) {
  event.preventDefault();
  const bedId = document.getElementById('bed-select-id').value;
  const patientId = document.getElementById('
