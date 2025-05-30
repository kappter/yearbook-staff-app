let openTasks = [];

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

function checkFirstLogin(tokenClient) {
  console.log('Checking first login');
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
    console.log('User logged in, showing task buttons');
    const taskButtons = document.getElementById('task-buttons');
    taskButtons.classList.remove('hidden');
    taskButtons.classList.add('visible');
    const termSelector = document.getElementById('term-selector');
    termSelector.classList.remove('hidden');
    termSelector.classList.add('visible');
    initGoogleSheets(tokenClient);
    updateDashboard();
  }
}

let initializing = false;
function initGoogleSheets(tokenClient) {
  console.log('Initializing Google Sheets');
  if (!window.utils || initializing) return;
  initializing = true;
  if (!accessToken) {
    console.error('No access token available for initGoogleSheets');
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
    initializing = false;
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
    alert('Failed to initialize Google Sheets. Please try again.');
  }).finally(() => {
    hideLoadingSpinner(spinner);
    initializing = false;
  });
}

document.querySelectorAll('form').forEach(form => {
  form.onsubmit = async (event) => {
    event.preventDefault();
    const spinner = showLoadingSpinner();
    try {
      const formData = new FormData(form);
      console.log('Form submitted:', Object.fromEntries(formData));
      await initGoogleSheets(tokenClient);
      closeAllModals();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      hideLoadingSpinner(spinner);
    }
  };
});

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
        alert('Utility functions are not loaded. Please try again later.');
        return;
      }
      if (!accessToken) {
        console.error('No access token available for task append');
        localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
        tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      }
      let spinner;
      try {
        spinner = showLoadingSpinner();
        const response = await window.utils.appendTask(accessToken, taskData, 'Sheet1', tokenClient);
        console.log('First login task appended successfully:', response);
        closeAllModals();
        const taskButtons = document.getElementById('task-buttons');
        taskButtons.classList.remove('hidden');
        taskButtons.classList.add('visible');
        const termSelector = document.getElementById('term-selector');
        termSelector.classList.remove('hidden');
        termSelector.classList.add('visible');
        initGoogleSheets(tokenClient);
      } catch (error) {
        console.error('Error appending task:', error.message, error.stack);
        alert('Failed to complete first login setup: ' + error.message);
      } finally {
        hideLoadingSpinner(spinner);
      }
    };
  } else {
    console.error('Form with ID "first-login-form" not found.');
  }

  const weeklyReportClose = document.getElementById('weekly-report-close');
  if (weeklyReportClose) {
    weeklyReportClose.onclick = () => {
      closeAllModals();
      console.log('Weekly report modal closed');
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

// Rest of script.js remains unchanged (omitted for brevity)

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
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
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
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
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
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
    return;
  }
  try {
    const spinner = showLoadingSpinner();
    await window.utils.appendTask(accessToken, taskData, selectedTerm, tokenClient);
    closeAllModals();
    document.getElementById('create-form').reset();
    initGoogleSheets(tokenClient); // Pass tokenClient
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
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
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
        localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
        tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      }
      throw new Error(`Failed to report task: ${response.status}`);
    }
    closeAllModals();
    document.getElementById('report-form').reset();
    initGoogleSheets(tokenClient); // Pass tokenClient
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
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
    return;
  }
  let spinner;
  try {
    spinner = showLoadingSpinner();
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
          const completionDate = task.completionDate ? new Date(task.completionDate).toLocaleString() : 'N/A';
          html += `
            <li data-row="${task.rowIndex}">
              <input type="checkbox" class="approve-task" data-row="${task.rowIndex}" data-term="${selectedTerm}"> Approve
              <input type="checkbox" class="reject-task" data-row="${task.rowIndex}" data-term="${selectedTerm}"> Reject
              <input type="text" class="editor-notes" data-row="${task.rowIndex}" placeholder="Enter editor notes">
              ${task.userEmail}: ${task.description} (${task.timeSpent || 0} minutes)<br>
              Created: ${creationDate}<br>
              Completed: ${completionDate}<br>
              Artifact: <a href="${task.artifactLink}" target="_blank">${task.artifactLink || 'N/A'}</a>
            </li>`;
        });
        html += '</ul>';
        pendingContent.innerHTML = html;

        document.querySelectorAll('.approve-task').forEach(checkbox => {
          checkbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
              const rowIndex = parseInt(e.target.getAttribute('data-row'));
              const term = e.target.getAttribute('data-term');
              const notes = document.querySelector(`.editor-notes[data-row="${rowIndex}"]`).value;
              console.log('Approving task at row:', rowIndex, 'in sheet:', term);
              try {
                e.target.disabled = true;
                await window.utils.updateTaskStatus(accessToken, term, rowIndex, 'Approved', userEmail, notes, tokenClient);
                const creditTask = {
                  userEmail: userEmail,
                  userName: localStorage.getItem('userName'),
                  team: userTeam,
                  taskType: 'Task Approval',
                  description: `Approved task: ${pendingTasks.find(task => task.rowIndex === rowIndex).description}`,
                  timeSpent: '5',
                  status: 'Approved',
                  artifactLink: '',
                  editorNotes: '',
                  editorEmail: userEmail,
                  userTeam: userTeam,
                  userRole: userRole,
                  creationDate: new Date().toISOString(),
                  completionDate: new Date().toISOString()
                };
                await window.utils.appendTask(accessToken, creditTask, selectedTerm, tokenClient);
                const taskItem = e.target.closest(`li[data-row="${rowIndex}"]`);
                if (taskItem) taskItem.remove();
                updateDashboard();
              } catch (error) {
                console.error('Error approving task:', error);
                e.target.disabled = false;
                e.target.checked = false;
              }
            }
          });
        });

        document.querySelectorAll('.reject-task').forEach(checkbox => {
          checkbox.addEventListener('change', async (e) => {
            if (e.target.checked && confirm('Are you sure you want to reject this task?')) {
              const rowIndex = parseInt(e.target.getAttribute('data-row'));
              const term = e.target.getAttribute('data-term');
              const notes = document.querySelector(`.editor-notes[data-row="${rowIndex}"]`).value;
              console.log('Rejecting task at row:', rowIndex, 'in sheet:', term);
              try {
                e.target.disabled = true;
                await window.utils.updateTaskStatus(accessToken, term, rowIndex, 'Rejected', userEmail, notes, tokenClient);
                const taskItem = e.target.closest(`li[data-row="${rowIndex}"]`);
                if (taskItem) taskItem.remove();
                updateDashboard();
              } catch (error) {
                console.error('Error rejecting task:', error);
                e.target.disabled = false;
                e.target.checked = false;
              }
            } else {
              e.target.checked = false;
            }
          });
        });
      }
    } else if (userRole === 'Staff') {
      const tasks = await window.utils.fetchUserTasks(accessToken, userEmail, selectedTerm, tokenClient);
      const totalRequiredMinutes = 270;
      const totalCompletedMinutes = tasks
        .filter(task => task.status === 'Approved')
        .reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);
      const progressPercentage = totalRequiredMinutes ? (totalCompletedMinutes / totalRequiredMinutes) * 100 : 0;
      const progressBar = document.getElementById('progress');
      progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
      const safeTotalMinutes = isNaN(totalCompletedMinutes) ? 0 : totalCompletedMinutes;
      progressBar.textContent = `${Math.round(progressPercentage)}% (${safeTotalMinutes} / ${totalRequiredMinutes} minutes)`;
      pendingRequestsDiv.classList.add('hidden');

      const reportButton = document.createElement('button');
      reportButton.id = 'report-button';
      reportButton.textContent = 'View Hours Report';
      reportButton.classList.add('btn', 'mt-2');
      reportButton.onclick = () => showHoursReport();
      const existingButton = document.getElementById('report-button');
      if (existingButton) existingButton.remove();
      document.getElementById('dashboard').appendChild(reportButton);
    }
  } catch (error) {
    console.error('Error updating dashboard:', error);
  } finally {
    hideLoadingSpinner(spinner);
  }
}

