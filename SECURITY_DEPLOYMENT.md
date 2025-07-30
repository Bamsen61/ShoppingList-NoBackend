# Security Deployment Guide - Email/Password Authentication

## Steps to Deploy Email/Password Authentication

### 1. Set Up Users in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **handleliste-3bdaa**
3. Navigate to **Authentication** → **Users** tab
4. Click **Add User** and create the following users:
   - **Email**: `morten.steien@wemail.no`
   - **Password**: `President`
   - Click **Add User**
   
   You can add a second user if needed following the same process.

### 2. Enable Email/Password Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Email/Password**
3. **Enable** the first toggle (Email/Password)
4. Click **Save**

### 3. Disable Anonymous Authentication (Optional but Recommended)
1. In the same **Sign-in method** tab
2. Find **Anonymous** and **Disable** it
3. Click **Save**

### 4. Update Database Rules in Firebase Console
1. Go to **Realtime Database** → **Rules** tab
2. Replace the current rules with:

```json
{
  "rules": {
    "handleliste": {
      ".read": "auth != null && auth.token.email != null",
      ".write": "auth != null && auth.token.email != null",
      "$itemId": {
        ".validate": "newData.hasChildren(['Name', 'Shop', 'Buy'])",
        "Name": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
        },
        "Shop": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50"
        },
        "Buy": {
          ".validate": "newData.isBoolean()"
        },
        "BoughtBy": {
          ".validate": "newData.isString() && newData.val().length <= 50"
        },
        "BoughtDate": {
          ".validate": "newData.val() === null || newData.isString()"
        },
        "BuyNumber": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "AddedBy": {
          ".validate": "newData.isString() && newData.val().length <= 50"
        }
      }
    }
  }
}
```

5. Click **Publish** to deploy the rules

### 5. Test the Application
1. Start your local server: `python -m http.server 8000`
2. Open `http://localhost:8000/docs/`
3. You should be redirected to the login page
4. Sign in with: `morten.steien@wemail.no` / `President`
5. Verify all features work after login

### 6. Security Features Now Active
- ✅ **Email/Password Authentication**: Only registered users can access
- ✅ **Login Required**: Automatic redirect to login page if not authenticated
- ✅ **Logout Function**: Users can sign out securely
- ✅ **Data Validation**: Enforced for all fields
- 🚫 **Unauthorized Access**: Completely blocked

### 7. User Management
To add more users:
1. Go to Firebase Console → Authentication → Users
2. Click **Add User**
3. Enter email and password
4. Click **Add User**

### 8. Current Security Status
- 🔐 **Authentication**: Email/password required
- 👥 **User Management**: Controlled via Firebase Console
- 📝 **Data Validation**: Enforced for all fields
- 🚫 **Public Access**: Completely blocked
- � **Session Management**: Login/logout functionality

## Authorized Users
- `morten.steien@wemail.no` (Password: `President`)
- Additional users can be added via Firebase Console

## Rollback Plan
If you need to rollback to anonymous authentication:
1. Enable Anonymous authentication in Firebase Console
2. Update database rules to: `".read": "auth != null", ".write": "auth != null"`
3. Update the JavaScript code to use `signInAnonymously` instead of email/password
