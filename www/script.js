/* ── RxSleuth script.js ── */
'use strict';

// ── CONSTANTS ──────────────────────────────────────────────
const STRIPE_MONTHLY_PRICE = 'price_1TpWrpPNMPeYinipHmV5Lghx';
const STRIPE_YEARLY_PRICE  = 'price_1TpWtZPNMPeYinipm5Gigbee';
const FREE_MED_LIMIT       = 5;
const FREE_SYMPTOM_LIMIT   = 3;
const FREE_VITALS_LIMIT    = 1;

// ── HELPERS ────────────────────────────────────────────────
function e(id) { return document.getElementById(id); }
function show(id) { const el = e(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = e(id); if (el) el.classList.add('hidden'); }
function showEl(el) { if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (el) el.classList.add('hidden'); }

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

function timeSince(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── STATE ──────────────────────────────────────────────────
const state = {
  user: null,
  profile: null,
  medications: [],
  symptomLogsToday: [],
  vitalsToday: [],
  currentTab: 'Today',
  historyFilter: 'all',
};

// ── ENTRY POINT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggle();
  initPasswordToggleAccount();
  initNav();
  initModals();
  initAuth();
  initSeveritySlider();
  setTodayDate();
});

// ── DATE ───────────────────────────────────────────────────
function setTodayDate() {
  const el = e('todayDate');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── PASSWORD TOGGLES ───────────────────────────────────────
function initPasswordToggle() {
  const btn = e('togglePassword');
  const input = e('authPassword');
  const icon = e('eyeIcon');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    icon.innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

function initPasswordToggleAccount() {
  const btn = e('togglePasswordAccount');
  const input = e('accountAuthPassword');
  const icon = e('eyeIconAccount');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    icon.innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

// ── SEVERITY SLIDER ────────────────────────────────────────
function initSeveritySlider() {
  const slider = e('symptomSeverity');
  const display = e('severityValue');
  if (!slider || !display) return;
  slider.addEventListener('input', () => {
    display.textContent = slider.value;
  });
}
// ── NAVIGATION ─────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  state.currentTab = tab;

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('hidden');
  });

  // Show selected tab
  const tabMap = {
    'Today':       'tabToday',
    'Medications': 'tabMedications',
    'History':     'tabHistory',
    'Doctor':      'tabDoctor',
    'Account':     'tabAccount',
  };

  const tabEl = e(tabMap[tab]);
  if (tabEl) tabEl.classList.remove('hidden');

  // Load data for tab
  if (tab === 'Today') loadTodayData();
  if (tab === 'Medications') loadMedications();
  if (tab === 'History') loadHistory();
  if (tab === 'Doctor') loadDoctorTab();
  if (tab === 'Account') renderAccountPanel();
}

// ── MODALS ─────────────────────────────────────────────────
function initModals() {
  // Add medication
  e('addMedBtn')?.addEventListener('click', () => show('addMedModal'));
  e('closeMedModalBtn')?.addEventListener('click', () => hide('addMedModal'));
  e('saveMedBtn')?.addEventListener('click', handleSaveMed);
  e('quickLogMedBtn')?.addEventListener('click', () => show('addMedModal'));

  // Add symptom
  e('closeSymptomModalBtn')?.addEventListener('click', () => hide('addSymptomModal'));
  e('saveSymptomBtn')?.addEventListener('click', handleSaveSymptom);
  e('quickLogSymptomBtn')?.addEventListener('click', () => {
    if (!checkFreeTierLimit('symptom')) return;
    show('addSymptomModal');
  });

  // Add vitals
  e('closeVitalsModalBtn')?.addEventListener('click', () => hide('addVitalsModal'));
  e('saveVitalsBtn')?.addEventListener('click', handleSaveVitals);
  e('quickLogVitalsBtn')?.addEventListener('click', () => {
    if (!checkFreeTierLimit('vitals')) return;
    show('addVitalsModal');
  });

  // Doctor report
  e('quickDoctorReportBtn')?.addEventListener('click', () => {
    if (!state.profile?.is_premium) {
      showPremiumModal('AI Doctor Report', 'Generate a smart AI summary of your health data to share with your doctor.');
      return;
    }
    show('reportModal');
  });
  e('generateReportBtn')?.addEventListener('click', () => {
    if (!state.profile?.is_premium) {
      showPremiumModal('AI Doctor Report', 'Generate a smart AI summary of your health data to share with your doctor.');
      return;
    }
    show('reportModal');
  });
  e('closeReportModalBtn')?.addEventListener('click', () => hide('reportModal'));
  e('generateReportConfirmBtn')?.addEventListener('click', handleGenerateReport);

  // Add doctor
  e('addDoctorBtn')?.addEventListener('click', () => show('addDoctorModal'));
  e('closeDoctorModalBtn')?.addEventListener('click', () => hide('addDoctorModal'));
  e('saveDoctorBtn')?.addEventListener('click', handleSaveDoctor);

  // Add appointment
  e('addAppointmentBtn')?.addEventListener('click', () => show('addAppointmentModal'));
  e('closeAppointmentModalBtn')?.addEventListener('click', () => hide('addAppointmentModal'));
  e('saveAppointmentBtn')?.addEventListener('click', handleSaveAppointment);

  // Premium modal
  e('closePremiumModalBtn')?.addEventListener('click', () => hide('premiumModal'));
  e('premiumModalUpgradeBtn')?.addEventListener('click', () => {
    hide('premiumModal');
    switchTab('Account');
  });

  // View all buttons
  e('viewAllMedsBtn')?.addEventListener('click', () => switchTab('Medications'));
  e('viewAllSymptomsBtn')?.addEventListener('click', () => switchTab('History'));
  e('viewAllVitalsBtn')?.addEventListener('click', () => switchTab('History'));

  // History filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.historyFilter = btn.dataset.filter;
      loadHistory();
    });
  });

  // Settings buttons
  e('exportPdfBtn')?.addEventListener('click', handleExportPdf);
  e('exportCsvBtn')?.addEventListener('click', handleExportCsv);
  e('privacyBtn')?.addEventListener('click', () => window.open('https://rxsleuth.com/privacy', '_blank'));
  e('deleteAccountBtn')?.addEventListener('click', handleDeleteAccount);
  e('caregiverBtn')?.addEventListener('click', () => {
    if (!state.profile?.is_premium) {
      showPremiumModal('Caregiver Mode', 'Manage medications and health logs for a family member.');
      return;
    }
    alert('Caregiver mode coming soon!');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) overlay.classList.add('hidden');
    });
  });
}

