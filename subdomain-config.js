// SUBDOMAIN CONFIGURATION
function getSubdomainConfig() {
  const hostname = window.location.hostname;
  const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
  
  let config = {
    subdomain: '',
    apiUrl: '',
    billingUrl: '',
    adminUrl: '',
    mainAppUrl: ''
  };

  if (isDevelopment) {
    // Development: Use localhost with different ports
    config.subdomain = '';
    config.apiUrl = 'http://localhost:3000/api';
    config.billingUrl = 'http://localhost:3002';
    config.adminUrl = 'http://localhost:3003';
    config.mainAppUrl = 'http://localhost:3001';
  } else {
    // Production: Use actual subdomains
    const parts = hostname.split('.');
    
    if (parts.length >= 3) {
      config.subdomain = parts[0];
    }
    
    const baseDomain = 'textwash.app';
    const protocol = 'https';
    
    config.apiUrl = `${protocol}://api.${baseDomain}/api`;
    config.billingUrl = `${protocol}://billing.${baseDomain}`;
    config.adminUrl = `${protocol}://admin.${baseDomain}`;
    config.mainAppUrl = `${protocol}://${baseDomain}`;
  }

  return config;
}

const SUBDOMAIN_CONFIG = getSubdomainConfig();
