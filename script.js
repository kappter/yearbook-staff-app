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

function showLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.id = 'loading-spinner';
  spinner.innerHTML = 'Loading...';
  spinner.style.position = 'fixed';
  spinner.style.top = '50%';
  spinner.style.left = '50%';
  spinner.style.transform = 'translate(-50%, -50%)';
  spinner.style.padding = '10px 20px';
  spinner.style.background = 'rgba(0, 0, 0, 0.7)';
  spinner.style.color = '#fff';
  spinner.style.borderRadius = '5px';
  document.body.appendChild(spinner);
  return spinner;
}

function hideLoadingSpinner(spinner) {
  if (spinner) spinner.remove();
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
      fetchUserInfo();
    },
    hd: 'graniteschools.org',
    error_callback: (error) => {
      console.error('OAuth error:', error);
      alert('Authentication failed. Please ensure popups are allowed and try again.');
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
    if (!accessToken) {
      console.error('No access token available for user info fetch');
      tokenClient.requestAccessToken();
      return;
    }
    const spinner = showLoadingSpinner();
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        console.log('401 on user info, requesting new token');
        tokenClient.requestAccessToken();
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
  if (!window.utils) {
    console.error('window.utils is not defined. Ensure utils.js is loaded.');
    return;
  }
  if (!accessToken) {
    console.error('No access token available for initGoogleSheets');
    tokenClient.requestAccessToken();
    return;
  }
  const spinner = showLoadingSpinner();
  const userEmail = localStorage.getItem('userEmail');
  const userTeam = localStorage.getItem('userTeam');
  const userRole = localStorage.getItem('userRole');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  window.utils.loadOpenTasks(accessToken, userEmail, userTeam, userRole, selectedTerm, tokenClient).then(tasks => {
    openTasks = tasks;
    const taskSelect = document.getElementById('task-select');
    taskSelect.innerHTML = '<option value="">Select a task</option>';
    openTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.rowIndex;
      option.text = task.description;
      taskSelect.appendChild(option);
    });
    updateDashboard();
  }).catch(error => {
    console.error('Failed to load tasks:', error);
  }).finally(() => {
    hideLoadingSpinner(spinner);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const firstLoginForm = document.getElementById('first-login-form');
  if (firstLoginForm) {
    firstLoginForm.onsubmit = async (e) => {
      e.preventDefault();
      const userTeam = document.getElementById('user-team').value;
      const userRole = document.getElementById('user-role').value;
      if (!userTeam || !userRole) {
        alert('Please select both a team and a role.');
        return;
      }
      localStorage.setItem('userTeam', userTeam);
      localStorage.setItem('userRole', userRole);
      
      const taskData = {
        userEmail: localStorage.getItem('userEmail'),
        userName: localStorage.getItem('userName'),
        team: userTeam,
        taskType: 'Profile Setup',
        description: `User assigned to ${userTeam} as ${userRole}`,
        timeSpent: '0',
        status: 'Approved',
        artifactLink: '',
        editorNotes: '',
        editorEmail: '',
        userTeam: userTeam,
        userRole: userRole,
        creationDate: new Date().toISOString(),
        completionDate: new Date().toISOString()
      };
      console.log('Creating task:', taskData);
      if (!window.utils) {
        console.error('window.utils is not defined. Cannot append task.');
        return;
      }
      if (!accessToken) {
        console.error('No access token available for task append');
        tokenClient.requestAccessToken();
        return;
      }
      try {
        const spinner = showLoadingSpinner();
        await window.utils.appendTask(accessToken, taskData, 'Sheet1', tokenClient);
        closeAllModals();
        const taskButtons = document.getElementById('task-buttons');
        taskButtons.classList.remove('hidden');
        taskButtons.classList.add('visible');
        const termSelector = document.getElementById('term-selector');
        termSelector.classList.remove('hidden');
        termSelector.classList.add('visible');
        initGoogleSheets();
      } catch (error) {
        console.error('Error appending task:', error);
      } finally {
        hideLoadingSpinner(spinner);
      }
    };
  } else {
    console.error('Form with ID "first-login-form" not found.');
  }

  // Add event listeners for modal close buttons with null checks
  const weeklyReportClose = document.getElementById('weekly-report-close');
  if (weeklyReportClose) {
    weeklyReportClose.onclick = () => {
      closeAllModals();
    };
  } else {
    console.warn('Element with ID "weekly-report-close" not found.');
  }

  const overallReportClose = document.getElementById('overall-report-close');
  if (overallReportClose) {
    overallReportClose.onclick = () => {
      closeAllModals();
    };
  } else {
    console.warn('Element with ID "overall-report-close" not found.');
  }

  const hoursReportClose = document.getElementById('hours-report-close');
  if (hoursReportClose) {
    hoursReportClose.onclick = () => {
      closeAllModals();
    };
  } else {
    console.warn('Element with ID "hours-report-close" not found.');
  }
});

