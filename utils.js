async function loadOpenTasks(accessToken, userEmail, userTeam, userRole) {
  try {
    console.log('Access token for loadOpenTasks:', accessToken);
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/Sheet1!A2:K', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const rows = data.values || [];
    if (userRole === 'Advisor') {
      // Advisors see all open tasks
      return rows
        .filter(row => row[7] === 'Open')
        .map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
    }
    // Staff and Editors see only their team's open tasks
    return rows
      .filter(row => row[7] === 'Open' && row[0] === userEmail && row[2] === userTeam)
      .map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

async function appendTask(accessToken, taskData) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/Sheet1!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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

if (typeof module === 'undefined') {
  window.utils = { loadOpenTasks, appendTask };
}