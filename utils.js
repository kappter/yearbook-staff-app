console.log('utils.js loaded');

async function refreshAccessToken(tokenClient) {
  return new Promise((resolve, reject) => {
    tokenClient.requestAccessToken({
      callback: (tokenResponse) => {
        if (tokenResponse.access_token) {
          console.log('New access token obtained:', tokenResponse.access_token);
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('Failed to obtain new access token'));
        }
      },
      error_callback: (error) => {
        console.error('Token refresh error:', error);
        reject(error);
      }
    });
  });
}

window.utils = {
  loadOpenTasks: async (accessToken, userEmail, userTeam, userRole, sheetName, tokenClient) => {
    try {
      console.log('loadOpenTasks: Using access token:', accessToken);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!response.ok) {
        if (response.status === 401 && tokenClient) {
          console.log('401 detected, attempting token refresh');
          const newToken = await refreshAccessToken(tokenClient);
          return window.utils.loadOpenTasks(newToken, userEmail, userTeam, userRole, sheetName, tokenClient);
        }
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      const tasks = data.values
        ? data.values.map((row, index) => ({
            rowIndex: index + 2,
            userEmail: row[0] || '',
            userName: row[1] || '',
            team: row[2] || '',
            taskType: row[3] || '',
            description: row[4] || '',
            artifactLink: row[5] || '',
            timeSpent: row[6] || '0',
            status: row[7] || 'Open',
            editorNotes: row[8] || '',
            submissionDate: row[9] || '',
            editorEmail: row[10] || '',
            userTeam: row[11] || '',
            userRole: row[12] || '',
            creationDate: row[13] || '',
            completionDate: row[14] || ''
          }))
        : [];
      if (userRole === 'Advisor' || userRole === 'Chief Editor') {
        return tasks.filter(task => task.status === 'Open');
      } else if (userRole === 'Editor') {
        return tasks.filter(task => task.team === userTeam && task.status === 'Open');
      } else {
        return tasks.filter(task => task.userEmail === userEmail && task.status === 'Open');
      }
    } catch (error) {
      console.error('Error loading open tasks:', error);
      return [];
    }
  },

  appendTask: async (accessToken, taskData, sheetName, tokenClient) => {
    try {
      console.log('appendTask: Using access token:', accessToken);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A:O:append?valueInputOption=RAW`,
        {
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
              taskData.artifactLink,
              taskData.timeSpent,
              taskData.status,
              taskData.editorNotes,
              taskData.submissionDate || new Date().toISOString(),
              taskData.editorEmail,
              taskData.userTeam,
              taskData.userRole,
              taskData.creationDate,
              taskData.completionDate
            ]]
          })
        }
      );
      if (!response.ok) {
        if (response.status === 401 && tokenClient) {
          console.log('401 detected, attempting token refresh');
          const newToken = await refreshAccessToken(tokenClient);
          return window.utils.appendTask(newToken, taskData, sheetName, tokenClient);
        }
        throw new Error(`Failed to append task: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error appending task:', error);
      throw error;
    }
  },

  fetchAllTasks: async (accessToken, sheetName, tokenClient) => {
    try {
      console.log('fetchAllTasks: Using access token:', accessToken);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!response.ok) {
        if (response.status === 401 && tokenClient) {
          console.log('401 detected, attempting token refresh');
          const newToken = await refreshAccessToken(tokenClient);
          return window.utils.fetchAllTasks(newToken, sheetName, tokenClient);
        }
        throw new Error(`Failed to fetch all tasks: ${response.status}`);
      }
      const data = await response.json();
      return data.values
        ? data.values.map((row, index) => ({
            rowIndex: index + 2,
            userEmail: row[0] || '',
            userName: row[1] || '',
            team: row[2] || '',
            taskType: row[3] || '',
            description: row[4] || '',
            artifactLink: row[5] || '',
            timeSpent: row[6] || '0',
            status: row[7] || 'Open',
            editorNotes: row[8] || '',
            submissionDate: row[9] || '',
            editorEmail: row[10] || '',
            userTeam: row[11] || '',
            userRole: row[12] || '',
            creationDate: row[13] || '',
            completionDate: row[14] || ''
          }))
        : [];
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  },

  fetchTeamTasks: async (accessToken, team, sheetName, tokenClient) => {
    try {
      const tasks = await window.utils.fetchAllTasks(accessToken, sheetName, tokenClient);
      return tasks.filter(task => task.team === team);
    } catch (error) {
      console.error('Error fetching team tasks:', error);
      return [];
    }
  },

  fetchUserTasks: async (accessToken, userEmail, sheetName, tokenClient) => {
    try {
      const tasks = await window.utils.fetchAllTasks(accessToken, sheetName, tokenClient);
      return tasks.filter(task => task.userEmail === userEmail);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return [];
    }
  },

  updateTaskStatus: async (accessToken, sheetName, rowIndex, status, editorEmail, tokenClient) => {
    try {
      console.log('updateTaskStatus: Using access token:', accessToken);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!H${rowIndex}:K${rowIndex}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[status, '', new Date().toISOString(), editorEmail]]
          })
        }
      );
      if (!response.ok) {
        if (response.status === 401 && tokenClient) {
          console.log('401 detected, attempting token refresh');
          const newToken = await refreshAccessToken(tokenClient);
          return window.utils.updateTaskStatus(newToken, sheetName, rowIndex, status, editorEmail, tokenClient);
        }
        throw new Error(`Failed to update task status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
};
