let tokenClient;
let accessToken = null;
let openTasks = [];

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

function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.classList.remove('visible');
    modal.classList.add('hidden');
  });
}

function initializeGoogleAuth() {
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
      console.log('Token response:', tokenResponse);
      fetchUserInfo();
    },
    hd: 'graniteschools.org',
    error_callback: (error) => {
      console.error('OAuth error:', error);
      alert('Popup blocked by browser. Please allow popups for this site and try again.');
    }
  });

  if (localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
    document.getElementById('user-info').innerText = `Welcome, ${localStorage.getItem('userName')} (${localStorage.getItem('userEmail')})`;
    document.getElementById('login-btn').classList.add('hidden');
    checkFirstLogin();
  } else {
    tokenClient.requestAccessToken();
  }

  document.getElementById('login-btn').onclick = () => {
    tokenClient.requestAccessToken();
  };

  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';

  themeToggle.addEventListener('click', () => {
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
    initGoogleSheets();
    updateDashboard();
  });
}

async function fetchUserInfo() {
  try {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
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
  }
}

function checkFirstLogin() {
  const userTeam = localStorage.getItem('userTeam');
  const userRole = localStorage.getItem('userRole');
  if (!userTeam || !userRole) {
    closeAllModals();
    const firstLoginModal = document.getElementById('first-login-modal');
    const roleSelection = document.getElementById('role-selection');
    const userTeamSelect = document.getElementById('user-team');

    userTeamSelect.addEventListener('change', () => {
      if (userTeamSelect.value === 'Leadership') {
        roleSelection.classList.remove('hidden');
        document.getElementById('user-role').innerHTML = `
          <option value="">Select a role</option>
          <option value="Chief Editor">Chief Editor</option>
          <option value="Advisor">Advisor</option>
        `;
      } else {
        roleSelection.classList.remove('hidden');
        document.getElementById('user-role').innerHTML = `
          <option value="">Select a role</option>
          <option value="Staff">Staff</option>
          <option value="Editor">Editor</option>
        `;
      }
    });

    firstLoginModal.classList.remove('hidden');
    firstLoginModal.classList.add('visible');
  } else {
    const taskButtons = document.getElementById('task-buttons');
    taskButtons.classList.remove('hidden');
    taskButtons.classList.add('visible');
    const termSelector = document.getElementById('term-selector');
    termSelector.classList.remove('hidden');
    termSelector.classList.add('visible');
    initGoogleSheets();
    updateDashboard();
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

function initGoogleSheets() {
  const userEmail = localStorage.getItem('userEmail');
  const userTeam = localStorage.getItem('userTeam');
  const userRole = localStorage.getItem('userRole');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  window.utils.loadOpenTasks(accessToken, userEmail, userTeam, userRole, selectedTerm).then(tasks => {
    openTasks = tasks;
    const taskSelect = document.getElementById('task-select');
    taskSelect.innerHTML = '<option value="">Select a task</option>';
    openTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.rowIndex;
      option.text = task.description;
      taskSelect.appendChild(option);
    });