# yearbook-staff-app

## Overview
The Yearbook Staff Management App is a web-based tool designed to help Granite School District yearbook staff (up to 80 users) manage tasks and track time spent on projects, targeting approximately 57 hours per student per semester (with a 20% buffer, ~68 hours). Hosted at https://kappter.github.io/yearbook-staff-app/, it uses Google OAuth 2.0 for secure authentication restricted to `@graniteschools.org` domains and integrates with Google Sheets for task data storage.

## Features
- **Authentication**: Secure login using Google Identity Services, limited to Granite School District users.
- **Task Creation**: Allows users to create new tasks with details like task type, team, description, and estimated time (capped at 180 minutes).
- **Task Reporting**: Enables users to report completed tasks, including artifact links and actual time spent, updating task status.
- **Task Tracking**: Displays open tasks for the logged-in user, stored in a Google Sheet (ID: `1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780`).
- **Logout Functionality**: Allows users to securely log out, clearing session data.
- **Responsive Design**: Uses plain CSS for a clean, lightweight interface adaptable to various devices.

## Use Plan
### Setup (May 24-25, 2025)
1. **Initial Configuration**:
   - Ensure Google Cloud Project ("Yearbook App Authentication") is set up with OAuth 2.0 Client ID (`782915328509-4joueiu50j6kkned1ksk1ccacusblka5.apps.googleusercontent.com`) and Google Sheets API enabled.
   - Share the Google Sheet with `edit` access for `@graniteschools.org` domain.
2. **Deployment**:
   - Push code to the `main` branch and verify at https://kappter.github.io/yearbook-staff-app/.
   - Test authentication with a Granite School District account.

### Usage (May 25 - June 2025)
- **Daily Operations**:
  - **Login**: Staff log in with their `@graniteschools.org` Google account.
  - **Create Tasks**: Assign new tasks (e.g., "Shoot football game", 60 minutes) via the "Create Work" modal.
  - **Report Tasks**: Submit completed tasks with links (e.g., Google Drive) and actual time via the "Report Work" modal.
  - **Logout**: End sessions securely when done.
- **Monitoring**:
  - Editors check the Google Sheet for task status (Open/Pending/Approved/Rejected).
  - Review time logs to ensure compliance with the ~68-hour cap per student.

### Future Development (June 2025 onward)
- **Editor Dashboard**: Add a view for editors to approve or reject tasks.
- **Notifications**: Implement email alerts for task updates using Google Apps Script.
- **Reports**: Generate time tracking and grading summaries.

## Technical Details
- **Framework**: Plain HTML, CSS, and JavaScript (no frameworks like Tailwind).
- **Authentication**: Google Identity Services (GIS) with domain restriction.
- **Data Storage**: Google Sheets API for task data.
- **Deployment**: GitHub Pages.

## Getting Started
1. Clone the repository: `git clone https://github.com/kappter/yearbook-staff-app.git`.
2. Ensure a `favicon.ico` is added to the root directory (create via https://www.favicon.io/).
3. Open `index.html` in a browser or deploy to GitHub Pages.
4. Log in with a `@graniteschools.org` account to test functionality.

## Contributors
- [Your Name] - Initial development and setup.

## License
[Add license if applicable, e.g., MIT License]
