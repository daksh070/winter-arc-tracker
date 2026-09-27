# Winter Arc Tracker

A responsive, dark winter-themed fitness and self-improvement tracker for a personal 30, 60 or 90-day challenge. It includes a local demo account, daily habits, streaks, nutrition estimates, progress tracking, photo comparisons, milestone badges and a downloadable PDF report.

## Features

- Create an account and log in using browser LocalStorage.
- Personal dashboard with challenge day, goal, streak, daily completion and key metrics.
- BMI calculator using editable height and weight, with the standard BMI categories.
- Goal-based protein estimate: Fat Loss 1.8 g/kg, Muscle Gain 2.0 g/kg, Lean Body 1.6 g/kg, Maintain 1.4 g/kg.
- Rule-based vegetarian meal ideas, water guidance and a fitness tip for each goal.
- Seven daily habit check-ins saved by date; a streak day requires the scheduled habits marked as streak habits. An unfinished current day does not erase yesterday’s streak.
- Progress check-ins with optional waist and notes, a Chart.js weight graph and reset confirmation.
- Before/after images stored locally as resized JPEG data URLs with an adjustable comparison split.
- Ten activity-based badges and a jsPDF progress report.
- Custom habits, weekday schedules, rest days and a four-week habit calendar.
- Mood, energy, sleep, workout-duration, and weekly reflection check-ins.
- Editable profile and challenge dates, pause/resume/restart controls, and dashboard card preferences.
- Optional browser reminders plus LocalStorage backup export/import and account-data deletion.
- Responsive Bootstrap navigation and layouts for mobile, tablet and desktop.

## Tech stack

HTML5, CSS3, vanilla JavaScript, Bootstrap 5 CDN, Chart.js CDN, jsPDF CDN and browser LocalStorage. No backend or build step is used.

## Folder structure

```text
winter-arc-tracker/
â”œâ”€â”€ index.html
â”œâ”€â”€ style.css
â”œâ”€â”€ enhancements.css
â”œâ”€â”€ script.js
â”œâ”€â”€ README.md
â””â”€â”€ assets/
    â””â”€â”€ images/
```

## Run locally

1. Download or clone this repository.
2. Open `winter-arc-tracker/index.html` in a modern browser. For the most consistent behavior, use a simple static server or an editor's Live Server extension.
3. Create an account and start tracking. Chart.js and jsPDF are loaded from CDNs, so those features need an internet connection.

All progress persists in the browser's LocalStorage for the current browser profile. Clearing site data removes the saved demo data. Photo uploads are resized in the browser before saving; browser storage capacity varies. Reminders require notification permission and work only while the app is open.

## Upload to GitHub

1. Create a new empty repository on GitHub.
2. In a terminal, enter the project folder and initialize Git if needed:

   ```bash
   cd winter-arc-tracker
   git init
   git add .
   git commit -m "Build Winter Arc Tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

Replace the remote URL with your repository's URL. If Git is already configured, add and push the project files using your normal workflow.

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. Select **Other** as the Framework Preset.
3. Set the Root Directory to the folder containing `index.html` (the repository root if the project files are at the repository root, or `winter-arc-tracker` if the parent folder is committed).
4. Leave Build Command and Output Directory empty; there is no build step.
5. Deploy. Vercel serves the files as a static site.

## Demo authentication and privacy

This is a local demo, not secure authentication. User records (including the demo password) and tracker data live in LocalStorage and are accessible to anyone who can use the same browser profile or inspect its storage. Do not use real or sensitive credentials. The app uses the requested keys: `winterArcUsers`, `winterArcCurrentUser`, `winterArcHabits`, `winterArcProgress`, `winterArcPhotos` and `winterArcBadges`.

Additional preferences and check-ins use account-scoped `winterArcSettings`, `winterArcWellness` and `winterArcReflections` keys. AI diet generation is not connected in this static version. OpenAI API keys must not be exposed in browser code or public repositories, and API use is billed separately from ChatGPT subscriptions. Live AI requires a secure serverless endpoint and a private key configured in Vercel environment variables, plus API billing setup.
