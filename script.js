
gapi.client.load('sheets', 'v4', () => {
  console.log('Sheets API loaded');
});

async function appendTask(taskData) {
  const response = await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: '<YOUR_SHEET_ID>',
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
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
  });
  return response;
}
