
// ===== SIMPLE STATE =====
let currentUser = null;

// ===== PAGE SWITCHING =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });

  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove('hidden');
    window.scrollTo(0, 0);
    
    // Load data when showing specific pages
    if (pageId === 'accountPage') {
      loadSubscriptionInfo();
    } else if (pageId === 'adminPage') {
      // Default to stripe tab, but don't reload users yet
    }
  }
}

// ===== SIGNUP =====
async function handleSignup(event) {
  event.preventDefault();

  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const password2 = document.getElementById('signupPassword2').value;

  if (password !== password2) {
    document.getElementById('signupError').textContent = 'Passwords do not match';
    return;
  }

  const response = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    currentUser = data.user;
    showPage('dashboardPage');
  } else {
    document.getElementById('signupError').textContent = data.error || 'Signup failed';
  }
}

// ===== LOGIN =====
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    currentUser = data.user;
    showPage('dashboardPage');
  } else {
    document.getElementById('loginError').textContent = data.error || 'Login failed';
  }
}

// ===== LOGOUT =====
function handleLogout() {
  currentUser = null;
  showPage('homePage');
}

<<<<<<< HEAD
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab + 'Form')?.classList.add('active');
  
  // Find and activate the correct tab button
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.textContent?.includes(tab === 'login' ? 'Sign In' : 'Sign Up')) {
      btn.classList.add('active');
    }
  });
}

// DASHBOARD
function updateDashboard() {
  const planName = currentSubscription?.plan || 'FREE';
  const badge = document.getElementById('userPlanBadge');
  badge.textContent = planName;
  badge.className = 'plan-badge ' + planName.toLowerCase();

  const aiGroup = document.getElementById('aiButtonsGroup');
  if (planName === 'PRO') {
    aiGroup.classList.remove('hidden');
    document.getElementById('upgradePrompt').classList.add('hidden');
  } else {
    aiGroup.classList.add('hidden');
    document.getElementById('upgradePrompt').classList.remove('hidden');
  }
}

function showAccountMenu() {
  const menu = document.getElementById('accountMenu');
  menu.classList.toggle('hidden');
}

// PRICING & CHECKOUT
=======
// ===== STRIPE CHECKOUT =====
>>>>>>> da94544 (Add Prisma setup, schema, and server updates)
async function startPlan(plan) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });

  const data = await response.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    alert('Checkout failed');
  }
}

// ===== CLEAN TEXT =====
document.getElementById('cleanBtn')?.addEventListener('click', () => {
  const input = document.getElementById('input').value;

<<<<<<< HEAD
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/subscriptions/cancel-subscription`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      alert('Cancelled');
      checkAuthStatus();
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function openStripePortal() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/billing/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to open billing portal');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    alert('Error opening billing portal: ' + error.message);
  }
}

async function loadSubscriptionInfo() {
  const info = document.getElementById('subscriptionInfo');
  if (!info) return;
  
  if (!currentSubscription) {
    info.innerHTML = '<p>No subscription information available</p>';
    return;
  }

  let html = `<p><strong>Plan:</strong> ${currentSubscription.plan}</p>`;
  if (currentSubscription.currentPeriodEnd) {
    const date = new Date(currentSubscription.currentPeriodEnd).toLocaleDateString();
    html += `<p><strong>Renews:</strong> ${date}</p>`;
  }
  info.innerHTML = html;
}

// TEXT CLEANING
function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–|—/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(line => line.trim())
    .join("\n")
=======
  const cleaned = input
    .replace(/\s+/g, ' ')
    .replace(/\s([?.!,])/g, '$1')
>>>>>>> da94544 (Add Prisma setup, schema, and server updates)
    .trim();

<<<<<<< HEAD
// ADMIN
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tab + 'Tab')?.classList.remove('hidden');
  
  // Find and activate the correct tab button
  const tabButtons = document.querySelectorAll('.admin-tab');
  tabButtons.forEach(btn => {
    if (btn.textContent?.toLowerCase().includes(tab.toLowerCase())) {
      btn.classList.add('active');
    }
  });
  
  // Load data when switching to users tab
  if (tab === 'users') {
    loadUsers();
  }
}

async function handleStripeConfig(event) {
  event.preventDefault();
  const token = localStorage.getItem('token');
  const publishableKey = document.getElementById('publishableKey').value;
  const secretKey = document.getElementById('secretKey').value;
  const webhookSecret = document.getElementById('webhookSecret').value;

  try {
    const response = await fetch(`${API_URL}/admin/stripe-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ publishableKey, secretKey, webhookSecret })
    });

    if (response.ok) {
      alert('Stripe config saved!');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function loadUsers() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const users = await response.json();
      const usersList = document.getElementById('usersList');
      usersList.innerHTML = users.map(user => `
        <div class="user-item">
          <p><strong>${user.email}</strong> - ${user.subscription?.plan}</p>
          <button onclick="grantProAccess('${user.id}')">Grant Pro</button>
          <button onclick="revokeAccess('${user.id}')">Revoke</button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Load error:', error);
  }
}

async function grantProAccess(userId) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API_URL}/admin/users/${userId}/grant-pro`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadUsers();
  } catch (error) {
    alert('Error');
  }
}

