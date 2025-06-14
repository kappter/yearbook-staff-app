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
    console.log('Loaded tasks:', tasks.length);
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
    alert('Failed to load tasks from Google Sheets. Please check your network or try again later.');
  }).finally(() => {
    hideLoadingSpinner(spinner);
    initializing = false;
  });
}

function updateDashboard() {
  const userEmail = localStorage.getItem('userEmail');
  const userTeam = localStorage.getItem('userTeam');
  const userRole = localStorage.getItem('userRole');
  const selectedTerm = localStorage.getItem('selectedTerm') || 'Sheet1';

  // Update Progress Overview
  const progressOverview = document.getElementById('progress-overview');
  const progressSummary = document.getElementById('progress-summary');
  progressOverview.classList.remove('hidden');
  progressOverview.classList.add('visible');

  if (userRole === 'Chief Editor' || userRole === 'Advisor') {
    const teamTasks = openTasks.filter(task => task.userTeam === userTeam);
    const pendingTasks = teamTasks.filter(task => task.status === 'Pending').length;
    const approvedTasks = teamTasks.filter(task => task.status === 'Approved').length;
    progressSummary.innerText = `Team Tasks: ${teamTasks.length} | Pending: ${pendingTasks} | Approved: ${approvedTasks}`;
  } else {
    const userTasks = openTasks.filter(task => task.userEmail === userEmail);
    const pendingTasks = userTasks.filter(task => task.status === 'Pending').length;
    const approvedTasks = userTasks.filter(task => task.status === 'Approved').length;
    progressSummary.innerText = `Tasks Created: ${userTasks.length} | Pending: ${pendingTasks} | Approved: ${approvedTasks}`;
  }

  // Update Pending Requests (for Editors)
  if (userRole === 'Chief Editor' || userRole === 'Advisor') {
    const pendingRequests = document.getElementById('pending-requests');
    const pendingContent = document.getElementById('pending-requests-content');
    const pendingTasks = openTasks.filter(task => task.status === 'Pending' && task.userTeam === userTeam);
    pendingContent.innerHTML = '';
    pendingTasks.forEach(task => {
      const div = document.createElement('div');
      div.innerHTML = `
        <input type="checkbox" data-row="${task.rowIndex}" /> ${task.description} (Submitted by ${task.userEmail})
      `;
      pendingContent.appendChild(div);
    });
    pendingRequests.classList.remove('hidden');
    pendingRequests.classList.add('visible');

    pendingContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', async () => {
        const rowIndex = checkbox.getAttribute('data-row');
        const spinner = showLoadingSpinner();
        try {
          console.log('Approving task:', rowIndex);
          await window.utils.updateTaskStatus(accessToken, rowIndex, 'Approved', selectedTerm, tokenClient);
          initGoogleSheets(tokenClient);
        } catch (error) {
          console.error('Error approving task:', error);
          alert('Failed to approve task. Please try again.');
        } finally {
          hideLoadingSpinner(spinner);
        }
      });
    });
  }
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

  // Add event listeners for task buttons
  const createWorkBtn = document.getElementById('create-work-btn');
  if (createWorkBtn) {
    createWorkBtn.onclick = () => {
      console.log('Create Work button clicked');
      const createModal = document.getElementById('create-modal');
      closeAllModals();
      createModal.classList.remove('hidden');
      createModal.classList.add('visible');
    };
  }

  const reportWorkBtn = document.getElementById('report-work-btn');
  if (reportWorkBtn) {
    reportWorkBtn.onclick = () => {
      console.log('Report Work button clicked');
      const reportModal = document.getElementById('report-modal');
      closeAllModals();
      reportModal.classList.remove('hidden');
      reportModal.classList.add('visible');
    };
  }

  const weeklyReportBtn = document.getElementById('weekly-report-btn');
  if (weeklyReportBtn) {
    weeklyReportBtn.onclick = () => {
      console.log('Weekly Report button clicked');
      const weeklyReportModal = document.getElementById('weekly-report-modal');
      const weeklyReportContent = document.getElementById('weekly-report-content');
      const userEmail = localStorage.getItem('userEmail');
      const userTasks = openTasks.filter(task => task.userEmail === userEmail);
      const weeklyTasks = userTasks.filter(task => {
        const completionDate = new Date(task.completionDate);
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return completionDate >= weekStart && completionDate <= now;
      });
      weeklyReportContent.innerHTML = weeklyTasks.map(task => `<p>${task.description} (${task.timeSpent} min, ${task.status})</p>`).join('') || '<p>No tasks this week.</p>';
      closeAllModals();
      weeklyReportModal.classList.remove('hidden');
      weeklyReportModal.classList.add('visible');
    };
  }

  const overallReportBtn = document.getElementById('overall-report-btn');
  if (overallReportBtn) {
    overallReportBtn.onclick = () => {
      console.log('Overall Report button clicked');
      const overallReportModal = document.getElementById('overall-report-modal');
      const overallReportContent = document.getElementById('overall-report-content');
      const userEmail = localStorage.getItem('userEmail');
      const userTasks = openTasks.filter(task => task.userEmail === userEmail);
      overallReportContent.innerHTML = userTasks.map(task => `<p>${task.description} (${task.timeSpent} min, ${task.status})</p>`).join('') || '<p>No tasks recorded.</p>';
      closeAllModals();
      overallReportModal.classList.remove('hidden');
      overallReportModal.classList.add('visible');
    };
  }

  const hoursReportBtn = document.getElementById('hours-report-btn');
  if (hoursReportBtn) {
    hoursReportBtn.onclick = () => {
      console.log('Hours Report button clicked');
      const userRole = localStorage.getItem('userRole');
      const userTeam = localStorage.getItem('userTeam');
      const userEmail = localStorage.getItem('userEmail');
      const hoursReportModal = document.getElementById('hours-report-modal');
      const hoursReportContent = document.getElementById('hours-report-content');
      
      let tasksToShow = [];
      if (userRole === 'Chief Editor' || userRole === 'Advisor') {
        tasksToShow = openTasks.filter(task => task.userTeam === userTeam);
      } else {
        tasksToShow = openTasks.filter(task => task.userEmail === userEmail);
      }

      let totalHours = 0;
      let html = '<table><tr><th>Task Description</th><th>Time Spent (min)</th><th>Status</th><th>Date Completed</th>';
      if (userRole === 'Chief Editor' || userRole === 'Advisor') {
        html += '<th>Staff Name</th>';
      }
      html += '</tr>';
      tasksToShow.forEach(task => {
        const timeSpent = parseInt(task.timeSpent) || 0;
        totalHours += timeSpent / 60;
        html += `<tr>
          <td>${task.description}</td>
          <td>${timeSpent}</td>
          <td>${task.status}</td>
          <td>${task.completionDate || 'N/A'}</td>`;
        if (userRole === 'Chief Editor' || userRole === 'Advisor') {
          html += `<td>${task.userName}</td>`;
        }
        html += '</tr>';
      });
      html += '</table>';
      html += `<p>Total Hours: ${totalHours.toFixed(2)}</p>`;
      hoursReportContent.innerHTML = html;

      closeAllModals();
      hoursReportModal.classList.remove('hidden');
      hoursReportModal.classList.add('visible');
    };
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('Logout button clicked');
      logout();
    };
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

  const createCancel = document.getElementById('create-cancel');
  if (createCancel) {
    createCancel.onclick = () => {
      closeAllModals();
    };
  }

  const reportCancel = document.getElementById('report-cancel');
  if (reportCancel) {
    reportCancel.onclick = () => {
      closeAllModals();
    };
  }

  const createForm = document.getElementById('create-form');
  if (createForm) {
    createForm.onsubmit = async (e) => {
      e.preventDefault();
      const taskType = document.getElementById('task-type').value;
      const team = document.getElementById('team').value;
      const description = document.getElementById('description').value;
      const estimatedTime = document.getElementById('estimated-time').value;
      if (!taskType || !team || !description || !estimatedTime) {
        alert('Please fill out all fields.');
        return;
      }
      const taskData = {
        userEmail: localStorage.getItem('userEmail'),
        userName: localStorage.getItem('userName'),
        team: team,
        taskType: taskType,
        description: description,
        timeSpent: estimatedTime,
        status: 'Pending',
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
        const response = await window.utils.appendTask(accessToken, taskData, localStorage.getItem('selectedTerm') || 'Sheet1', tokenClient);
        console.log('Task appended successfully:', response);
        closeAllModals();
        initGoogleSheets(tokenClient);
      } catch (error) {
        console.error('Error appending task:', error.message, error.stack);
        alert('Failed to create task: ' + error.message);
      } finally {
        hideLoadingSpinner(spinner);
      }
    };
  }

  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.onsubmit = async (e) => {
      e.preventDefault();
      const rowIndex = document.getElementById('task-select').value;
      const artifactLink = document.getElementById('artifact-link').value;
      const actualTime = document.getElementById('actual-time').value;
      if (!rowIndex || !actualTime) {
        alert('Please select a task and enter actual time.');
        return;
      }
      const task = openTasks.find(t => t.rowIndex === rowIndex);
      if (!task) {
        alert('Selected task not found.');
        return;
      }
      const updatedTask = {
        ...task,
        timeSpent: actualTime,
        artifactLink: artifactLink,
        status: 'Submitted',
        completionDate: new Date().toISOString()
      };
      console.log('Reporting task:', updatedTask);
      if (!window.utils) {
        console.error('window.utils is not defined. Cannot update task.');
        alert('Utility functions are not loaded. Please try again later.');
        return;
      }
      if (!accessToken) {
        console.error('No access token available for task update');
        localStorage.setItem('authRedirectState', JSON.stringify({ wasLoggingIn: true }));
        tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      }
      let spinner;
      try {
        spinner = showLoadingSpinner();
        await window.utils.updateTask(accessToken, rowIndex, updatedTask, localStorage.getItem('selectedTerm') || 'Sheet1', tokenClient);
        console.log('Task reported successfully');
        closeAllModals();
        initGoogleSheets(tokenClient);
      } catch (error) {
        console.error('Error reporting task:', error.message, error.stack);
        alert('Failed to report task: ' + error.message);
      } finally {
        hideLoadingSpinner(spinner);
      }
    };
  }
});