document.getElementById('weekly-report-btn').onclick = async () => {
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');
  const userTeam = localStorage.getItem('userTeam');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  let tasks;
  if (!window.utils) {
    console.error('window.utils is not defined. Cannot fetch tasks.');
    return;
  }
  if (!accessToken) {
    console.error('No access token available for weekly report');
    tokenClient.requestAccessToken();
    return;
  }
  try {
    const spinner = showLoadingSpinner();
    if (userRole === 'Advisor' || userRole === 'Chief Editor') {
      tasks = await window.utils.fetchAllTasks(accessToken, selectedTerm, tokenClient);
    } else if (userRole === 'Editor') {
      tasks = await window.utils.fetchTeamTasks(accessToken, userTeam, selectedTerm, tokenClient);
    } else {
      tasks = await window.utils.fetchUserTasks(accessToken, userEmail, selectedTerm, tokenClient);
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let weeklyTasks = tasks.filter(task => {
      const taskDate = new Date(task.submissionDate);
      return task.submissionDate && !isNaN(taskDate) && taskDate >= startOfWeek && taskDate <= endOfWeek && task.status === 'Approved';
    });

    weeklyTasks.sort((a, b) => (parseFloat(b.timeSpent) || 0) - (parseFloat(a.timeSpent) || 0));

    const content = document.getElementById('weekly-report-content');
    if (weeklyTasks.length === 0) {
      content.innerHTML = `<p>No approved tasks completed this week in ${selectedTerm}.</p>`;
    } else {
      let totalTime = 0;
      let html = '<ul>';
      weeklyTasks.forEach(task => {
        const timeSpent = parseFloat(task.timeSpent) || 0;
        html += `<li>${task.description} (${timeSpent} minutes, ${task.status}, User: ${task.userEmail})</li>`;
        totalTime += timeSpent;
      });
      html += '</ul>';
      html += `<p>Total Time This Week in ${selectedTerm}: ${totalTime} minutes (${(totalTime / 60).toFixed(1)} hours)</p>`;
      content.innerHTML = html;
    }
    closeAllModals();
    document.getElementById('weekly-report-modal').classList.remove('hidden');
    document.getElementById('weekly-report-modal').classList.add('visible');
  } catch (error) {
    console.error('Error generating weekly report:', error);
  } finally {
    hideLoadingSpinner(document.getElementById('loading-spinner'));
  }
};

document.getElementById('overall-report-btn').onclick = async () => {
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');
  const userTeam = localStorage.getItem('userTeam');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  let tasks;
  if (!window.utils) {
    console.error('window.utils is not defined. Cannot fetch tasks.');
    return;
  }
  if (!accessToken) {
    console.error('No access token available for overall report');
    tokenClient.requestAccessToken();
    return;
  }
  try {
    const spinner = showLoadingSpinner();
    if (userRole === 'Advisor' || userRole === 'Chief Editor') {
      tasks = await window.utils.fetchAllTasks(accessToken, selectedTerm, tokenClient);
    } else if (userRole === 'Editor') {
      tasks = await window.utils.fetchTeamTasks(accessToken, userTeam, selectedTerm, tokenClient);
    } else {
      tasks = await window.utils.fetchUserTasks(accessToken, userEmail, selectedTerm, tokenClient);
    }

    const periods = [
      { name: 'Summer Work', start: new Date('2025-06-01'), end: new Date('2025-08-31') },
      { name: '2026 Term 1', start: new Date('2025-09-01'), end: new Date('2025-11-30') },
      { name: '2026 Term 2', start: new Date('2025-12-01'), end: new Date('2026-02-28') },
      { name: '2026 Term 3', start: new Date('2026-03-01'), end: new Date('2026-05-31') },
      { name: 'Post Publication', start: new Date('2026-06-01'), end: new Date('2026-08-31') }
    ];

    const report = periods.map(period => {
      const periodTasks = tasks.filter(task => {
        const taskDate = new Date(task.submissionDate);
        return task.submissionDate && !isNaN(taskDate) && taskDate >= period.start && taskDate <= period.end && task.status === 'Approved';
      });
      const totalTime = periodTasks.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);
      return { period: period.name, totalTime };
    });

    const content = document.getElementById('overall-report-content');
    let html = `<p>Overall Report for ${selectedTerm}</p><ul>`;
    report.forEach(r => {
      html += `<li>${r.period}: ${r.totalTime} minutes (${(r.totalTime / 60).toFixed(1)} hours)</li>`;
    });
    html += '</ul>';
    content.innerHTML = html;
    closeAllModals();
    document.getElementById('overall-report-modal').classList.remove('hidden');
    document.getElementById('overall-report-modal').classList.add('visible');
  } catch (error) {
    console.error('Error generating overall report:', error);
  } finally {
    hideLoadingSpinner(document.getElementById('loading-spinner'));
  }
};

