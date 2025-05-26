# Yearbook Staff Management App

Welcome to the Yearbook Staff Management App, a tool designed to help Granite Schools yearbook staff track tasks, hours, and roles efficiently. Deployed at [https://kappter.github.io/yearbook-staff-app/](https://kappter.github.io/yearbook-staff-app/), this app supports 60-80 staffers in meeting their ~57 hours/student/semester requirement (plus a 20% buffer, ~68 hours).

## Current Features
- **Google Authentication**: Secure login restricted to `@graniteschools.org` accounts.
- **First Login Setup**: Users select their team (Photography, Writing, Design, Copy, Leadership) and role (Staff, Editor, Advisor) on first login, stored locally and in a Google Sheet.
- **Task Management**:
  - Create tasks with team, task type, description, and estimated time.
  - Report work with artifact links and actual time spent, updating task status (Open, Pending, Completed).
  - Advisors (Leadership role) view all open tasks; others see only their team’s tasks.
- **Data Storage**: Tasks are logged in a Google Sheet (ID: `1Eca5Bjc1weVose02_saqVUnWvoYirNp1ymj26_UY780`) with columns for User Email, User Name, Team, Task Type, Description, Artifact Link, Time Spent, Status, Editor Notes, Submission Date, Editor Email, Team, and Role.
- **Artifact Support**: Attach Google Drive links to tasks for documentation.

## Getting Started
1. Clone the repository: `git clone https://github.com/kappter/yearbook-staff-app.git`
2. Open `index.html` in a browser or deploy to GitHub Pages.
3. Log in with your `@graniteschools.org` Google account to set up your profile and start managing tasks.

## Prerequisites
- Google Cloud Project with OAuth 2.0 Client ID (`782915328509-4joueiu50j6kkned1ksk1ccacusblka5.apps.googleusercontent.com`).
- Access to the shared Google Sheet with Editor permissions for the service account (`kkapptiesa@fair-portal-460923-q4.iam.gserviceaccount.com`).

## Known Issues
- Team and Role columns (L, M) may not populate correctly in older tasks due to recent updates—new tasks should reflect these fields.
- No multi-user testing yet; relies on single-account simulation with local storage clearing.

## Todo Before August 2025
- **Reporting Features**:
  - Add a Weekly Report to show tasks completed in the current week.
  - Implement an Overall Activity Report with total hours per period (Summer Work, 2026 Term 1, 2026 Term 2, 2026 Term 3, Post Publication).
- **Editor Dashboard**:
  - Create a view for Editors and Advisors to approve/reject tasks and add notes.
  - Automate 5-10 minute credits per approval.
- **Notifications**:
  - Send alerts for task deletions or status changes.
- **Role-Based Enhancements**:
  - Add team reassignments for Advisors.
  - Implement bulk task approvals for efficiency.
- **Performance**:
  - Optimize Sheet API calls for larger staff sizes (60-80 users).
  - Ensure scalability for ~68-hour tracking per student.

## Contributing
Feel free to fork this repository, submit issues, or pull requests. Collaboration is welcome to refine this tool for the upcoming school year!

## License
[MIT License](LICENSE) - Free for educational use.

## Contact
For questions, reach out to Kenneth J Kapptie at `kkapptie@graniteschools.org`.