function showPremiumModal(title, desc) {
  if (e('premiumModalTitle')) e('premiumModalTitle').textContent = title;
  if (e('premiumModalDesc')) e('premiumModalDesc').textContent = desc;
  show('premiumModal');
}

// ── FREE TIER LIMITS ───────────────────────────────────────
function checkFreeTierLimit(type) {
  if (state.profile?.is_premium) return true;
  if (type === 'symptom' && state.symptomLogsToday.length >= FREE_SYMPTOM_LIMIT) {
    showPremiumModal('Symptom Log Limit Reached', `Free plan allows ${FREE_SYMPTOM_LIMIT} symptom logs per day. Upgrade for unlimited logging.`);
    return false;
  }
  if (type === 'vitals' && state.vitalsToday.length >= FREE_VITALS_LIMIT) {
    showPremiumModal('Vitals Limit Reached', `Free plan allows ${FREE_VITALS_LIMIT} vitals entry per day. Upgrade for unlimited logging.`);
    return false;
  }
  return true;
}

function checkMedLimit() {
  if (state.profile?.is_premium) return true;
  if (state.medications.length >= FREE_MED_LIMIT) {
    showPremiumModal('Medication Limit Reached', `Free plan allows up to ${FREE_MED_LIMIT} medications. Upgrade for unlimited medications.`);
    return false;
  }
  return true;
}
// ── AUTH ───────────────────────────────────────────────────
function initAuth() {
  // Auth screen buttons
  e('signInEmailBtn')?.addEventListener('click', handleSignIn);
  e('signUpEmailBtn')?.addEventListener('click', handleSignUp);
  e('signInGoogleBtn')?.addEventListener('click', handleGoogleSignIn);

  // Account tab buttons
  e('accountSignInBtn')?.addEventListener('click', handleAccountSignIn);
  e('accountSignUpBtn')?.addEventListener('click', handleAccountSignUp);
  e('accountGoogleBtn')?.addEventListener('click', handleGoogleSignIn);
  e('signOutBtn')?.addEventListener('click', handleSignOut);
  e('headerSettingsBtn')?.addEventListener('click', () => switchTab('Account'));

  // Checkout buttons
  e('checkoutBtn')?.addEventListener('click', handleCheckout);

  // Listen for auth changes
  window.RX_Supabase?.onAuthChange(async (event, session) => {
    state.user = session?.user || null;
    if (state.user) {
      await loadProfile();
      showApp();
    } else {
      showAuthScreen();
    }
  });
}

function showAuthScreen() {
  show('authScreen');
  hide('appScreen');
  hide('bottomNav');
  hide('freeProgressWrap');
  hide('upgradeBtn');
}

function showApp() {
  hide('authScreen');
  show('appScreen');
  show('bottomNav');
  switchTab(state.currentTab);
  loadTodayData();
}

async function loadProfile() {
  if (!state.user) return;
  const { data, error } = await window.RX_Supabase.from('profiles')
    .select('*')
    .eq('id', state.user.id)
    .single();
  if (!error && data) {
    state.profile = data;
    updateFreeProgressBar();
  }
}

function updateFreeProgressBar() {
  if (state.profile?.is_premium) {
    hide('freeProgressWrap');
    hide('upgradeBtn');
    return;
  }
  show('freeProgressWrap');
  show('upgradeBtn');
  const used = state.medications.length;
  const pct = Math.min((used / FREE_MED_LIMIT) * 100, 100);
  const bar = e('freeProgressBar');
  const text = e('freeProgressText');
  if (bar) bar.style.width = pct + '%';
  if (text) text.textContent = `${FREE_MED_LIMIT - used} medications remaining on free plan`;
}

