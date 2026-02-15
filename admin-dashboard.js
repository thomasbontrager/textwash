// Admin Dashboard JavaScript

// Configuration
const API_URL = SUBDOMAIN_CONFIG.apiUrl;

// State
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

// Main initialization function
async function initAdminDashboard() {
  // Check authentication and admin role
  await checkAdminAuth();
  
  // Setup event listeners
  setupEventListeners();
  
  // Hide loading state
  hideLoading();
}

// Check if user is authenticated and has admin role
async function checkAdminAuth() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    redirectToLogin();
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      redirectToLogin();
      return;
    }
    
    currentUser = await response.json();
    
    // Check if user has admin role
    if (currentUser.role !== 'ADMIN') {
      showUnauthorizedError();
      return;
    }
    
    // Update UI with user info
    updateUserInfo();
    
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToLogin();
  }
}

// Update user info in the sidebar
function updateUserInfo() {
  const adminEmailEl = document.getElementById('adminEmail');
  if (adminEmailEl && currentUser) {
    adminEmailEl.textContent = currentUser.email;
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Sidebar toggle for mobile
  const openSidebarBtn = document.getElementById('openSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');
  
  if (openSidebarBtn) {
    openSidebarBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }
  
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) {
      if (!sidebar.contains(e.target) && !openSidebarBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
  
  // Navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateToPage(page);
      
      // Close sidebar on mobile after navigation
      if (window.innerWidth < 1024) {
        sidebar.classList.remove('open');
      }
    });
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Modal close buttons
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
}

// Navigate to a specific page
function navigateToPage(pageName) {
  // Hide all pages
  const allPages = document.querySelectorAll('.page-content');
  allPages.forEach(page => page.classList.add('hidden'));
  
  // Show selected page
  const targetPageId = `${pageName}Page`;
  const targetPage = document.getElementById(targetPageId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  }
  
  // Update navigation active state
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.page === pageName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update page title
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = formatPageTitle(pageName);
  }
  
  // Load page data if needed
  loadPageData(pageName);
}

// Format page name for display
function formatPageTitle(pageName) {
  const titles = {
    'dashboard': 'Dashboard',
    'users': 'Users Management',
    'plans': 'Subscription Plans',
    'feature-flags': 'Feature Flags',
    'billing': 'Billing Overview',
    'webhooks': 'Webhook Monitor',
    'ai-usage': 'AI Usage Statistics',
    'logs': 'System Logs',
    'oauth': 'OAuth Configuration',
    'emails': 'Email Management'
  };
  return titles[pageName] || 'Dashboard';
}

// Load data for specific page (placeholder for future implementation)
async function loadPageData(pageName) {
  // This is where you would load data from the API
  // For now, it's just a placeholder
  console.log(`Loading data for ${pageName} page...`);
  
  // Example: Load users data
  if (pageName === 'users') {
    // await loadUsersData();
  }
  
  // Load webhooks data
  if (pageName === 'webhooks') {
    await loadWebhooksData();
  }
  
  // Example: Load billing data
  if (pageName === 'billing') {
    // await loadBillingData();
  }
}

// Modal functions
function openModal(title, body, showFooter = false) {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  
  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = body;
  
  if (modalFooter) {
    if (showFooter) {
      modalFooter.classList.remove('hidden');
    } else {
      modalFooter.classList.add('hidden');
    }
  }
  
  if (modalOverlay) {
    modalOverlay.classList.remove('hidden');
  }
}

function closeModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('hidden');
  }
}

// Show/hide loading state
function showLoading() {
  const loadingState = document.getElementById('loadingState');
  const mainContainer = document.getElementById('mainContainer');
  
  if (loadingState) loadingState.classList.remove('hidden');
  if (mainContainer) mainContainer.classList.add('hidden');
}

function hideLoading() {
  const loadingState = document.getElementById('loadingState');
  const mainContainer = document.getElementById('mainContainer');
  
  if (loadingState) loadingState.classList.add('hidden');
  if (mainContainer) mainContainer.classList.remove('hidden');
}

// Handle logout
function handleLogout() {
  localStorage.removeItem('token');
  redirectToLogin();
}

// Redirect to login page
function redirectToLogin() {
  window.location.href = '/index.html';
}

// Show unauthorized error
function showUnauthorizedError() {
  document.body.innerHTML = `
    <div class="fixed inset-0 bg-bg-dark flex items-center justify-center p-4">
      <div class="text-center max-w-md">
        <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h1 class="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p class="text-gray-400 mb-6">You don't have permission to access the admin dashboard. Please contact your administrator.</p>
        <button onclick="window.location.href='/index.html'" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
          Return to Home
        </button>
      </div>
    </div>
  `;
}

// Utility: Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error('Unauthorized');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Utility: Show toast notification (placeholder)
function showToast(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Implement actual toast notification UI
}

// Utility: Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Utility: Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== WEBHOOK MONITORING FUNCTIONS ==========

// Constants
const MAX_ERROR_DISPLAY_LENGTH = 50;

// State for webhooks
let webhookFilters = {
  eventType: '',
  status: '',
  limit: 100,
  offset: 0
};

// Setup webhook event listeners
function setupWebhookListeners() {
  const refreshBtn = document.getElementById('refreshWebhooks');
  const applyFiltersBtn = document.getElementById('applyWebhookFilters');
  const prevPageBtn = document.getElementById('webhookPrevPage');
  const nextPageBtn = document.getElementById('webhookNextPage');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      webhookFilters.offset = 0;
      loadWebhooksData();
    });
  }
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      const eventType = document.getElementById('webhookEventTypeFilter').value;
      const status = document.getElementById('webhookStatusFilter').value;
      
      webhookFilters.eventType = eventType;
      webhookFilters.status = status;
      webhookFilters.offset = 0;
      
      loadWebhooksData();
    });
  }
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (webhookFilters.offset > 0) {
        webhookFilters.offset -= webhookFilters.limit;
        loadWebhooksData();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      webhookFilters.offset += webhookFilters.limit;
      loadWebhooksData();
    });
  }
}

