# baby-io

Monitor and record a baby's daily care.

## Development

This project uses Angular, Angular Material, Firebase Authentication, and Cloud Firestore. Firebase Hosting configuration is included for the `baby-io-80d95` project.

Install dependencies and start the development server:

```bash
npm install
npm start
```

The app is served at `http://localhost:4200/` by default.

## Dev container

Open the repository in VS Code and choose **Reopen in Container** when prompted. The container uses Node 22, installs the project dependencies automatically, and forwards port 4200 for the Angular development server.

Start the app inside the container with:

```bash
npm start -- --host 0.0.0.0
```

## Firebase Hosting

The Firebase CLI is installed locally in the project. Authenticate once in an interactive terminal:

```bash
npx firebase login
```

Build and deploy the Angular application to Firebase Hosting:

```bash
npm run deploy
```

The app uses Google sign-in and stores shared records in the `logs` collection. Firestore rules restrict access to the two approved Firebase user IDs. Enable Google as a sign-in provider in Firebase Authentication before using the deployed app.

## Planned record workflow

Each record will support:

- Timestamp
- Milk amount
- Supplement amount
- Pee indicator
- Poop indicator

Records are grouped by date and support create, edit, and delete operations. The current implementation uses Cloud Firestore through `LogStorageService`.
