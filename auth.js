let tokenClient;
let accessToken = null;

function loadGoogleScript() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    initializeGoogleAuth();
  };
  script.onerror = () => {
    console.error('Failed to load Google Identity Services script');
  };
  document.head.appendChild(script);
}

function initializeGoogleAuth() {
  const state = JSON.parse(localStorage.getItem('authRedirectState'));
  if (state?.wasLoggingIn) {
    localStorage.removeItem('authRedirectState');
    checkFirstLogin();
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
      accessToken = tokenResponse.access_token;
      console.log('New access token:', accessToken);
      fetchUserInfo();
    },
    hd: 'graniteschools.org',
    error_callback: (error) => {
      console.error('OAuth error:', error);
      if (error.type === 'popup_blocked' || error.type === 'popup_closed') {
        alert('Authentication failed. Please allow redirects or ensure popups are allowed and try again.');
      } else {
        alert('Authentication failed. Error: ' + error.message);
      }
    },
    usePopup: false // Force redirect instead of popup
  });

  const fetchToken = () => {
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  // Retry token fetch if accessToken is still null after 1 second
  fetchToken();
  setTimeout(() => {
    if (!accessToken && localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
      console.log('Retrying token fetch due to null accessToken');
      fetchToken();
    }
  }, 1000);

  if (localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
    document.getElementById('user-info').innerText = `Welcome, ${localStorage.getItem('userName')} (${localStorage.getItem('userEmail')})`;
    document.getElementById('login-btn').classList.add('hidden');
  }

  document.getElementById('login-btn').onclick = () => {
    fetchToken();
  };
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
    document.getElementById('user-info').innerText = `Welcome, ${userInfo.name} (${userInfo.email})`;
    localStorage.setItem('userEmail', userInfo.email);
    localStorage.setItem('userName', userInfo.name);
    document.getElementById('login-btn').classList.add('hidden');
    checkFirstLogin();
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
  document.getElementById('user-info').innerText = '';
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
