// CONFIG
const API_URL = 'http://localhost:3000/api';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Sz8jsRlPGLngNpAf33rUQCQmgqhhI8cU46n6Y9fJHTAvD5ugQ2s2n4WSPgePtigmnnWncSkO24aymeWSO3RCH6O00wleAK6c3';
let stripePromise = null;
try {
  if (typeof Stripe !== 'undefined') {
    stripePromise = Stripe(STRIPE_PUBLISHABLE_KEY);
  }
} catch (e) {
  console.warn('Stripe not available:', e);
}

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
      if (stripePromise && sessionId) {
        const result = await stripePromise.redirectToCheckout({ sessionId });
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

// ============================================================================
// ADMIN BILLING FUNCTIONS
// ============================================================================

// Load billing dashboard
async function loadBillingDashboard() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/metrics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const metrics = await response.json();
      
      // Update metrics
      document.getElementById('mrr').textContent = `$${metrics.mrr || 0}`;
      document.getElementById('arr').textContent = `$${metrics.arr || 0}`;
      document.getElementById('activeSubs').textContent = metrics.activeSubscriptions || 0;
      document.getElementById('trialSubs').textContent = metrics.trialingSubscriptions || 0;
      
      // Plan breakdown
      const planBreakdown = document.getElementById('planBreakdown');
      if (metrics.subscriptionsByPlan) {
        planBreakdown.innerHTML = metrics.subscriptionsByPlan.map(item => `
          <div class="plan-stat">
            <span class="plan-name">${item.plan}</span>
            <span class="plan-count">${item._count}</span>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Error loading billing dashboard:', error);
  }
}

// Load Stripe configuration status
async function loadStripeConfig() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const config = await response.json();
      const statusEl = document.getElementById('configStatus');
      
      if (config.configured) {
        statusEl.innerHTML = '<p class="success">✅ Stripe is configured and ready</p>';
      } else {
        statusEl.innerHTML = '<p class="warning">⚠️ Stripe is not configured. Add your API keys below.</p>';
      }
      
      // Set webhook URL
      const webhookUrl = document.getElementById('webhookUrl');
      if (webhookUrl) {
        webhookUrl.textContent = `${API_URL.replace('/api', '')}/api/webhooks/stripe`;
      }
    }
  } catch (error) {
    console.error('Error loading Stripe config:', error);
  }
}

// Load products and prices
async function loadProducts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const productsList = document.getElementById('productsList');
      
      if (data.products && data.products.length > 0) {
        productsList.innerHTML = data.products.map(product => `
          <div class="product-card">
            <h3>${product.name}</h3>
            <p>${product.description || 'No description'}</p>
            <span class="badge ${product.active ? 'badge-success' : 'badge-warning'}">
              ${product.active ? 'Active' : 'Inactive'}
            </span>
            <button class="btn btn-small" onclick="loadPricesForProduct('${product.id}')">
              View Prices
            </button>
            <button class="btn btn-small btn-primary" onclick="showCreatePriceModal('${product.id}')">
              + Add Price
            </button>
          </div>
        `).join('');
      } else {
        productsList.innerHTML = '<p class="empty-state">No products yet. Create one to get started.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Load subscriptions
async function loadSubscriptions() {
  try {
    const token = localStorage.getItem('token');
    const status = document.getElementById('subStatusFilter')?.value || '';
    
    const url = new URL(`${API_URL}/admin/billing/subscriptions`);
    if (status) url.searchParams.append('status', status);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const subsList = document.getElementById('subscriptionsList');
      
      if (data.subscriptions && data.subscriptions.length > 0) {
        subsList.innerHTML = data.subscriptions.map(sub => `
          <div class="subscription-card">
            <div class="sub-header">
              <span class="sub-email">${sub.user?.email || 'Unknown'}</span>
              <span class="badge badge-${getStatusClass(sub.status)}">${sub.status}</span>
            </div>
            <div class="sub-details">
              <p><strong>Plan:</strong> ${sub.plan}</p>
              <p><strong>Stripe ID:</strong> ${sub.stripeSubscriptionId || 'N/A'}</p>
              <p><strong>Period:</strong> ${formatDate(sub.currentPeriodStart)} - ${formatDate(sub.currentPeriodEnd)}</p>
            </div>
            <div class="sub-actions">
              ${sub.stripeSubscriptionId ? `
                <button class="btn btn-small btn-danger" onclick="confirmCancelSubscription('${sub.stripeSubscriptionId}')">
                  Cancel
                </button>
              ` : ''}
            </div>
          </div>
        `).join('');
      } else {
        subsList.innerHTML = '<p class="empty-state">No subscriptions found.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading subscriptions:', error);
  }
}

// Load customers
async function loadCustomers() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const customersList = document.getElementById('customersList');
      
      if (data.customers && data.customers.length > 0) {
        customersList.innerHTML = data.customers.map(customer => `
          <div class="customer-card">
            <h3>${customer.name || customer.email}</h3>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Customer ID:</strong> ${customer.id}</p>
            <p><strong>Created:</strong> ${formatDate(new Date(customer.created * 1000))}</p>
          </div>
        `).join('');
      } else {
        customersList.innerHTML = '<p class="empty-state">No customers found.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Load invoices
async function loadInvoices() {
  try {
    const token = localStorage.getItem('token');
    const status = document.getElementById('invoiceStatusFilter')?.value || '';
    
    const url = new URL(`${API_URL}/admin/billing/invoices`);
    if (status) url.searchParams.append('status', status);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const invoicesList = document.getElementById('invoicesList');
      
      if (data.invoices && data.invoices.length > 0) {
        invoicesList.innerHTML = data.invoices.map(invoice => `
          <div class="invoice-card">
            <div class="invoice-header">
              <span class="invoice-id">${invoice.stripeInvoiceId}</span>
              <span class="badge badge-${invoice.paid ? 'success' : 'warning'}">${invoice.status}</span>
            </div>
            <div class="invoice-details">
              <p><strong>Amount:</strong> $${(invoice.amount / 100).toFixed(2)} ${invoice.currency.toUpperCase()}</p>
              <p><strong>Customer:</strong> ${invoice.stripeCustomerId}</p>
              <p><strong>Created:</strong> ${formatDate(invoice.createdAt)}</p>
              ${invoice.hostedUrl ? `
                <a href="${invoice.hostedUrl}" target="_blank" class="btn btn-small">View Invoice</a>
              ` : ''}
            </div>
          </div>
        `).join('');
      } else {
        invoicesList.innerHTML = '<p class="empty-state">No invoices found.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
  }
}

// Load webhook events
async function loadWebhookEvents() {
  try {
    const token = localStorage.getItem('token');
    const processed = document.getElementById('webhookProcessedFilter')?.value || '';
    const type = document.getElementById('webhookTypeFilter')?.value || '';
    
    const url = new URL(`${API_URL}/admin/billing/webhook-events`);
    if (processed) url.searchParams.append('processed', processed);
    if (type) url.searchParams.append('type', type);
    url.searchParams.append('limit', '50');
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const eventsList = document.getElementById('webhookEventsList');
      
      if (data.events && data.events.length > 0) {
        eventsList.innerHTML = data.events.map(event => `
          <div class="webhook-event">
            <div class="event-header">
              <span class="event-type">${event.type}</span>
              <span class="badge badge-${event.processed ? 'success' : 'warning'}">
                ${event.processed ? 'Processed' : 'Pending'}
              </span>
            </div>
            <div class="event-details">
              <p><strong>Event ID:</strong> ${event.stripeEventId}</p>
              <p><strong>Created:</strong> ${formatDate(event.createdAt)}</p>
              ${event.error ? `<p class="error"><strong>Error:</strong> ${event.error}</p>` : ''}
              ${event.retryCount > 0 ? `<p><strong>Retries:</strong> ${event.retryCount}</p>` : ''}
            </div>
            ${!event.processed ? `
              <button class="btn btn-small" onclick="retryWebhookEvent('${event.stripeEventId}')">
                Retry
              </button>
            ` : ''}
          </div>
        `).join('');
      } else {
        eventsList.innerHTML = '<p class="empty-state">No webhook events found.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading webhook events:', error);
  }
}

// Handle create product
async function handleCreateProduct(event) {
  event.preventDefault();
  
  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    });
    
    if (response.ok) {
      closeModal('createProductModal');
      loadProducts();
      alert('Product created successfully!');
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to create product'}`);
    }
  } catch (error) {
    alert('Error creating product');
  }
}

