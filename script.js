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

function initializeGoogleAuth() {
  if (!window.google) {
    console.error('Google Identity Services not loaded');
    return;
  }

  // Ensure task-buttons is hidden on load
  const taskButtons = document.getElementById('task-buttons');
  taskButtons.classList.add('hidden');
  taskButtons.classList.remove('visible');

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '782915328509-4joueiu50j6kkned1ksk1ccacusblka5.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      console.log('New access token:', accessToken); // Debug token
      fetchUserInfo();
    },
    hd: 'graniteschools.org',
    // Fallback for popup blocking
    error_callback: (error) => {
      console.error('OAuth error:', error);
      alert('Popup blocked by browser. Please allow popups for this site and try again.');
    }
  });

  // Check if already logged in (from localStorage)
  if (localStorage.getItem('userEmail') && localStorage.getItem('userName')) {
    document.getElementById('user-info').innerText = `Welcome, ${localStorage.getItem('userName')} (${localStorage.getItem('userEmail')})`;
    document.getElementById('login-btn').classList.add('hidden');
    taskButtons.classList.remove('hidden');
    taskButtons.classList.add('visible');
    initGoogleSheets();
  } else {
    tokenClient.requestAccessToken(); // Request token if not logged in
  }

  document.getElementById('login-btn').onclick = () => {
    tokenClient.requestAccessToken();
  };
}

async function fetchUserInfo() {
  const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const userInfo = await response.json();
  console.log('UserInfo response:', userInfo); // Debug response
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
  const taskButtons = document.getElementById('task-buttons');
  taskButtons.classList.remove('hidden');
  taskButtons.classList.add('visible');
  initGoogleSheets();
}

function logout() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  document.getElementById('user-info').innerText = '';
  document.getElementById('login-btn').classList.remove('hidden');
  const taskButtons = document.getElementById('task-buttons');
  taskButtons.classList.add('hidden');
  taskButtons.classList.remove('visible');
}

function initGoogleSheets() {
  loadOpenTasks();
}

async function loadOpenTasks() {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/Sheet1!A2:K', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Sheet response:', data); // Debug response
    const rows = data.values || [];
    openTasks = rows
      .filter(row => row[7] === 'Open' && row[0] === localStorage.getItem('userEmail'))
      .map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
    const taskSelect = document.getElementById('task-select');
    taskSelect.innerHTML = '<option value="">Select a task</option>';
    openTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.rowIndex;
      option.text = task.description;
      taskSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

async function appendTask(taskData) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/Sheet1!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[
        taskData.userEmail,
        taskData.userName,
        taskData.team,
        taskData.taskType,
        taskData.description,
        taskData.artifactLink || '',
        taskData.timeSpent || '',
        taskData.status,
        taskData.editorNotes || '',
        new Date().toISOString(),
        taskData.editorEmail || ''
      ]]
    })
  });
  return response.json();
}

// UI Event Listeners
document.getElementById('create-work-btn').onclick = () => {
  document.getElementById('create-modal').classList.remove('hidden');
};

document.getElementById('report-work-btn').onclick = () => {
  document.getElementById('report-modal').classList.remove('hidden');
};

document.getElementById('create-cancel').onclick = () => {
  document.getElementById('create-modal').classList.add('hidden');
};

document.getElementById('report-cancel').onclick = () => {
  document.getElementById('report-modal').classList.add('hidden');
};

document.getElementById('logout-btn').onclick = logout;

document.getElementById('create-form').onsubmit = async (e) => {
  e.preventDefault();
  const taskData = {
    userEmail: localStorage.getItem('userEmail'),
    userName: localStorage.getItem('userName'),
    team: document.getElementById('team').value,
    taskType: document.getElementById('task-type').value,
    description: document.getElementById('description').value,
    timeSpent: document.getElementById('estimated-time').value,
    status: 'Open'
  };
  await appendTask(taskData);
  document.getElementById('create-modal').classList.add('hidden');
  document.getElementById('create-form').reset();
  loadOpenTasks();
};

document.getElementById('report-form').onsubmit = async (e) => {
  e.preventDefault();
  const rowIndex = document.getElementById('task-select').value;
  if (!rowIndex) return;
  const taskData = {
    userEmail: localStorage.getItem('userEmail'),
    userName: localStorage.getItem('userName'),
    team: '',
    taskType: '',
    description: openTasks.find(task => task.rowIndex == rowIndex).description,
    artifactLink: document.getElementById('artifact-link').value,
    timeSpent: document.getElementById('actual-time').value,
    status: 'Pending'
  };
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/Sheet1!A${rowIndex}:K${rowIndex}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[
        taskData.userEmail,
        taskData.userName,
        taskData.team,
        taskData.taskType,
        taskData.description,
        taskData.artifactLink,
        taskData.timeSpent,
        taskData.status,
        taskData.editorNotes || '',
        new Date().toISOString(),
        taskData.editorEmail || ''
      ]]
    })
  });
  document.getElementById('report-modal').classList.add('hidden');
  document.getElementById('report-form').reset();
  loadOpenTasks();
};

// Load Google script when DOM is ready
document.addEventListener('DOMContentLoaded', loadGoogleScript);
