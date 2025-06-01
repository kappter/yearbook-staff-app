let tokenClient;
let accessToken = null;

function loadGoogleScript() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    console.log('Loading Google Script');
    initializeGoogleAuth();
  };
  script.onerror = () => {
    console.error('Failed to load Google Identity Services script');
    alert('Failed to load authentication services. Please try again later.');
  };
  document.head.appendChild(script);
}

function initializeGoogleAuth() {
  console.log('Initializing Google Auth');
  const state = JSON.parse(localStorage.getItem('authRedirectState'));
  if (state?.wasLoggingIn) {
    localStorage.removeItem('authRedirectState');
    const checkLogin = () => {
      if (accessToken) {
        checkFirstLogin(tokenClient);
      } else {
        setTimeout(checkLogin, 100);
      }
    };
    checkLogin();
  }
  if (!window.google) {
    console.error('Google Identity Services not loaded');
    return;
  }

  const taskButtons = document.getElementById('task-buttons');
  taskButtons.classList.add('hidden');
  taskButtons.classList.remove('visible');

  const termSelector = document.getElementById('term-selector');
  termSelector.classList.add('hidden');
  termSelector.classList.remove('visible');

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '782915328509-4joueiu50j6kkned1ksk1ccacusblka5.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        accessToken = tokenResponse.access_token;
        console.log('New access token:', accessToken);
        localStorage.setItem('tokenProcessed', 'true');
        fetchUserInfo();
      } else {
        console.error('No access token in response:', tokenResponse);
        alert('Authentication failed. Please try again.');
      }
    },
    hd: 'graniteschools.org',
    error_callback: (error) => {
      console.error('OAuth error:', error);
      if (error.type === 'popup_blocked' || error.type === 'popup_closed') {
        alert('Authentication popup was blocked or closed. Please allow popups and try again.');
      } else {
        alert('Authentication failed. Error: ' + (error.message || 'Unknown error'));
      }
    },
    usePopup: true,
  });

  const fetchToken = (retryCount = 0) => {
    if (localStorage.getItem('tokenProcessed') === 'true') {
      return;
    }
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' }); // Removed .catch since it doesn't return a Promise
  };

  fetchToken();
  setTimeout(() => {
    if (!accessToken && localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
      console.log('Retrying token fetch due to null accessToken');
      fetchToken();
    }
  }, 1000);

  if (localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
      userInfoElement.innerText = `Welcome, ${localStorage.getItem('userName')} (${localStorage.getItem('userEmail')})`;
    }
    document.getElementById('login-btn').classList.add('hidden');
    checkFirstLogin(tokenClient);
  }

  document.getElementById('login-btn').onclick = () => {
    console.log('Login button clicked');
    fetchToken();
  };

  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';

  themeToggle.addEventListener('click', () => {
    console.log('Theme toggle clicked');
    const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
  });

  const termSelect = document.getElementById('term-select');
  const savedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  termSelect.value = savedTerm;
  termSelect.addEventListener('change', () => {
    const selectedTerm = termSelect.value;
    localStorage.setItem('selectedTerm', selectedTerm);
    initGoogleSheets(tokenClient);
    updateDashboard();
  });
}

async function fetchUserInfo() {
  try {
    if (!accessToken) {
      console.error('No access token available for user info fetch');
      localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
      if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    }
    const spinner = showLoadingSpinner();
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        console.log('401 on user info, requesting new token');
        localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
        if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userInfo = await response.json();
    console.log('UserInfo response:', userInfo);
    if (userInfo.hd !== 'graniteschools.org') {
      console.error('User not from graniteschools.org');
      google.accounts.oauth2.revoke(accessToken);
      logout();
      return;
    }
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
      userInfoElement.innerText = `Welcome, ${userInfo.name} (${userInfo.email})`;
    } else {
      console.warn('User info element not found');
    }
    localStorage.setItem('userEmail', userInfo.email);
    localStorage.setItem('userName', userInfo.name);
    document.getElementById('login-btn').classList.add('hidden');
    checkFirstLogin(tokenClient);
  } catch (error) {
    console.error('Error fetching user info:', error);
    logout();
  } finally {
    hideLoadingSpinner(document.getElementById('loading-spinner'));
  }
}

function logout() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userTeam');
  localStorage.removeItem('userRole');
  localStorage.removeItem('selectedTerm');
  localStorage.removeItem('tokenProcessed');
  const userInfoElement = document.getElementById('user-info');
  if (userInfoElement) {
    userInfoElement.innerText = '';
  }
  document.getElementById('login-btn').classList.remove('hidden');
  const taskButtons = document.getElementById('task-buttons');
  taskButtons.classList.add('hidden');
  taskButtons.classList.remove('visible');
  const termSelector = document.getElementById('term-selector');
  termSelector.classList.add('hidden');
  termSelector.classList.remove('visible');
  const pendingRequests = document.getElementById('pending-requests');
  pendingRequests.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', loadGoogleScript);