// Handle create price
async function handleCreatePrice(event) {
  event.preventDefault();
  
  const productId = document.getElementById('priceProductId').value;
  const amount = parseInt(document.getElementById('priceAmount').value);
  const interval = document.getElementById('priceInterval').value;
  const trialDays = parseInt(document.getElementById('priceTrialDays').value) || undefined;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        productId, 
        amount, 
        interval: interval || undefined,
        trialDays 
      })
    });
    
    if (response.ok) {
      closeModal('createPriceModal');
      loadProducts();
      alert('Price created successfully!');
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to create price'}`);
    }
  } catch (error) {
    alert('Error creating price');
  }
}

// Confirm cancel subscription
function confirmCancelSubscription(subscriptionId) {
  showConfirmModal(
    'Cancel Subscription',
    'Are you sure you want to cancel this subscription? This action will cancel at the end of the billing period.',
    () => cancelAdminSubscription(subscriptionId)
  );
}

// Cancel subscription (admin)
async function cancelAdminSubscription(subscriptionId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ immediate: false })
    });
    
    if (response.ok) {
      loadSubscriptions();
      alert('Subscription will be canceled at the end of the billing period');
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to cancel subscription'}`);
    }
  } catch (error) {
    alert('Error canceling subscription');
  }
}

// Retry webhook event
async function retryWebhookEvent(eventId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/webhooks/stripe/retry/${eventId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      loadWebhookEvents();
      alert('Webhook event reprocessed successfully');
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to retry webhook'}`);
    }
  } catch (error) {
    alert('Error retrying webhook event');
  }
}