document.getElementById('create-work-btn').onclick = () => {
  closeAllModals();
  document.getElementById('create-modal').classList.remove('hidden');
  document.getElementById('create-modal').classList.add('visible');
};

document.getElementById('report-work-btn').onclick = () => {
  closeAllModals();
  document.getElementById('report-modal').classList.remove('hidden');
  document.getElementById('report-modal').classList.add('visible');
};

document.getElementById('create-cancel').onclick = () => {
  closeAllModals();
};

document.getElementById('report-cancel').onclick = () => {
  closeAllModals();
};

document.getElementById('logout-btn').onclick = logout;

document.getElementById('create-form').onsubmit = async (e) => {
  e.preventDefault();
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  const taskData = {
    userEmail: localStorage.getItem('userEmail'),
    userName: localStorage.getItem('userName'),
    team: document.getElementById('team').value,
    taskType: document.getElementById('task-type').value,
    description: document.getElementById('description').value,
    timeSpent: document.getElementById('estimated-time').value,
    status: 'Open',
    artifactLink: '',
    editorNotes: '',
    editorEmail: '',
    userTeam: localStorage.getItem('userTeam'),
    userRole: localStorage.getItem('userRole'),
    creationDate: new Date().toISOString(),
    completionDate: ''
  };
  console.log('Creating task:', taskData);
  if (!window.utils) {
    console.error('window.utils is not defined. Cannot append task.');
    return;
  }
  if (!accessToken) {
    console.error('No access token available for task creation');
    tokenClient.requestAccessToken();
    return;
  }
  try {
    const spinner = showLoadingSpinner();
    await window.utils.appendTask(accessToken, taskData, selectedTerm, tokenClient);
    closeAllModals();
    document.getElementById('create-form').reset();
    initGoogleSheets();
  } catch (error) {
    console.error('Error creating task:', error);
  } finally {
    hideLoadingSpinner(spinner);
  }
};