async function handleSignIn() {
  const email = e('authEmail')?.value.trim() || '';
  const pass  = e('authPassword')?.value || '';
  const errEl = e('authError');
  if (!email || !pass) { if (errEl) { errEl.textContent = 'Email and password required.'; errEl.classList.remove('hidden'); } return; }
  if (errEl) errEl.classList.add('hidden');
  const { error } = await (window.RX_Supabase?.signInWithEmail(email, pass)
    || Promise.resolve({ error: { message: 'Supabase not configured' } }));
  if (error && errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
}

async function handleSignUp() {
  const email = e('authEmail')?.value.trim() || '';
  const pass  = e('authPassword')?.value || '';
  const errEl = e('authError');
  if (!email || !pass) { if (errEl) { errEl.textContent = 'Email and password required.'; errEl.classList.remove('hidden'); } return; }
  if (pass.length < 6) { if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); } return; }
  if (errEl) errEl.classList.add('hidden');
  const { error } = await (window.RX_Supabase?.signUpWithEmail(email, pass)
    || Promise.resolve({ error: { message: 'Supabase not configured' } }));
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
  } else {
    if (errEl) { errEl.style.color = '#10B981'; errEl.textContent = 'Check your email to confirm your account.'; errEl.classList.remove('hidden'); }
  }
}

async function handleAccountSignIn() {
  const email = e('accountAuthEmail')?.value.trim() || '';
  const pass  = e('accountAuthPassword')?.value || '';
  const errEl = e('accountAuthError');
  if (!email || !pass) { if (errEl) { errEl.textContent = 'Email and password required.'; errEl.classList.remove('hidden'); } return; }
  if (errEl) errEl.classList.add('hidden');
  const { error } = await (window.RX_Supabase?.signInWithEmail(email, pass)
    || Promise.resolve({ error: { message: 'Supabase not configured' } }));
  if (error && errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
}

async function handleAccountSignUp() {
  const email = e('accountAuthEmail')?.value.trim() || '';
  const pass  = e('accountAuthPassword')?.value || '';
  const errEl = e('accountAuthError');
  if (!email || !pass) { if (errEl) { errEl.textContent = 'Email and password required.'; errEl.classList.remove('hidden'); } return; }
  if (pass.length < 6) { if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); } return; }
  if (errEl) errEl.classList.add('hidden');
  const { error } = await (window.RX_Supabase?.signUpWithEmail(email, pass)
    || Promise.resolve({ error: { message: 'Supabase not configured' } }));
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
  } else {
    if (errEl) { errEl.style.color = '#10B981'; errEl.textContent = 'Check your email to confirm your account.'; errEl.classList.remove('hidden'); }
  }
}

async function handleGoogleSignIn() {
  const { error } = await (window.RX_Supabase?.signInWithGoogle()
    || Promise.resolve({ error: { message: 'Supabase not configured' } }));
  if (error) alert(error.message);
}

async function handleSignOut() {
  await window.RX_Supabase?.signOut();
  state.user = null;
  state.profile = null;
  state.medications = [];
  state.symptomLogsToday = [];
  state.vitalsToday = [];
  showAuthScreen();
}

async function handleDeleteAccount() {
  if (!confirm('Are you sure you want to delete your account? This cannot be undone and all your health data will be permanently deleted.')) return;
  const { error } = await (window.RX_Supabase?.deleteAccount()
    || Promise.resolve({ error: { message: 'Not configured' } }));
  if (error) {
    alert('Error deleting account: ' + error.message);
  } else {
    state.user = null;
    state.profile = null;
    showAuthScreen();
  }
}

// ── ACCOUNT PANEL ──────────────────────────────────────────
function renderAccountPanel() {
  if (!state.user) {
    show('accountSignedOut');
    hide('accountSignedIn');
    return;
  }
  hide('accountSignedOut');
  show('accountSignedIn');

  const emailEl = e('accountEmailDisplay');
  if (emailEl) emailEl.textContent = state.user.email;

  const badge = e('planBadge');
  if (state.profile?.is_premium) {
    if (badge) { badge.textContent = 'Premium'; badge.className = 'plan-badge premium'; }
    hide('premiumUpgradeRow');
    show('premiumActiveRow');
    if (state.profile.subscription_status === 'trialing') {
      const expiry = e('expiryLabel');
      if (expiry) expiry.textContent = `Trial ends ${formatDate(state.profile.trial_ends_at)}`;
    }
  } else {
    if (badge) { badge.textContent = 'Free Plan'; badge.className = 'plan-badge free'; }
    show('premiumUpgradeRow');
    hide('premiumActiveRow');
  }
}