// Modal helpers
function showCreateProductModal() {
  document.getElementById('createProductModal').classList.remove('hidden');
}

function showCreatePriceModal(productId) {
  document.getElementById('priceProductId').value = productId;
  document.getElementById('createPriceModal').classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmBtn').onclick = () => {
    onConfirm();
    closeModal('confirmModal');
  };
  document.getElementById('confirmModal').classList.remove('hidden');
}

// Utility functions
function getStatusClass(status) {
  const statusMap = {
    'ACTIVE': 'success',
    'TRIALING': 'info',
    'PAST_DUE': 'warning',
    'CANCELED': 'danger'
  };
  return statusMap[status] || 'default';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function searchCustomers() {
  // Implement debounced search
  clearTimeout(window.customerSearchTimeout);
  window.customerSearchTimeout = setTimeout(() => {
    loadCustomers();
  }, 300);
}

// Update switchAdminTab to load data
const originalSwitchAdminTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
  // Switch tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // Activate selected tab
  event.target.classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.remove('hidden');
  
  // Load data based on tab
  switch(tabName) {
    case 'billing':
      loadBillingDashboard();
      break;
    case 'stripe':
      loadStripeConfig();
      break;
    case 'products':
      loadProducts();
      break;
    case 'subscriptions':
      loadSubscriptions();
      break;
    case 'customers':
      loadCustomers();
      break;
    case 'invoices':
      loadInvoices();
      break;
    case 'webhooks':
      loadWebhookEvents();
      break;
  }
};

// Export functions to window
window.loadBillingDashboard = loadBillingDashboard;
window.loadStripeConfig = loadStripeConfig;
window.loadProducts = loadProducts;
window.loadSubscriptions = loadSubscriptions;
window.loadCustomers = loadCustomers;
window.loadInvoices = loadInvoices;
window.loadWebhookEvents = loadWebhookEvents;
window.handleCreateProduct = handleCreateProduct;
window.handleCreatePrice = handleCreatePrice;
window.showCreateProductModal = showCreateProductModal;
window.showCreatePriceModal = showCreatePriceModal;
window.closeModal = closeModal;
window.confirmCancelSubscription = confirmCancelSubscription;
window.retryWebhookEvent = retryWebhookEvent;
window.searchCustomers = searchCustomers;