async function showHoursReport() {
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
    console.error('No access token available for hours report');
    localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
    tokenClient.requestAccessToken({ prompt: 'consent' });
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

    let totalMinutes = 0;
    let html = `<h3>Hours Report for ${selectedTerm}</h3><ul>`;
    tasks.forEach(task => {
      const timeSpent = parseFloat(task.timeSpent) || 0;
      const creationDate = task.creationDate ? new Date(task.creationDate).toLocaleString() : 'N/A';
      const completionDate = task.completionDate ? new Date(task.completionDate).toLocaleString() : 'N/A';
      html += `<li>${task.userEmail || 'N/A'}: ${task.description || 'N/A'} - ${timeSpent} minutes (${(timeSpent / 60).toFixed(2)} hours), Completed: ${completionDate}, Status: ${task.status || 'N/A'}</li>`;
      totalMinutes += timeSpent;
    });
    html += `</ul><p>Total: ${(totalMinutes / 60).toFixed(2)} hours (${totalMinutes} minutes)</p>`;
    const content = document.getElementById('hours-report-content');
    content.innerHTML = html;
    closeAllModals();
    document.getElementById('hours-report-modal').classList.remove('hidden');
    document.getElementById('hours-report-modal').classList.add('visible');
  } catch (error) {
    console.error('Error generating hours report:', error);
  } finally {
    hideLoadingSpinner(spinner);
  }
}
