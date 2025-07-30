# ShoppingList App - Local Testing Guide

## 🌐 Access the Application
- **URL**: http://localhost:8000
- **Alternative**: http://127.0.0.1:8000

## 🧪 Manual Testing Steps

### 1. Basic Interface Testing
- [ ] Page loads without errors
- [ ] "Loading shop..." appears in header
- [ ] Font size selector is visible (Normal, Large, Extra Large, Huge)
- [ ] Person selector shows "Morten" and "Linh" options
- [ ] "Add" button is visible at bottom

### 2. Firebase Connection Testing
- [ ] Shop name loads (should change from "Loading shop...")
- [ ] No console errors in browser developer tools
- [ ] Items list populates (if any exist in database)

### 3. Font Size Testing
- [ ] Change font size dropdown
- [ ] Verify text size changes immediately
- [ ] Refresh page - font size should persist

### 4. Person Selection Testing
- [ ] Switch between Morten and Linh
- [ ] Setting should persist after page reload

### 5. Shop Management Testing
- [ ] Click on shop name in header
- [ ] Enter a new shop name
- [ ] Verify shop name updates

### 6. Add Item Testing
- [ ] Click "Add" button
- [ ] Should navigate to add item page
- [ ] Fill in item name and shop
- [ ] Click "OK" to add item
- [ ] Should return to main page with new item

### 7. Mark Item as Bought
- [ ] Click on any item in the list
- [ ] Item should disappear from list (marked as bought)

## 🛠️ Developer Tools Testing

### Open Browser Developer Tools (F12):

#### Console Tab:
- [ ] No red errors
- [ ] Firebase connection successful
- [ ] Check for any JavaScript errors

#### Network Tab:
- [ ] All files load successfully (200 status)
- [ ] Firebase requests working
- [ ] No failed requests (check for 404s or CORS errors)

#### Application Tab:
- [ ] LocalStorage contains saved settings:
  - `fontSize`
  - `person`
  - `shop`

## 🔧 Troubleshooting Common Issues

### If page doesn't load:
1. Check terminal - server should be running
2. Try: `python -m http.server 8000` in docs folder
3. Verify URL: http://localhost:8000

### If Firebase doesn't connect:
1. Check browser console for errors
2. Verify internet connection
3. Check Firebase project status

### If items don't load:
1. Check Firebase database rules
2. Verify database has data
3. Check network requests in dev tools

## 📱 Mobile Testing
- Use browser dev tools device emulation
- Test touch interactions
- Verify responsive design

## 🧪 Browser Compatibility Testing
Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if available)

## 💾 Data Persistence Testing
1. Add items
2. Close browser
3. Reopen application
4. Verify items are still there
5. Test across different devices/browsers
