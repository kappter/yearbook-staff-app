async function loadOpenTasks(accessToken, userEmail, userTeam, userRole, sheetName) {
  try {
    console.log('Access token for loadOpenTasks:', accessToken);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:M`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const rows = data.values || [];
    console.log(`Raw rows from ${sheetName}:`, rows);
    if (userRole === 'Advisor') {
      const advisorFiltered = rows.filter(row => row[7] === 'Open');
      console.log(`Advisor filtered rows from ${sheetName}:`, advisorFiltered);
      return advisorFiltered.map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
    }
    if (userRole === 'Editor') {
      const editorFiltered = rows.filter(row => (row[7] === 'Open' || row[7] === 'Pending') && row[2] === userTeam);
      console.log(`Editor filtered rows from ${sheetName}:`, editorFiltered);
      return editorFiltered.map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
    }
    const staffFiltered = rows.filter(row => row[7] === 'Open' && row[0] === userEmail && row[2] === userTeam);
    console.log(`Staff filtered rows from ${sheetName}:`, staffFiltered);
    return staffFiltered.map(row => ({ description: row[4], rowIndex: rows.indexOf(row) + 2 }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

async function fetchUserTasks(accessToken, userEmail, sheetName) {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:M`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log(`Fetched data from ${sheetName}:`, data);
    const rows = data.values || [];
    console.log(`Parsed rows from ${sheetName}:`, rows);
    let filteredTasks = rows;
    if (userEmail) {
      filteredTasks = rows.filter(row => row[0] === userEmail);
    }
    const mappedTasks = filteredTasks.map(row => ({
      description: row[4],
      timeSpent: parseInt(row[6]) || 0,
      status: row[7],
      submissionDate: row[9]
    }));
    console.log(`Mapped tasks from ${sheetName}:`, mappedTasks);
    return mappedTasks;
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return [];
  }
}

async function appendTask(accessToken, taskData, sheetName) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
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
        taskData.editorEmail || '',
        taskData.userTeam || '',
        taskData.userRole || ''
      ]]
    })
  });
  return response.json();
}

if (typeof module === 'undefined') {
  window.utils = { loadOpenTasks, fetchUserTasks, appendTask };
}