// Load webhooks data from API
async function loadWebhooksData() {
  try {
    const params = new URLSearchParams();
    if (webhookFilters.eventType) params.append('eventType', webhookFilters.eventType);
    if (webhookFilters.status) params.append('status', webhookFilters.status);
    params.append('limit', webhookFilters.limit.toString());
    params.append('offset', webhookFilters.offset.toString());
    
    const data = await apiRequest(`/admin/webhooks?${params.toString()}`, 'GET');
    
    displayWebhooks(data);
    updateWebhookPagination(data);
  } catch (error) {
    console.error('Failed to load webhooks:', error);
    showToast('Failed to load webhooks', 'error');
    displayWebhooksError();
  }
}

// Display webhooks in the table
function displayWebhooks(data) {
  const tbody = document.getElementById('webhooksTableBody');
  
  if (!tbody) return;
  
  if (!data.webhooks || data.webhooks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-gray-500">
          <div class="flex flex-col items-center">
            <svg class="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            <p>No webhook events found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.webhooks.map(webhook => {
    const statusColor = webhook.status === 'processed' ? 'text-green-400' : 
                       webhook.status === 'failed' ? 'text-red-400' : 
                       'text-yellow-400';
    
    const statusBadge = webhook.status === 'processed' ? 'bg-green-900/30 text-green-400' : 
                       webhook.status === 'failed' ? 'bg-red-900/30 text-red-400' : 
                       'bg-yellow-900/30 text-yellow-400';
    
    const timestamp = new Date(webhook.createdAt).toLocaleString();
    const errorText = webhook.lastError ? webhook.lastError.substring(0, MAX_ERROR_DISPLAY_LENGTH) + '...' : '-';
    
    return `
      <tr class="border-b border-gray-800 hover:bg-panel-hover">
        <td class="py-3 px-4">
          <div class="text-sm text-white font-mono">${escapeHtml(webhook.eventType)}</div>
          <div class="text-xs text-gray-500">${webhook.source}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-1 text-xs rounded ${statusBadge}">${webhook.status}</span>
        </td>
        <td class="py-3 px-4 text-sm text-gray-400">${timestamp}</td>
        <td class="py-3 px-4 text-sm text-gray-400">${webhook.attempts}</td>
        <td class="py-3 px-4">
          <div class="text-sm ${webhook.lastError ? 'text-red-400' : 'text-gray-500'}" title="${escapeHtml(webhook.lastError || '')}">
            ${escapeHtml(errorText)}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="flex gap-2">
            <button onclick="adminDashboard.viewWebhookJSON('${webhook.id}')" class="text-primary hover:text-primary-dark text-sm">
              View JSON
            </button>
            ${webhook.status === 'failed' ? `
              <button onclick="adminDashboard.retryWebhook('${webhook.id}')" class="text-yellow-400 hover:text-yellow-300 text-sm">
                Retry
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Display error state
function displayWebhooksError() {
  const tbody = document.getElementById('webhooksTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-8 text-gray-500">
        <div class="flex flex-col items-center">
          <svg class="w-12 h-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>Failed to load webhook events</p>
        </div>
      </td>
    </tr>
  `;
}

// Update pagination controls
function updateWebhookPagination(data) {
  const totalEl = document.getElementById('webhookTotal');
  const prevBtn = document.getElementById('webhookPrevPage');
  const nextBtn = document.getElementById('webhookNextPage');
  
  if (totalEl) {
    totalEl.textContent = data.total || 0;
  }
  
  if (prevBtn) {
    prevBtn.disabled = webhookFilters.offset === 0;
  }
  
  if (nextBtn) {
    const hasMore = (webhookFilters.offset + webhookFilters.limit) < data.total;
    nextBtn.disabled = !hasMore;
  }
}

// View webhook JSON in modal
async function viewWebhookJSON(webhookId) {
  try {
    const webhook = await apiRequest(`/admin/webhooks/${webhookId}`, 'GET');
    
    openModal(
      `Webhook Event: ${webhook.eventType}`,
      `<div class="bg-panel-dark p-4 rounded-lg overflow-auto max-h-96">
        <pre class="text-sm text-gray-300">${JSON.stringify(webhook.payload, null, 2)}</pre>
      </div>`,
      null,
      null
    );
  } catch (error) {
    console.error('Failed to load webhook details:', error);
    showToast('Failed to load webhook details', 'error');
  }
}

// Retry a failed webhook
async function retryWebhook(webhookId) {
  try {
    await apiRequest(`/admin/webhooks/${webhookId}/retry`, 'POST');
    showToast('Webhook queued for retry', 'success');
    loadWebhooksData();
  } catch (error) {
    console.error('Failed to retry webhook:', error);
    showToast('Failed to retry webhook', 'error');
  }
}

// Initialize webhook listeners on page load
document.addEventListener('DOMContentLoaded', () => {
  setupWebhookListeners();
});

// Export functions for use in HTML onclick handlers (if needed)
window.adminDashboard = {
  openModal,
  closeModal,
  navigateToPage,
  handleLogout,
  apiRequest,
  showToast,
  viewWebhookJSON,
  retryWebhook
};
