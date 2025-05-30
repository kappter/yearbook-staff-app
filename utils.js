async function loadOpenTasks(accessToken, userEmail, userTeam, userRole, sheetName, tokenClient) {
  let cache;
  try {
    cache = JSON.parse(localStorage.getItem(`tasks_${sheetName}`));
  } catch (e) {
    console.warn('Invalid cache, fetching fresh data:', e);
  }
  if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000) {
    const rows = cache.rows;
    if (userRole === 'Advisor' || userRole === 'Chief Editor') {
      return rows.filter(row => row[7] === 'Open').map(row => ({
        description: row[4],
        rowIndex: rows.indexOf(row) + 2
      }));
    }
    if (userRole === 'Editor') {
      return rows.filter(row => (row[7] === 'Open' || row[7] === 'Pending') && row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
        description: row[4],
        rowIndex: rows.indexOf(row) + 2,
        userEmail: row[0],
        artifactLink: row[5] || '',
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        creationDate: row[13] || '',
        completionDate: row[14] || ''
      }));
    }
    return rows.filter(row => row[7] === 'Open' && row[0] === userEmail && row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
      description: row[4],
      rowIndex: rows.indexOf(row) + 2,
      creationDate: row[13] || ''
    }));
  }
  const { openTasks } = await batchFetchTasks(accessToken, userEmail, userTeam, userRole, sheetName, tokenClient);
  return openTasks;
}

async function fetchUserTasks(accessToken, userEmail, sheetName, tokenClient) {
  let cache;
  try {
    cache = JSON.parse(localStorage.getItem(`tasks_${sheetName}`));
  } catch (e) {
    console.warn('Invalid cache, fetching fresh data:', e);
  }
  if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000) {
    return cache.rows.filter(row => row[0] === userEmail).map(row => ({
      description: row[4],
      timeSpent: parseFloat(row[6]) || 0,
      status: row[7],
      submissionDate: row[9],
      creationDate: row[13] || '',
      completionDate: row[14] || ''
    }));
  }
  const { userTasks } = await batchFetchTasks(accessToken, userEmail, '', 'Staff', sheetName, tokenClient);
  return userTasks;
}

async function fetchTeamTasks(accessToken, userTeam, sheetName, tokenClient) {
  let cache;
  try {
    cache = JSON.parse(localStorage.getItem(`tasks_${sheetName}`));
  } catch (e) {
    console.warn('Invalid cache, fetching fresh data:', e);
  }
  if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000) {
    return cache.rows.filter(row => row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
      userEmail: row[0],
      description: row[4],
      artifactLink: row[5] || '',
      timeSpent: parseFloat(row[6]) || 0,
      status: row[7],
      submissionDate: row[9],
      creationDate: row[13] || '',
      completionDate: row[14] || '',
      rowIndex: cache.rows.indexOf(row) + 2
    }));
  }
  const { teamTasks } = await batchFetchTasks(accessToken, '', userTeam, 'Editor', sheetName, tokenClient);
  return teamTasks;
}

async function fetchAllTasks(accessToken, sheetName, tokenClient) {
  let cache;
  try {
    cache = JSON.parse(localStorage.getItem(`tasks_${sheetName}`));
  } catch (e) {
    console.warn('Invalid cache, fetching fresh data:', e);
  }
  if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000) {
    return cache.rows.map(row => ({
      userEmail: row[0],
      team: row[2],
      description: row[4],
      timeSpent: parseFloat(row[6]) || 0,
      status: row[7],
      submissionDate: row[9],
      creationDate: row[13] || '',
      completionDate: row[14] || ''
    }));
  }
  const { allTasks } = await batchFetchTasks(accessToken, '', '', 'Advisor', sheetName, tokenClient);
  return allTasks;
}

async function appendTask(accessToken, taskData, sheetName, tokenClient) {
  if (!taskData.userEmail || isNaN(parseFloat(taskData.timeSpent))) {
    throw new Error('Invalid task data: userEmail and timeSpent are required.');
  }
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
        taskData.userRole || '',
        taskData.creationDate || new Date().toISOString(),
        taskData.completionDate || ''
      ]]
    })
  });
  if (!response.ok) {
    if (response.status === 401) {
      console.log('401 on append task, requesting new token');
      tokenClient.requestAccessToken();
      return;
    }
    throw new Error(`Failed to append task: ${response.status}`);
  }
  return response.json();
}

async function updateTaskStatus(accessToken, sheetName, rowIndex, status, editorEmail, editorNotes, tokenClient) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A${rowIndex}:O${rowIndex}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        status,
        editorNotes || '',
        undefined,
        editorEmail,
        undefined, undefined, undefined, undefined
      ]]
    })
  });
  if (!response.ok) {
    if (response.status === 401) {
      console.log('401 on update task status, requesting new token');
      tokenClient.requestAccessToken();
      return;
    }
    throw new Error(`Failed to update task status: ${response.status}`);
  }
  return response.json();
}

async function batchFetchTasks(accessToken, userEmail, userTeam, userRole, sheetName, tokenClient) {
  try {
    const ranges = [`${sheetName}!A2:O`];
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values:batchGet?ranges=${ranges.join('&ranges=')}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        console.log('401 on batch fetch, requesting new token');
        tokenClient.requestAccessToken();
        return { openTasks: [], userTasks: [], teamTasks: [], allTasks: [] };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const rows = data.valueRanges[0].values || [];

    // Cache tasks in localStorage with 5-minute expiration
    const cache = {
      timestamp: Date.now(),
      rows: rows
    };
    localStorage.setItem(`tasks_${sheetName}`, JSON.stringify(cache));

    // Process tasks based on role
    let openTasks = [];
    let userTasks = [];
    let teamTasks = [];
    let allTasks = [];

    if (userRole === 'Advisor' || userRole === 'Chief Editor') {
      openTasks = rows.filter(row => row[7] === 'Open').map(row => ({
        description: row[4],
        rowIndex: rows.indexOf(row) + 2
      }));
      allTasks = rows.map(row => ({
        userEmail: row[0],
        team: row[2],
        description: row[4],
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        submissionDate: row[9],
        creationDate: row[13] || '',
        completionDate: row[14] || ''
      }));
    } else if (userRole === 'Editor') {
      openTasks = rows.filter(row => (row[7] === 'Open' || row[7] === 'Pending') && row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
        description: row[4],
        rowIndex: rows.indexOf(row) + 2,
        userEmail: row[0],
        artifactLink: row[5] || '',
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        creationDate: row[13] || '',
        completionDate: row[14] || ''
      }));
      teamTasks = rows.filter(row => row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
        userEmail: row[0],
        description: row[4],
        artifactLink: row[5] || '',
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        submissionDate: row[9],
        creationDate: row[13] || '',
        completionDate: row[14] || '',
        rowIndex: rows.indexOf(row) + 2
      }));
    } else {
      openTasks = rows.filter(row => row[7] === 'Open' && row[0] === userEmail && row[2] && row[2].toLowerCase() === userTeam.toLowerCase()).map(row => ({
        description: row[4],
        rowIndex: rows.indexOf(row) + 2,
        creationDate: row[13] || ''
      }));
      userTasks = rows.filter(row => row[0] === userEmail).map(row => ({
        description: row[4],
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        submissionDate: row[9],
        creationDate: row[13] || '',
        completionDate: row[14] || ''
      }));
    }

    return { openTasks, userTasks, teamTasks, allTasks };
  } catch (error) {
    console.error('Error in batchFetchTasks:', error);
    return { openTasks: [], userTasks: [], teamTasks: [], allTasks: [] };
  }
}