// ── CHECKOUT ───────────────────────────────────────────────
async function handleCheckout() {
  if (!state.user) {
    alert('Please sign in first to upgrade to premium.');
    return;
  }
  const yearly = e('planYearly')?.querySelector('input')?.checked;
  const priceId = yearly ? STRIPE_YEARLY_PRICE : STRIPE_MONTHLY_PRICE;
  try {
    const resp = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        userId: state.user.id,
        email: state.user.email,
      }),
    });
    const data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Error starting checkout. Please try again.');
    }
  } catch (err) {
    alert('Error connecting to payment system. Please try again.');
  }
}
// ── MEDICATIONS ────────────────────────────────────────────
async function loadMedications() {
  if (!state.user) return;
  const { data, error } = await window.RX_Supabase.from('medications')
    .select('*')
    .eq('user_id', state.user.id)
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (!error && data) {
    state.medications = data;
    renderMedications();
    updateFreeProgressBar();
  }
}

function renderMedications() {
  const list = e('medicationsList');
  if (!list) return;
  if (state.medications.length === 0) {
    list.innerHTML = '<p class="empty-state">No medications added yet.<br>Tap + Add to get started.</p>';
    return;
  }
  list.innerHTML = state.medications.map(med => `
    <div class="med-item">
      <span class="med-item-icon">💊</span>
      <div class="med-item-info">
        <div class="med-item-name">${med.name}</div>
        <div class="med-item-detail">${med.dose || ''} ${med.frequency ? '· ' + formatFrequency(med.frequency) : ''}</div>
        ${med.prescriber ? `<div class="med-item-detail">Dr. ${med.prescriber}</div>` : ''}
      </div>
      <div class="med-item-actions">
        <button class="btn-icon" onclick="deleteMed('${med.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function formatFrequency(freq) {
  const map = {
    once_daily: 'Once daily',
    twice_daily: 'Twice daily',
    three_times_daily: '3x daily',
    every_other_day: 'Every other day',
    weekly: 'Weekly',
    as_needed: 'As needed',
  };
  return map[freq] || freq;
}

async function handleSaveMed() {
  if (!checkMedLimit()) return;
  const name = e('medName')?.value.trim() || '';
  const errEl = e('medError');
  if (!name) {
    if (errEl) { errEl.textContent = 'Medication name is required.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  const med = {
    user_id:    state.user.id,
    name,
    dose:       e('medDose')?.value.trim() || null,
    frequency:  e('medFrequency')?.value || null,
    prescriber: e('medPrescriber')?.value.trim() || null,
    pharmacy:   e('medPharmacy')?.value.trim() || null,
    notes:      e('medNotes')?.value.trim() || null,
  };
  const { error } = await window.RX_Supabase.from('medications').insert(med);
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }
  ['medName','medDose','medFrequency','medPrescriber','medPharmacy','medNotes'].forEach(id => {
    const el = e(id); if (el) el.value = '';
  });
  hide('addMedModal');
  await loadMedications();
  loadTodayData();
}

async function deleteMed(id) {
  if (!confirm('Remove this medication?')) return;
  await window.RX_Supabase.from('medications').update({ active: false }).eq('id', id);
  await loadMedications();
  loadTodayData();
}

// ── SYMPTOM LOGS ───────────────────────────────────────────
async function handleSaveSymptom() {
  if (!checkFreeTierLimit('symptom')) return;
  const symptom = e('symptomName')?.value.trim() || '';
  const errEl = e('symptomError');
  if (!symptom) {
    if (errEl) { errEl.textContent = 'Please enter a symptom.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  const log = {
    user_id:  state.user.id,
    symptom,
    severity: parseInt(e('symptomSeverity')?.value || '5'),
    notes:    e('symptomNotes')?.value.trim() || null,
  };
  const { error } = await window.RX_Supabase.from('symptom_logs').insert(log);
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }
  ['symptomName','symptomNotes'].forEach(id => { const el = e(id); if (el) el.value = ''; });
  if (e('symptomSeverity')) e('symptomSeverity').value = 5;
  if (e('severityValue')) e('severityValue').textContent = '5';
  hide('addSymptomModal');
  await loadTodayData();
}

// ── VITALS ─────────────────────────────────────────────────
async function handleSaveVitals() {
  if (!checkFreeTierLimit('vitals')) return;
  const errEl = e('vitalsError');
  const vitals = {
    user_id:                  state.user.id,
    blood_pressure_systolic:  parseInt(e('bpSystolic')?.value) || null,
    blood_pressure_diastolic: parseInt(e('bpDiastolic')?.value) || null,
    heart_rate:               parseInt(e('heartRate')?.value) || null,
    blood_glucose:            parseFloat(e('bloodGlucose')?.value) || null,
    weight:                   parseFloat(e('weight')?.value) || null,
    notes:                    e('vitalsNotes')?.value.trim() || null,
  };
  if (!vitals.blood_pressure_systolic && !vitals.heart_rate && !vitals.blood_glucose && !vitals.weight) {
    if (errEl) { errEl.textContent = 'Please enter at least one vital reading.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  const { error } = await window.RX_Supabase.from('vitals').insert(vitals);
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }
  ['bpSystolic','bpDiastolic','heartRate','bloodGlucose','weight','vitalsNotes'].forEach(id => {
    const el = e(id); if (el) el.value = '';
  });
  hide('addVitalsModal');
  await loadTodayData();
}
// ── TODAY DATA ─────────────────────────────────────────────
async function loadTodayData() {
  if (!state.user) return;
  await loadMedications();
  await loadTodaySymptoms();
  await loadTodayVitals();
  renderTodayMeds();
  renderTodaySymptoms();
  renderTodayVitals();
}

async function loadTodaySymptoms() {
  const { data, error } = await window.RX_Supabase.from('symptom_logs')
    .select('*')
    .eq('user_id', state.user.id)
    .gte('logged_at', todayStart())
    .order('logged_at', { ascending: false });
  if (!error && data) state.symptomLogsToday = data;
}

async function loadTodayVitals() {
  const { data, error } = await window.RX_Supabase.from('vitals')
    .select('*')
    .eq('user_id', state.user.id)
    .gte('logged_at', todayStart())
    .order('logged_at', { ascending: false });
  if (!error && data) state.vitalsToday = data;
}

function renderTodayMeds() {
  const list = e('todayMedsList');
  if (!list) return;
  if (state.medications.length === 0) {
    list.innerHTML = '<p class="empty-state">No medications added yet.</p>';
    return;
  }
  list.innerHTML = state.medications.map(med => `
    <div class="med-item">
      <span class="med-item-icon">💊</span>
      <div class="med-item-info">
        <div class="med-item-name">${med.name}</div>
        <div class="med-item-detail">${med.dose || ''} ${med.frequency ? '· ' + formatFrequency(med.frequency) : ''}</div>
        <div class="time-since" id="timeSince_${med.id}">Last logged: checking...</div>
      </div>
      <button class="btn-confirm-dose" onclick="confirmDose('${med.id}')">✓ Taken</button>
    </div>
  `).join('');
  state.medications.forEach(med => loadLastDoseTime(med.id));
}

async function loadLastDoseTime(medId) {
  const { data } = await window.RX_Supabase.from('medication_logs')
    .select('taken_at')
    .eq('medication_id', medId)
    .eq('user_id', state.user.id)
    .order('taken_at', { ascending: false })
    .limit(1);
  const el = e(`timeSince_${medId}`);
  if (!el) return;
  if (data && data.length > 0) {
    el.textContent = `Last taken: ${timeSince(data[0].taken_at)}`;
  } else {
    el.textContent = 'Not yet taken today';
  }
}

async function confirmDose(medId) {
  if (!state.user) return;
  const { error } = await window.RX_Supabase.from('medication_logs').insert({
    user_id:       state.user.id,
    medication_id: medId,
    taken_at:      new Date().toISOString(),
    skipped:       false,
  });
  if (!error) {
    const el = e(`timeSince_${medId}`);
    if (el) el.textContent = 'Last taken: Just now';
    const btn = document.querySelector(`button[onclick="confirmDose('${medId}')"]`);
    if (btn) { btn.textContent = '✓ Taken'; btn.classList.add('confirmed'); }
  }
}

function renderTodaySymptoms() {
  const list = e('todaySymptomsList');
  if (!list) return;
  if (state.symptomLogsToday.length === 0) {
    list.innerHTML = '<p class="empty-state">No symptoms logged today.</p>';
    return;
  }
  list.innerHTML = state.symptomLogsToday.map(log => `
    <div class="symptom-item">
      <span class="med-item-icon">📝</span>
      <div class="med-item-info">
        <div class="med-item-name">${log.symptom}</div>
        <div class="med-item-detail">${formatTime(log.logged_at)}</div>
        ${log.notes ? `<div class="med-item-detail">${log.notes}</div>` : ''}
      </div>
      <span class="symptom-severity-badge">${log.severity}/10</span>
    </div>
  `).join('');
}

function renderTodayVitals() {
  const list = e('todayVitalsList');
  if (!list) return;
  if (state.vitalsToday.length === 0) {
    list.innerHTML = '<p class="empty-state">No vitals logged today.</p>';
    return;
  }
  list.innerHTML = state.vitalsToday.map(v => `
    <div class="vitals-item">
      ${v.blood_pressure_systolic ? `
        <div class="vital-reading">
          <span class="vital-label">Blood Pressure</span>
          <span class="vital-value">${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}</span>
          <span class="vital-unit">mmHg</span>
        </div>` : ''}
      ${v.heart_rate ? `
        <div class="vital-reading">
          <span class="vital-label">Heart Rate</span>
          <span class="vital-value">${v.heart_rate}</span>
          <span class="vital-unit">bpm</span>
        </div>` : ''}
      ${v.blood_glucose ? `
        <div class="vital-reading">
          <span class="vital-label">Blood Glucose</span>
          <span class="vital-value">${v.blood_glucose}</span>
          <span class="vital-unit">mg/dL</span>
        </div>` : ''}
      ${v.weight ? `
        <div class="vital-reading">
          <span class="vital-label">Weight</span>
          <span class="vital-value">${v.weight}</span>
          <span class="vital-unit">lbs</span>
        </div>` : ''}
    </div>
  `).join('');
}

// ── HISTORY ────────────────────────────────────────────────
async function loadHistory() {
  if (!state.user) return;
  const filter = state.historyFilter;
  let items = [];

  if (filter === 'all' || filter === 'medications') {
    const { data } = await window.RX_Supabase.from('medication_logs')
      .select('*, medications(name)')
      .eq('user_id', state.user.id)
      .order('taken_at', { ascending: false })
      .limit(50);
    if (data) items = items.concat(data.map(d => ({
      type: 'medication',
      icon: '💊',
      title: d.medications?.name || 'Medication',
      detail: d.skipped ? 'Skipped' : 'Taken',
      time: d.taken_at,
    })));
  }

  if (filter === 'all' || filter === 'symptoms') {
    const { data } = await window.RX_Supabase.from('symptom_logs')
      .select('*')
      .eq('user_id', state.user.id)
      .order('logged_at', { ascending: false })
      .limit(50);
    if (data) items = items.concat(data.map(d => ({
      type: 'symptom',
      icon: '📝',
      title: d.symptom,
      detail: `Severity: ${d.severity}/10`,
      time: d.logged_at,
    })));
  }

  if (filter === 'all' || filter === 'vitals') {
    const { data } = await window.RX_Supabase.from('vitals')
      .select('*')
      .eq('user_id', state.user.id)
      .order('logged_at', { ascending: false })
      .limit(50);
    if (data) items = items.concat(data.map(d => ({
      type: 'vitals',
      icon: '❤️',
      title: 'Vitals logged',
      detail: [
        d.blood_pressure_systolic ? `BP: ${d.blood_pressure_systolic}/${d.blood_pressure_diastolic}` : '',
        d.heart_rate ? `HR: ${d.heart_rate}bpm` : '',
        d.blood_glucose ? `Glucose: ${d.blood_glucose}` : '',
        d.weight ? `Weight: ${d.weight}lbs` : '',
      ].filter(Boolean).join(' · '),
      time: d.logged_at,
    })));
  }

  items.sort((a, b) => new Date(b.time) - new Date(a.time));

  const list = e('historyList');
  if (!list) return;
  if (items.length === 0) {
    list.innerHTML = '<p class="empty-state">No history yet.</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="history-item">
      <span class="history-item-icon">${item.icon}</span>
      <div class="history-item-info">
        <div class="history-item-title">${item.title}</div>
        <div class="med-item-detail">${item.detail}</div>
        <div class="history-item-time">${formatDateTime(item.time)}</div>
      </div>
    </div>
  `).join('');
}
// ── DOCTOR TAB ─────────────────────────────────────────────
async function loadDoctorTab() {
  if (!state.user) return;
  await loadDoctors();
  await loadAppointments();
}