async function revokeAccess(userId) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API_URL}/admin/users/${userId}/revoke-access`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadUsers();
  } catch (error) {
    alert('Error');
  }
}

// LISTENERS
function attachEventListeners() {
  document.getElementById('startFreeBtn')?.addEventListener('click', () => {
    showPage(currentUser ? 'dashboardPage' : 'authPage');
  });

  document.getElementById('viewPricingBtn')?.addEventListener('click', () => {
    showPage('pricingPage');
  });

  document.getElementById('cleanBtn')?.addEventListener('click', () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    output.value = cleanText(input.value);
  });
  
  document.getElementById('aiSpellBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    
    if (!input.value) {
      alert('Please enter some text first');
      return;
    }
    
    // TODO: Implement AI spell check via API
    alert('AI spelling & grammar feature requires backend API integration');
  });
  
  document.getElementById('aiRewriteBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    
    if (!input.value) {
      alert('Please enter some text first');
      return;
    }
    
    // TODO: Implement AI rewrite via API
    alert('AI rewrite feature requires backend API integration');
  });

  document.getElementById('copyBtn')?.addEventListener('click', () => {
    const output = document.getElementById('output');
    output.select();
    document.execCommand('copy');
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = 'Copy Clean Text';
    }, 1500);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.account-menu')) {
    const menu = document.getElementById('accountMenu');
    if (menu) menu.classList.add('hidden');
  }
});

window.showPage = showPage;
window.startPlan = startPlan;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.showAccountMenu = showAccountMenu;
window.handleLogout = handleLogout;
window.cancelSubscription = cancelSubscription;
window.openStripePortal = openStripePortal;
window.switchAdminTab = switchAdminTab;
window.handleStripeConfig = handleStripeConfig;
window.loadUsers = loadUsers;
window.grantProAccess = grantProAccess;
window.revokeAccess = revokeAccess;
=======
  document.getElementById('output').value = cleaned;
});

// ===== COPY BUTTON =====
document.getElementById('copyBtn')?.addEventListener('click', () => {
  const output = document.getElementById('output');
  output.select();
  document.execCommand('copy');
  alert('Copied!');
});

// ===== NAVIGATION BUTTONS =====
document.getElementById('startFreeBtn')?.addEventListener('click', () => {
  showPage('authPage');
});

document.getElementById('viewPricingBtn')?.addEventListener('click', () => {
  showPage('pricingPage');
});

// Default page
document.addEventListener('DOMContentLoaded', () => {
  showPage('homePage');
});
>>>>>>> da94544 (Add Prisma setup, schema, and server updates)
