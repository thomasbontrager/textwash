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

// Export functions for use in HTML onclick handlers (if needed)
window.adminDashboard = {
  openModal,
  closeModal,
  navigateToPage,
  handleLogout,
  apiRequest,
  showToast
};