async function loadDoctors() {
  const { data, error } = await window.RX_Supabase.from('doctors')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: true });
  if (!error && data) renderDoctors(data);
}

function renderDoctors(doctors) {
  const list = e('doctorsList');
  if (!list) return;
  if (doctors.length === 0) {
    list.innerHTML = '<p class="empty-state">No doctors added yet.</p>';
    return;
  }
  list.innerHTML = doctors.map(doc => `
    <div class="doctor-item">
      <span class="med-item-icon">👨‍⚕️</span>
      <div class="doctor-item-info">
        <div class="doctor-item-name">${doc.name}</div>
        ${doc.specialty ? `<div class="doctor-item-detail">${doc.specialty}</div>` : ''}
        ${doc.phone ? `<div class="doctor-item-detail">📞 ${doc.phone}</div>` : ''}
        ${doc.address ? `<div class="doctor-item-detail">📍 ${doc.address}</div>` : ''}
      </div>
      <button class="btn-icon" onclick="deleteDoctor('${doc.id}')" title="Delete">🗑️</button>
    </div>
  `).join('');
}

async function handleSaveDoctor() {
  const name = e('doctorName')?.value.trim() || '';
  const errEl = e('doctorError');
  if (!name) {
    if (errEl) { errEl.textContent = 'Doctor name is required.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  const doc = {
    user_id:   state.user.id,
    name,
    specialty: e('doctorSpecialty')?.value.trim() || null,
    phone:     e('doctorPhone')?.value.trim() || null,
    address:   e('doctorAddress')?.value.trim() || null,
    notes:     e('doctorNotes')?.value.trim() || null,
  };
  const { error } = await window.RX_Supabase.from('doctors').insert(doc);
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }
  ['doctorName','doctorSpecialty','doctorPhone','doctorAddress','doctorNotes'].forEach(id => {
    const el = e(id); if (el) el.value = '';
  });
  hide('addDoctorModal');
  await loadDoctors();
}

