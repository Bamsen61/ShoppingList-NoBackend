# ShoppingList-NoBackend

A secure shopping list web application using Firebase Realtime Database, designed for GitHub Pages deployment.

## 🖥 Test local GIT clone

**In local Powershell:**
- cd "d:\GIT\ShoppingList-NoBackend\docs"
- python -m http.server 8000


## 🔒 Security Features

- Domain-restricted Firebase API keys
- Firebase Database security rules
- Automated GitHub Pages deployment
- Environment variable support for local development

## 🚀 Deployment

This app is configured for automatic deployment to GitHub Pages via GitHub Actions.

### Firebase Security Setup

1. **Restrict API Key in Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Navigate to Project Settings > General > Your apps
   - Click on your web app
   - Go to "API keys" section
   - Edit the API key restrictions:
     - **HTTP referrers**: Add your GitHub Pages domain (e.g., `https://yourusername.github.io/*`)
     - **Websites**: Add your domain

2. **Database Rules:**
   - The `database.rules.json` file contains security rules
   - Deploy rules via Firebase CLI: `firebase deploy --only database`

### Local Development

1. Create `.env` file from `.env.example`
2. Fill in your Firebase configuration
3. Start local server: `python -m http.server 8000`
4. Visit: `http://localhost:8000`

## 📱 Features

- Add/remove shopping items
- Mark items as purchased
- Multi-user support (Morten/Linh)
- Adjustable font sizes
- Shop-based organization
- Responsive design

## 🛡️ Security Best Practices

- API keys are domain-restricted
- Database access controlled by security rules
- Sensitive data stored in environment variables
- Automated secure deployment pipeline
