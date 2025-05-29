window.utils = {
  loadOpenTasks: async (accessToken, userEmail, userTeam, userRole, sheetName) => {
    console.log('Access token for loadOpenTasks:', accessToken);
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O1050`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      console.log(`Raw rows from ${sheetName}:`, data.values);

      let tasks = [];
      if (userRole === 'Editor') {
        tasks = data.values
          .filter((row, index) => row[11] === userTeam && row[7] === 'Open')
          .map((row, index) => ({
            rowIndex: index + 2,
            userEmail: row[0],
            userName: row[1],
            team: row[2],
            taskType: row[3],
            description: row[4],
            artifactLink: row[5] || '',
            timeSpent: parseFloat(row[6]) || 0,
            status: row[7],
            editorNotes: row[8] || '',
            submissionDate: row[9] || '',
            editorEmail: row[10] || '',
            userTeam: row[11] || '',
            userRole: row[12] || '',
            creationDate: row[13] || '',
            completionDate: row[14] || ''
          }));
        console.log(`Editor filtered rows from ${sheetName}:`, tasks);
      } else if (userRole === 'Staff') {
        tasks = data.values
          .filter((row, index) => row[0] === userEmail && row[7] === 'Open')
          .map((row, index) => ({
            rowIndex: index + 2,
            userEmail: row[0],
            userName: row[1],
            team: row[2],
            taskType: row[3],
            description: row[4],
            artifactLink: row[5] || '',
            timeSpent: parseFloat(row[6]) || 0,
            status: row[7],
            editorNotes: row[8] || '',
            submissionDate: row[9] || '',
            editorEmail: row[10] || '',
            userTeam: row[11] || '',
            userRole: row[12] || '',
            creationDate: row[13] || '',
            completionDate: row[14] || ''
          }));
        console.log(`Staff filtered rows from ${sheetName}:`, tasks);
      }
      return tasks;
    } catch (error) {
      console.error('Error in loadOpenTasks:', error);
      return [];
    }
  },

  fetchUserTasks: async (accessToken, userEmail, sheetName) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O1050`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      console.log('Fetched data from', sheetName, ':', data);
      console.log('Parsed rows from', sheetName, ':', data.values);
      const tasks = data.values
        .filter(row => row[0] === userEmail)
        .map((row, index) => ({
          rowIndex: index + 2,
          userEmail: row[0],
          userName: row[1],
          team: row[2],
          taskType: row[3],
          description: row[4],
          artifactLink: row[5] || '',
          timeSpent: parseFloat(row[6]) || 0,
          status: row[7],
          editorNotes: row[8] || '',
          submissionDate: row[9] || '',
          editorEmail: row[10] || '',
          userTeam: row[11] || '',
          userRole: row[12] || '',
          creationDate: row[13] || '',
          completionDate: row[14] || ''
        }));
      console.log('Mapped tasks from', sheetName, ':', tasks);
      return tasks;
    } catch (error) {
      console.error('Error in fetchUserTasks:', error);
      return [];
    }
  },

  fetchTeamTasks: async (accessToken, userTeam, sheetName) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O1050`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      const tasks = data.values
        .filter(row => row[11] === userTeam)
        .map((row, index) => ({
          rowIndex: index + 2,
          userEmail: row[0],
          userName: row[1],
          team: row[2],
          taskType: row[3],
          description: row[4],
          artifactLink: row[5] || '',
          timeSpent: parseFloat(row[6]) || 0,
          status: row[7],
          editorNotes: row[8] || '',
          submissionDate: row[9] || '',
          editorEmail: row[10] || '',
          userTeam: row[11] || '',
          userRole: row[12] || '',
          creationDate: row[13] || '',
          completionDate: row[14] || ''
        }));
      return tasks;
    } catch (error) {
      console.error('Error in fetchTeamTasks:', error);
      return [];
    }
  },

  fetchAllTasks: async (accessToken, sheetName) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A2:O1050`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      const tasks = data.values.map((row, index) => ({
        rowIndex: index + 2,
        userEmail: row[0],
        userName: row[1],
        team: row[2],
        taskType: row[3],
        description: row[4],
        artifactLink: row[5] || '',
        timeSpent: parseFloat(row[6]) || 0,
        status: row[7],
        editorNotes: row[8] || '',
        submissionDate: row[9] || '',
        editorEmail: row[10] || '',
        userTeam: row[11] || '',
        userRole: row[12] || '',
        creationDate: row[13] || '',
        completionDate: row[14] || ''
      }));
      return tasks;
    } catch (error) {
      console.error('Error in fetchAllTasks:', error);
      return [];
    }
  },

  appendTask: async (accessToken, taskData, sheetName) => {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A1:O1:append?valueInputOption=RAW`, {
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
            new Date().toISOString(),
            taskData.editorEmail,
            taskData.userTeam,
            taskData.userRole,
            taskData.creationDate,
            taskData.completionDate
          ]]
        })
      });
    } catch (error) {
      console.error('Error in appendTask:', error);
      throw error;
    }
  },

  updateTaskStatus: async (accessToken, sheetName, rowIndex, status, editorEmail) => {
    try {
      // Step 1: Fetch the existing row to preserve other fields
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A${rowIndex}:O${rowIndex}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch row ${rowIndex}: HTTP status ${response.status}`);
      }
      const data = await response.json();
      const row = data.values[0];

      // Step 2: Update only the status (column H, index 7) and editorEmail (column K, index 10)
      row[7] = status; // Status
      row[9] = new Date().toISOString(); // Submission Date
      row[10] = editorEmail; // Editor Email

      // Step 3: Write the updated row back
      const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780/values/${sheetName}!A${rowIndex}:O${rowIndex}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      });
      if (!updateResponse.ok) {
        throw new Error(`Failed to update row ${rowIndex}: HTTP status ${updateResponse.status}`);
      }
      console.log(`Successfully updated row ${rowIndex} to status ${status}`);
    } catch (error) {
      console.error('Error in updateTaskStatus:', error);
      throw error;
    }
  }
};