async function deleteDoctor(id) {
  if (!confirm('Remove this doctor?')) return;
  await window.RX_Supabase.from('doctors').delete().eq('id', id);
  await loadDoctors();
}

async function loadAppointments() {
  const { data, error } = await window.RX_Supabase.from('appointments')
    .select('*')
    .eq('user_id', state.user.id)
    .gte('appointment_at', new Date().toISOString())
    .order('appointment_at', { ascending: true });
  if (!error && data) renderAppointments(data);
}

function renderAppointments(appointments) {
  const list = e('appointmentsList');
  if (!list) return;
  if (appointments.length === 0) {
    list.innerHTML = '<p class="empty-state">No upcoming appointments.</p>';
    return;
  }
  list.innerHTML = appointments.map(apt => {
    const d = new Date(apt.appointment_at);
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    return `
      <div class="appointment-item">
        <div class="appointment-date">
          <span class="appointment-month">${month}</span>
          <span class="appointment-day">${day}</span>
        </div>
        <div class="appointment-info">
          <div class="appointment-doctor">${apt.doctor_name}</div>
          <div class="appointment-detail">${formatTime(apt.appointment_at)}</div>
          ${apt.location ? `<div class="appointment-detail">📍 ${apt.location}</div>` : ''}
          ${apt.notes ? `<div class="appointment-detail">${apt.notes}</div>` : ''}
        </div>
        <button class="btn-icon" onclick="deleteAppointment('${apt.id}')" title="Delete">🗑️</button>
      </div>
    `;
  }).join('');
}

