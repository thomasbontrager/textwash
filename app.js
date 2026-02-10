import { loadStripe } from '@stripe/stripe-js';

// CONFIG
const API_URL = 'http://localhost:3000/api';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Sz8jsRlPGLngNpAf33rUQCQmgqhhI8cU46n6Y9fJHTAvD5ugQ2s2n4WSPgePtigmnnWncSkO24aymeWSO3RCH6O00wleAK6c3';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// STATE
let currentUser = null;
let currentSubscription = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  attachEventListeners();
  document.body.classList.add('loaded');
});

// ROUTING
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
}

// AUTH
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        currentUser = await response.json();
        currentSubscription = currentUser.subscription;
        showPage('dashboardPage');
        updateDashboard();
      } else {
        localStorage.removeItem('token');
        showPage('homePage');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      showPage('homePage');
    }
  } else {
    showPage('homePage');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const password2 = document.getElementById('signupPassword2').value;

  if (password !== password2) {
    document.getElementById('signupError').textContent = 'Passwords do not match';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      currentUser = user;
      currentSubscription = user.subscription;
      showPage('dashboardPage');
      updateDashboard();
    } else {
      const error = await response.json();
      document.getElementById('signupError').textContent = error.error || 'Signup failed';
    }
  } catch (error) {
    document.getElementById('signupError').textContent = 'Network error';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      currentUser = user;
      currentSubscription = user.subscription;
      showPage('dashboardPage');
      updateDashboard();
    } else {
      const error = await response.json();
      document.getElementById('loginError').textContent = error.error || 'Login failed';
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'Network error';
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  currentUser = null;
  currentSubscription = null;
  document.getElementById('loginForm').reset();
  document.getElementById('signupForm').reset();
  showPage('homePage');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab + 'Form')?.classList.add('active');
  event.target.classList.add('active');
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
async function startPlan(plan) {
  if (!currentUser) {
    showPage('authPage');
    return;
  }

  if (plan === 'free') {
    alert('Free access available!');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/subscriptions/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan: plan.toUpperCase() })
    });

    if (response.ok) {
      const { sessionId, url } = await response.json();
      const stripe = await stripePromise;
      if (stripe && sessionId) {
        const result = await stripe.redirectToCheckout({ sessionId });
        if (result.error) {
          alert(result.error.message || 'Stripe checkout failed');
        }
      } else if (url) {
        window.location.href = url;
      }
    } else {
      alert('Failed to create session');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// SUBSCRIPTIONS
async function cancelSubscription() {
  if (!confirm('Cancel subscription?')) return;

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
  if (!currentSubscription) return;

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
    .trim();
}

// ADMIN
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tab + 'Tab')?.classList.remove('hidden');
  event.target.classList.add('active');
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