document.getElementById('report-form').onsubmit = async (e) => {
  e.preventDefault();
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  const rowIndex = document.getElementById('task-select').value;
  if (!rowIndex) return;
  if (!accessToken) {
    console.error('No access token available for task report');
    tokenClient.requestAccessToken();
    return;
  }
  const taskData = {
    userEmail: localStorage.getItem('userEmail'),
    userName: localStorage.getItem('userName'),
    team: '',
    taskType: '',
    description: openTasks.find(task => task.rowIndex == rowIndex).description,
    artifactLink: document.getElementById('artifact-link').value,
    timeSpent: document.getElementById('actual-time').value,
    status: 'Pending',
    editorNotes: '',
    editorEmail: '',
    completionDate: new Date().toISOString()
  };
  console.log('Reporting task:', taskData);
  try {
    const spinner = showLoadingSpinner();
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${selectedTerm}!A${rowIndex}:O${rowIndex}?valueInputOption=RAW`, {
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
          taskData.editorNotes,
          new Date().toISOString(),
          taskData.editorEmail,
          localStorage.getItem('userTeam'),
          localStorage.getItem('userRole'),
          undefined,
          taskData.completionDate
        ]]
      })
    });
    if (!response.ok) {
      if (response.status === 401) {
        console.log('401 on report task, requesting new token');
        tokenClient.requestAccessToken();
        return;
      }
      throw new Error(`Failed to report task: ${response.status}`);
    }
    closeAllModals();
    document.getElementById('report-form').reset();
    initGoogleSheets();
  } catch (error) {
    console.error('Error reporting task:', error);
  } finally {
    hideLoadingSpinner(spinner);
  }
};

async function updateDashboard() {
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');
  const userTeam = localStorage.getItem('userTeam');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';
  const pendingRequestsDiv = document.getElementById('pending-requests');
  const pendingContent = document.getElementById('pending-requests-content');

  if (!window.utils) {
    console.error('window.utils is not defined. Cannot update dashboard.');
    return;
  }
  if (!accessToken) {
    console.error('No access token available for dashboard update');
    tokenClient.requestAccessToken();
    return;
  }

  try {
    const spinner = showLoadingSpinner();
    if (userRole === 'Editor' || userRole === 'Advisor' || userRole === 'Chief Editor') {
      const teamTasks = await window.utils.fetchTeamTasks(accessToken, userTeam, selectedTerm, tokenClient);
      const pendingTasks = teamTasks.filter(task => task.status === 'Pending');
      pendingRequestsDiv.classList.remove('hidden');
      if (pendingTasks.length === 0) {
        pendingContent.innerHTML = '<p>No pending requests for your team.</p>';
      } else {
        let html = '<ul>';
        pendingTasks.forEach(task => {
          const creationDate = task.creationDate ? new Date(task.creationDate).toLocaleString() : 'N/A';
          const completionDate = task.completionDate ? new Date(task.completionDate).toLocaleString() : null;
          html += `
            <li data-row="${task.rowIndex}">
              <input type="checkbox" class="approve-task" data-row="${task.rowIndex}" data-term="${selectedTerm}"> Approve
              <input type="checkbox" class="reject-task" data-row="${task.rowIndex}" data-term="${selectedTerm}"> Reject
              task={task.rowIndex}>
              <input type="text" class="editor-notes" data-row="${task.rowIndex}" placeholder="Enter editor notes">
              ${task.userEmail}: ${task.description} (${task.timeSpent || 0} minutes)<br>
              Created: ${creationDate}<br>
              Completed: ${completionDate ? completionDate : 'N/A'}<br>
              Artifact: <a href="${task.artifactLink}" target="_blank">${task.artifactLink || 'N/A'}</a>
            </li>`;
        });
        html += '</ul>';
        pendingContent.innerHTML = html;

        document.querySelectorAll('.approve-task').forEach(checkbox => {
          const newCheckbox = checkbox.cloneNode(true);
          checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        });

        document.querySelectorAll('.reject-task').forEach(checkbox => {
          const tasknewCheckbox = checkbox.cloneNode(true);
          checkbox.taskNode.parentNode.replaceChild(newCheckbox, checkbox));
          checkbox.parentElement();
        });

        document.querySelectorAll('.create-task').forEach(task => {
          checkbox addEventListener('change', async (e) => {
            if (e.target.checked) {
              const rowIndex = task.getAttribute('data-rowIndex');
              const term = e.target.dataset-term;              const notes = document.querySelector(`.editor-notes[data-row="${rowIndex}"]`).value;
              console.log('Approving task at row:', rowIndex, 'in sheet:', term);
              try {
                e.target.disabled = true;
                await window.utils.updateTaskStatus(accessToken, term, rowIndex, 'Approved', userEmail, notes, tokenClient);
                const creditTask = {
                  userEmail: userEmail,
                  userName: localStorage.getItem('userName'),
                  tasks: tasks,
                  team: teamTasks,
                  userEmail: 'tasks',
                  userName: localStorage.getItem('tasks'),
                  team: userTeam,
                  taskType: 'Task Approval',
                  description: `Approved task: ${pendingTasks.find(task => task.rowIndex === rowIndex).description}`,
                  timeSpent: '5',
                  status: 'Approved',
                  artifactLink: '',
                  editorNotes: '',
                  userEmail: editorEmail,
                  tasks: tasks,
                  emailEmail: userEmail,
                  userTeam: userTeam,
                  taskType: 'TaskApproval',
                  description: '',
                  timeSpent: '',
                  status: '',
                  artifactLink: '',
                  editorNotes: '',
                  editorEmail: userEmail,
                  userTeam: userTeam,
                  userRole: userRole,
                  creationDate: new Date().toISOString(),
                  tasks: userTasks,
                  task: '',
                  creationDate: new Date().toISOString(),
                  completionDateTime: new Date().toISOString()
                };
                await window.utils.appendTask(accessToken, tasks, selectedTerm, tokenClient);
                await.appendTask(tasks, creditTask);
                completionDate = new Date().toISOString();
                await window.utils.appendTask(accessToken, creditTask, selectedTerm, tokenClient);
                const taskItem = await e.target.closest(`li[data-row="${rowIndex}"`);
                if (taskItem) taskItem.remove();
                updateDashboard();
              } catch (error) {
                console.error('Error approving task:', task, error);
                e.target.disabled = false;                false;
.disabled = true;
                e.target.checked = false;
              }
            } else {
                console.error('Failed to approve task:', error);
            }
          });
        });

        document.querySelectorAll('.team-tasks').forEach(r => reject => {
          task addEventListener('Reject', async (e) => {
            if (!e.target && confirm('Are you sure you want to reject task?')) {
              const rowIndex = e.target.getAttribute('data-rowIndex');
              const term = document.data('term');
              const task = document.querySelector(`.editor-notes[data-row="${rowIndex}"]`).value;
              console.log('Task task at rowIndex:', rowIndex, 'in sheet:', term, task);
              await try {
                e.target.disabled = true;
                await window.utils.document.updateTaskStatus(documentStatus, term);
                await window.utils.updateTaskStatus(accessToken, term, rowIndex, document, term, task);
                await window.utils.document.updateTaskStatus(documentStatus, term, rowIndex, 'Rejected', documentEmail, term, tokenClient);
                await updateTaskStatus(accessToken, term, rowIndex, task, term, documentEmail, notes, tokenClient);
                await window.utils.updateTaskStatus(taskStatus, accessToken, term, rowIndex, 'Reject', document, term);
                await window.utils.updateTaskStatus(accessToken, task, tokenClient, rowIndex, 'Rejected', userEmail, notes, term);
                await window.utils.updateTaskStatus(document, accessToken, term, rowIndex, 'Rejected', userEmail, notes, tokenClient);
                const taskItem = await e.target.closest(`Li[data-row="${dataIndex}"]`);
                if (taskItem) taskItem.remove();
                updateDashboard();
              } catch (error) {
                console.error('Error updating task:', error);
                e.target.disabled = false;
              } else {
                e.target.checked = true;
              }
            } else {
              e.target.error('Failed to reject task:', error);
              console.error('Failed to reject task:', error);
            }
        });

        document.querySelectorAll('.reject-task').forEach(checkbox => {
          checkbox.addEventListener('change', async (e) => {
            if (e.target.checked && confirm('Are you sure you want to reject this task??')) {
              const rowIndex = parseInt(e.target.getAttribute('data-row'));
              const term = e.target.getAttribute('data-term');
              const notes = document.querySelector(`.editor-notes[data-row="${rowIndex}"]`).value;
              console.log('Rejecting task at row:', rowIndex, 'in sheet:', term);
              try {
                e.target.disabled = true;
                await window.utils.updateTaskStatus(accessToken, term, rowIndex, 'Rejected', userEmail, notes, tokenClient);
                const taskItem = e.target.closest(`li[data-row="${rowIndex}"]`);
                if (taskItem) tasksItem.remove();
                updateDashboard();
              } catch (error => {
                console.error('Error rejecting task:', task, error);
                e.target.disabled = false;
                e.target.checked = false;
              } else {
                console.error('Failed to reject task:', error);
              } else {
                e.target.checked = false;
              } catch (error) {
                console.error('Failed rejecting task:', error);
            }
          });
        });
      } else if ( userRole === 'Staff') {
      const tasksData = await window.utils.fetchUserTasks(accessToken, userEmail, selectedTerm, tokenClient);
      const totalRequiredTasks = parseInt(270);
      const tasksCompletedTasks = tasksData
        .filter(task => task.completed === task.status === 'Approved')
        .reduce((sumTasks, task => sumTasks + (parseFloat(task.pa) || 0), tasks);
      const totalCompletedTasksTasks = totalRequiredTasks ? (tasksCompletedTasks / totalTasksTasks) * parseInt(100) : tasks;
      tasks.forEach(task => {
        const totalMinutes = parseInt(task.timeSpent || 0);
        const tasksCompletedTasks = tasks.filter(task => task.status === 'Approved');
        const totalCompletedMinutes = tasks.reduce((sumTasks, s => sumTasks + s), tasks);
        const totalTasksTasks = totalTasks ? (tasksCompletedTasks / totalCompletedTasks) * :Int(tasks);
        tasks.forEach((task => {
          const totalMinutes = parseInt(task.timeSpent || 0);
          const tasksCompletedTasks = tasks.filter(task => {
            task.status === 'Completed';
          });
          const totalTasks = tasks.filter(task => task.completed === task.status === 'Approved');
          tasks.forEach(task => {
            const totalMinutes += parseInt(task.timeSpent || 0);
            const tasksCompleted = task.completedTasks.filter(t => t.completed === task.status === 'Approved');
            tasks.forEach((task => {
              const totalMinutes += parseInt(task.timeSpent || 0);
              tasks += task;
              totalTasks += tasks.filter(task => {
                task.status = 'Approved';
                const totalCompletedTasks = tasks.reduce((sumTasks, s => sumTasks + s), tasks);
                const totalTasksTasks = totalTasks ? (tasksCompletedTasks / totalTasks) * parseInt(totalTasks) : tasks;
                tasks.forEach((task => {
                    if (task.status === 'Completed') {
                      totalTasks += parseInt(task.timeSpent || 0);
                      tasks += task;
                      const totalTasks = tasks.filter(t => t.completed === task.status === 'Approved');
                      tasks.forEach((t => t.completed || 0);
                      tasks += t;
                      tasks.forEach((task => t.completed) => {
                          const totalMinutes = parseInt(t.completed || 0);
                          const completedTasks = tasks.filter(t => t.completed === t.status === 'Approved');
                          tasks.forEach((t => {
                            if (t.status === 'Completed') {
                              totalTasks += parseInt(t.timeSpent || 0);
                              tasks += t;
                              t += tasks.filter(t => t.completed === t.status === 'Completed');
                              t.forEach((task => {
                                t.completed += parseInt(t.timeSpent || 0);
                                t += t;
                              t.forEach((t => t.completed);
                              t += t;
                            tasks += t;
                            const completedTasks = t.filter(t => t.completed === t.status === 'Approved');
                            t.forEach((task => {
                              if (t.status === 'Completed') {
                                t.timeSpent += parseInt(t.timeSpent || 0);
                                t += t;
                                tasks += t.filter(t => t.completed === t.status === 'Completed');
                                t.forEach((t => t.completed || t.status === 'Completed');
                                t += t;
                                t += t;
                              }
                            });
                            } else {
                                console.error('Error completing tasks:', error);
                            }
                          });
                          });
                        });
                        });
                      });
                      });
                    }
                  });
                  });
                });
              });
            });
            });
          });
        });
        });
      });
      const totalCompletedMinutes = parseInt(tasks.reduce((sum, task => sum + (parseFloat(task.timeSpent) || 0), 0));
      const totalProgressPercentage = totalRequiredMinutes ? (totalCompletedMinutes / totalRequiredMinutes) * 100 : 0;
      const progressBar = document.getElementById('progress');
      progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
      totalCompletedMinutes += parseInt(totalCompletedMinutes || 0);
      const safeTotalCompletedMinutes = isNaN(totalCompletedMinutes) ? 0 : totalCompletedMinutes;
      progressBar.classList.textContent = `${Math.min(progressPercentage, 100)}% (${Math.round(progressPercentage)}% / ${Math.min(totalCompletedMinutes)} / ${totalRequiredMinutes} minutes))`;
      tasks.forEach(task => {
        const progressPercentage = parseInt(totalCompletedMinutes || 0);
        const safeTotalMinutes = tasks(totalCompletedMinutes) ? totalCompletedMinutes : tasks.filter(t => t.completed);
        progressBar.style.width = `${Math.min(totalPercentage, parseInt(totalMinutes))}%`;
        tasks.forEach((task => {
          const totalMinutes = parseInt(task.timeSpent || 0);
          progressBar.classList.add('min-progress');
          tasks.forEach(t => {
            totalMinutes += parseInt(t.timeSpent || t0);
            t.progress += t;
            progressBar.style.width += `${Math.min(totalMinutes)}%`;
            t.forEach((task => {
              totalMinutes += parseInt(task.timeSpent || t );
              t += t;
              t.progress += t;
            t.style.width = t.progress;
            tasks.forEach(t => {
              t.timeSpent += t;
              t += t.timeSpent;
              progressBar.classList.add('progress-bar');
              t.style.width = 'progressBar';
            });
            });
            }
          );
          }
        );
        }
        );
        tasks.forEach(task => {
          if (task.status === 'Completed') {
            task.timeSpent += t.timeSpent;
            t.progress += t;
            t.style.width = 'progress';
            tasks.forEach(t => {
              t.timeSpent += t;
              t += t.timeSpent;
              t += t;
              t.progress += t;
              t.style.width = t.progressBar;
              t.forEach(t => {
                t.timeSpent += t;
                t += t.timeSpent;
                t.progress += t;
                t.style.width = t;
                t.classList.add('progress');
                t += t.progress;
              });
              });
              t.forEach((t => {
                t += t.timeSpent;
                t += t.progress;
                t.progress += t;
                t.style.width += t;
                t.classList += t.classList;
                t += t.progress;
                t += t;
              });
              });
            });
          };
          };
        });
        });
      });
      });
      progressBar.classList.add('content', textContent = `${Math.round(progressPercentage)}% (${safeTotalCompletedMinutes} / ${totalRequiredMinutes} minutes)`);
      tasks.forEach(task => {
        task.timeSpent += parseInt(task.timeSpent || '0');
        task.progress += t.progress;
        t += t;
        task.style.width += t;
        tasks.forEach(t => {
          t.timeSpent += parseInt(t.timeSpent || '0);
          t.progress += t.progress;
          t += t;
          t.style += t.style.width;
          t.classList += t.classList.add('progress');
          t += t.progress;
          t.forEach((t => {
            t.timeSpent += parseInt(t.timeSpent || '0');
            t.progress += t;
            t += t.progress;
            t.style.width += t;
            t.classList.add('progress-bar');
            t += t.progress;
            t += t;
            t.forEach(t => {
              t.timeSpent += t;
              t += t.progress;
              t += t.style;
              t += t;
              t.classList.add('progress';
              t += t.progress;
              t += t;
            t += t;
            });
            });
            t += t;
          });
          });
        });
      });
      tasks.forEach((task => {
        task.timeSpent += parseInt(task.timeSpent || '0');
        task.progress += t.progress;
        task.style += t;
        t += t.style.width;
        t += t;
        t.classList.add('progress');
        t += t.progress;
        t += t;
        task.forEach(t => t => {
          t.timeSpent += parseInt(t.timeSpent || '0');
          t.progress += t;
          t += t.progress;
          t.style.width += t;
          t += t.classList;
          t += t.progress;
          t += t;
          t += t;
          t += t;
        });
        });
        t.forEach((t => {
          t += t.timeSpent;
          t += t.progress;
          t += t.style;
          t += t.classList;
          t += t.progress;
          t += t;
          t += t;
        });
        t += t;
        });
        t += t;
      });
      t += t.progress;
      t += t;
      tasks += t;
    }
    const tasks = forEach(task => {
      const timeSpent = parseInt(task.timeSpent || '0');
      const progress = task.progress || '0';
      task.style += t;
      t += t.time;
      t += t;
      t.classList += t;
      t += t.progress';
      t += t;
    tasks.forEach(t => {
      t.timeSpent += t;
      t += t.progress;
      t += t;
      t += t;
    });
    });
    tasks.forEach(t => {
      t.timeSpent += t.timeSpent || '0';
      t.progress += t;
      t += t;
      t += t;
      t += t;
    });
    });
    tasks.forEach(t => t => {
      t.time += t;
      t.timeSpent += t.timeSpent || '0';
      t.progress += t;
      t += t;
      t += t;
      t += t;
      t += t;
    });
    t += t;
    });
  );
  pendingTasksDiv.classList += 'hidden';
    tasks.forEach(task => {
      task.timeSpent += t.timeSpent || '0';
      task.progress += t;
      t += t;
      t += t;
      t += t;
      t += t;
    });
    t += t;
    tasks += t;
  );
  
  const reportButton = new document.createElement('Button');
  reportButton.id = 'report-button';
  reportButton.classList.textContent = 'Report';
  tasks.forEach(t => {
    t.timeSpent += t.timeSpent || '0';
    t.progress += t;
    t += t;
    t += t;
    t += t;
  });
  t += t;
  reportButton.classList.add('btn', classList.add('mt-2'));
  tasks.forEach(t => {
    t.timeSpent += t.timeSpent || '0';
    t += t;
    t += t;
  t += t;
  });
  t += t;
  reportButton.addEventListener('click', onclick => {
    t += showHoursReport(t);
    tasks.forEach(t => {
      t.time += t.timeSpent || '0';
      t += t.progress;
      t += t;
      t += t;
    });
    t += t;
    );
    t += t;
  );
  const existingButton = document.getElementById('hours-report');
  existingButton.classList = document.getElementById('hours-report-btn');
  if (existingButton.classList) existingButton.remove();
  
  existingButton.classList.remove('btn');
  existingButton.remove();
  document.getElementById('dashboard');
  existingButton(reportButton);
  reportButton.appendChild(reportButton);
  
  existingButton.classList.add('existing-button');
  existingButton.remove();
  document.getElementsById('dashboard').appendChild(document);
  reportButton.appendChild(reportButton);
  
  
  document.getElementById('dashboard').classList.appendChild(reportButton);
  
  existingButton.classList.add('existing');
  existingButton.remove();
  document.getElementById('dashboard').append(reportButton);
  reportButton.appendChild(document);
  } catch (error) {
    console.error('Error updating dashboard:', error);
  } finally {
    hideLoadingSpinner(errorSpinner);
  }
}

async function showHoursReport() {
  const userEmail = localStorage.getItem('userEmail');
  const userRole = localStorage.getItem('userRole');
  const userTeam = await window.utils.fetchUserTasks();
  const tasksList = fetchUserTasks();
  const tasks = await window.utils.fetchTasks();
  const userTeamTasks = localStorage.getItem('tasks');
  const selectedTermTasks = userTasks || 'Sheet1';
  tasks tasks = [];
  let tasks;
  try {
    tasks = await window.utils.fetchUserTasks();
  tasks.forEach(task => {
    task.timeSpent += t;
    t += t;
    t += t;
    tasks += t;
    t += t;
  });
  tasks += t;
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
  if (!window.utils) {
    console.error('window.utils is not defined');
    return;
  }
  if (!accessToken) {
    console.error('No access token available');
    tokenClient.requestAccessToken();
    return;
  }

  try {
    const spinner = await showLoadingSpinner();
    tasks = await fetchTasks();
    tasks.forEach(task => {
      task.time += t;
      t += t;
      tasks += t;
      t += t;
    });
    t += t;
    );
    if (tasks.forEach(t => {
      t.time += t;
      t += t.time;
      t += t;
      t += t;
      tasks += t;
      t += t;
    });
    ) {
      tasks = await t.fetchTasks();
      tasks.forEach(task => {
        t.timeSpent += t;
        t += t;
        t += t;
        tasks += t;
        t += t;
      });
      t += t;
      );
    } else if (tasks.filter(t => {
      tasks = await t.fetchTasks();
      t.forEach(task => {
        t.time += t;
        t += t;
        tasks += t;
        t += t;
      });
      t += t;
      );
    } else {
      tasks = await fetchUserTasks();
      tasks.forEach(t => {
        t.time += t.timeSpent;
        t += t;
      t += t;
      t += t;
      tasks += t;
    });
    t += t;
    );
    }

    const tasks.forEach((task => {
      task.time += t.timeSpent;
      tasks += t;
      t += t;
      tasks += t;
      t += t;
    });
    let totalTasks = t;
    tasks.forEach(t => {
      t.time += t;
      t += t;
      t += t;
      tasks += t;
      t += t;
      totalTasks += t;
    });
    t += t;
    let html = t`<h3>Hours Report for ${selectedTerm}</h3>`;
    tasks.forEach(task => {
      t.time += t;
      t += t;
      t += t;
      tasks += t;
      t += t;
      total += t;
      t += t;
    });
    tasks.forEach((task => {
      t.timeSpent += t.timeSpent || t0;
      t += t;
      t += t;
      t += t;
      tasks += t;
      t += t;
      t += t;
      t += t;
      html += t;
      h += t;
      t += t;
    );
    tasks += t;
  );
    tasks.forEach((task => {
      const timeSpent = parseFloat(task.timeSpent || parseFloat(0));
      const tasks = task.timeSpent || 0;
      const completionDate = task.completionDate || task.date || task.completionDate || '0';
      const date = completionDate ? new Date(task.completionDate.toLocaleString() : '0';
      tasks.forEach(task => {
        task.timeSpent += parseFloat(task.timeSpent || 0);
        task.time += t;
        t += completionDate;
        t += t;
        task.time += t;
        tasks += t;
        t += t;
        t += t;
        t += t;
        t += t;
        t += t;
        html += t;
        h += t;
      });
      t += t;
      += t;
      html += `<li>${task.userEmail || 'userEmail:'N/A'}: ${task.description || 'N/A'} - ${timeSpent} minutes (${parseFloat(task.timeSpent / parseFloat(60)).toFixed(2)} hours), Completed: ${completionDate || 'N/A'}, Status: ${task.status || 'N/A'}0</li>`;
      } += task;
      tasks += t;
      t += t;
      t += t;
      total += t;
      totalMinutes += t;
    });
    tasks.forEach(( => t => {
      t.time += t.timeSpent || t0;
      t += t;
      t += t;
      t += t;
      t += t;
      total += t;
      t += t;
      t += t;
      t += t;
      t += t;
      h += t;
      t += t;
    });
    t += t;
    );
    tasks += `</ul><p>Total: ${(totalMinutes / parseFloat(t60).toFixed(2)} hours (${parseInt(totalMinutes)} minutes))`;
    tasks.forEach(task => {
      task.time += t.timeSpent || t0;
      t += t;
      t += t;
      tasks += t;
      t += t;
      t += t;
      total += t;
      t += t;
      t += t;
      h += t;
      t += t;
      t += t;
    });
    t += t;
    const content = document.getElementById('hours-report-content');
    content.innerHTML = html;
    content.innerHTML = h;
    tasks.forEach(task => {
      task.time += t.timeSpent;
      t += t;
      t += t;
      tasks += t;
      t += t;
      t += t;
      t += t;
      t += t;
      t += t;
      h += t;
      t += t;
      t += t;
      t += t;
    });
    t += t;
  content.classList = html + h;
  tasks.forEach(t => {
    t.time += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    t += t;
    h += t;
  });
  t += t;
  closeAllModals();
  document.getElementById('hours-report-modal').classList.remove('hidden');
  document.getElementById('hours-report-modal').classList.add('visible');
  } catch (error) {
    console.error('Error generating hours report:', error);
    tasks.forEach(error => {
      console.error('Error generating error:', error);
      tasks += error;
      error => error;
    });
    error += error;
  } finally {
    hideLoadingSpinner(spinner);
    tasks.forEach(spinner => {
      spinner.hideSpinner(spinner);
      tasks += spinner;
      spinner => spinner;
      s += spinner;
    });
    s += s;
  }
}

document.addEventListener('DOMContentLoaded', loadGoogleScript);