async function handleSaveAppointment() {
  const doctor = e('appointmentDoctor')?.value.trim() || '';
  const dateTime = e('appointmentDateTime')?.value || '';
  const errEl = e('appointmentError');
  if (!doctor || !dateTime) {
    if (errEl) { errEl.textContent = 'Doctor name and date are required.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  const apt = {
    user_id:        state.user.id,
    doctor_name:    doctor,
    appointment_at: new Date(dateTime).toISOString(),
    location:       e('appointmentLocation')?.value.trim() || null,
    notes:          e('appointmentNotes')?.value.trim() || null,
  };
  const { error } = await window.RX_Supabase.from('appointments').insert(apt);
  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }
  ['appointmentDoctor','appointmentDateTime','appointmentLocation','appointmentNotes'].forEach(id => {
    const el = e(id); if (el) el.value = '';
  });
  hide('addAppointmentModal');
  await loadAppointments();
}

async function deleteAppointment(id) {
  if (!confirm('Remove this appointment?')) return;
  await window.RX_Supabase.from('appointments').delete().eq('id', id);
  await loadAppointments();
}
// ── AI DOCTOR REPORT ───────────────────────────────────────
async function handleGenerateReport() {
  if (!state.profile?.is_premium) {
    showPremiumModal('AI Doctor Report', 'Generate a smart AI summary of your health data to share with your doctor.');
    return;
  }

  const days = parseInt(e('reportPeriod')?.value || '30');
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const btnText = e('reportBtnText');
  const spinner = e('reportSpinner');
  const output = e('reportOutput');
  const exportBtns = e('reportExportBtns');

  if (btnText) btnText.classList.add('hidden');
  if (spinner) spinner.classList.remove('hidden');
  if (output) output.classList.add('hidden');
  if (exportBtns) exportBtns.classList.add('hidden');

  try {
    const [meds, symptoms, vitals, appointments] = await Promise.all([
      window.RX_Supabase.from('medications').select('*').eq('user_id', state.user.id).eq('active', true),
      window.RX_Supabase.from('symptom_logs').select('*').eq('user_id', state.user.id).gte('logged_at', sinceStr).order('logged_at', { ascending: false }),
      window.RX_Supabase.from('vitals').select('*').eq('user_id', state.user.id).gte('logged_at', sinceStr).order('logged_at', { ascending: false }),
      window.RX_Supabase.from('appointments').select('*').eq('user_id', state.user.id).gte('appointment_at', new Date().toISOString()).order('appointment_at', { ascending: true }).limit(3),
    ]);

    const prompt = `You are a medical assistant helping a patient prepare for a doctor's appointment.
Generate a clear, concise health summary for the last ${days} days based on this data.

CURRENT MEDICATIONS:
${meds.data?.map(m => `- ${m.name} ${m.dose || ''} ${m.frequency ? '(' + m.frequency + ')' : ''} ${m.prescriber ? 'prescribed by Dr. ' + m.prescriber : ''}`).join('\n') || 'None recorded'}

SYMPTOMS (last ${days} days):
${symptoms.data?.map(s => `- ${s.symptom} (severity ${s.severity}/10) on ${formatDate(s.logged_at)}${s.notes ? ': ' + s.notes : ''}`).join('\n') || 'None recorded'}

VITALS (last ${days} days):
${vitals.data?.map(v => `- ${formatDate(v.logged_at)}: ${v.blood_pressure_systolic ? 'BP ' + v.blood_pressure_systolic + '/' + v.blood_pressure_diastolic + 'mmHg' : ''} ${v.heart_rate ? 'HR ' + v.heart_rate + 'bpm' : ''} ${v.blood_glucose ? 'Glucose ' + v.blood_glucose + 'mg/dL' : ''} ${v.weight ? 'Weight ' + v.weight + 'lbs' : ''}`).join('\n') || 'None recorded'}

UPCOMING APPOINTMENTS:
${appointments.data?.map(a => `- ${formatDateTime(a.appointment_at)} with ${a.doctor_name}${a.location ? ' at ' + a.location : ''}`).join('\n') || 'None scheduled'}

Please provide:
1. A brief summary of current medications and any patterns noticed
2. Key symptoms to discuss with the doctor, especially recurring or severe ones
3. Notable vital sign trends
4. 3-5 suggested questions to ask the doctor based on this data
5. Any concerns worth flagging

Keep the summary clear and concise — it should be easy to read in under 2 minutes.`;

    const resp = await fetch('/.netlify/functions/ai-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await resp.json();
    const report = data.report || 'Unable to generate report. Please try again.';

    if (output) {
      output.textContent = report;
      output.classList.remove('hidden');
    }
    if (exportBtns) exportBtns.classList.remove('hidden');

    window._lastReport = report;

  } catch (err) {
    if (output) {
      output.textContent = 'Error generating report. Please check your connection and try again.';
      output.classList.remove('hidden');
    }
  } finally {
    if (btnText) btnText.classList.remove('hidden');
    if (spinner) spinner.classList.add('hidden');
  }
}

// ── EXPORT ─────────────────────────────────────────────────
async function handleExportCsv() {
  if (!state.profile?.is_premium) {
    showPremiumModal('CSV Export', 'Export all your health data as a CSV file.');
    return;
  }
  if (!state.user) return;

  const [meds, symptoms, vitals] = await Promise.all([
    window.RX_Supabase.from('medications').select('*').eq('user_id', state.user.id),
    window.RX_Supabase.from('symptom_logs').select('*').eq('user_id', state.user.id).order('logged_at', { ascending: false }),
    window.RX_Supabase.from('vitals').select('*').eq('user_id', state.user.id).order('logged_at', { ascending: false }),
  ]);

  let csv = 'RxSleuth Health Data Export\n\n';

  csv += 'MEDICATIONS\n';
  csv += 'Name,Dose,Frequency,Prescriber,Pharmacy,Notes\n';
  meds.data?.forEach(m => {
    csv += `"${m.name}","${m.dose||''}","${formatFrequency(m.frequency||'')}","${m.prescriber||''}","${m.pharmacy||''}","${m.notes||''}"\n`;
  });

  csv += '\nSYMPTOM LOGS\n';
  csv += 'Date,Symptom,Severity,Notes\n';
  symptoms.data?.forEach(s => {
    csv += `"${formatDate(s.logged_at)}","${s.symptom}","${s.severity}/10","${s.notes||''}"\n`;
  });

  csv += '\nVITALS\n';
  csv += 'Date,Blood Pressure,Heart Rate,Blood Glucose,Weight,Notes\n';
  vitals.data?.forEach(v => {
    csv += `"${formatDate(v.logged_at)}","${v.blood_pressure_systolic ? v.blood_pressure_systolic+'/'+v.blood_pressure_diastolic+' mmHg' : ''}","${v.heart_rate ? v.heart_rate+' bpm' : ''}","${v.blood_glucose ? v.blood_glucose+' mg/dL' : ''}","${v.weight ? v.weight+' lbs' : ''}","${v.notes||''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rxsleuth-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleExportPdf() {
  if (!state.profile?.is_premium) {
    showPremiumModal('PDF Export', 'Export your health summary as a PDF to share with your doctor.');
    return;
  }
  if (!window._lastReport) {
    alert('Please generate an AI Doctor Report first, then export it as PDF.');
    show('reportModal');
    return;
  }
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RxSleuth Health Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1E293B; line-height: 1.6; }
        h1 { color: #1E3A5F; border-bottom: 2px solid #F97066; padding-bottom: 10px; }
        p { white-space: pre-wrap; }
        .footer { margin-top: 40px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>RxSleuth Health Summary</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Patient:</strong> ${state.user?.email || ''}</p>
      <hr/>
      <p>${window._lastReport}</p>
      <div class="footer">Generated by RxSleuth · rxsleuth.com · Your health data is private and never shared.</div>
    </body>
    </html>
  `);
  printWin.document.close();
  printWin.print();
}

async function exportReportEmail() {
  if (!window._lastReport) return;
  const subject = encodeURIComponent('My Health Summary — RxSleuth');
  const body = encodeURIComponent(window._lastReport);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Wire up report export buttons
document.addEventListener('DOMContentLoaded', () => {
  e('exportReportPdfBtn')?.addEventListener('click', handleExportPdf);
  e('exportReportEmailBtn')?.addEventListener('click', exportReportEmail);
});
