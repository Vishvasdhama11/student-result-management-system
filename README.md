# 💰 Finacer - Premium Finance Management Web App

A modern, responsive finance management application built with vanilla JavaScript, Firebase Authentication, and Firestore Database. Manage customers, calculate compound interest, and track financial metrics in real-time.

## ✨ Features

### 🔐 Authentication System
- Secure email & password signup
- Secure login with Firebase Authentication
- Protected dashboard with session handling
- One-click logout
- Automatic redirect for unauthenticated users

### 📊 Dashboard
- Premium dark UI with glassmorphism effect
- Real-time statistics cards
- Recent customers preview
- Responsive sidebar navigation
- Live clock with date and time

### 👥 Customer Finance Management
Add and manage customers with:
- Customer name
- Start date
- Principal amount
- Interest percentage
- Interest type (Per Month / Per Year)

### 🧮 Automatic Calculations
Real-time automatic calculation of:
- Total days passed from start date
- Daily interest amount
- Total interest amount
- Final amount (Principal + Interest)
- Live preview while entering data

### 📋 Customer Features
- **View All Customers**: Premium table display with all metrics
- **Search Customers**: Real-time search by customer name
- **Edit Customers**: Modify customer details anytime
- **Delete Customers**: Remove customers with confirmation
- **Profit Summary**: Total principal, interest, and final amounts
- **Auto Refresh**: Data auto-refreshes every 30 seconds

### 🎨 UI/UX Features
- Premium dark blue glassmorphism design
- Smooth hover effects and animations
- Fully responsive (mobile, tablet, desktop)
- Beautiful gradient buttons
- Animated cards and transitions
- Professional finance company styling

### 🔒 Security
- Firebase Authentication for user management
- Firestore security rules (read/write restricted to authenticated users)
- Private user data isolation
- Secure session handling

## 📁 Project Structure

```
finacer/
├── index.html                 # Login & Signup page
├── dashboard.html             # Main dashboard
├── assets/
│   ├── css/
│   │   └── style.css         # All styling (premium UI)
│   └── js/
│       ├── firebase.js       # Firebase configuration
│       └── app.js            # Application logic
├── firebase-rules.json       # Firestore security rules
├── .gitignore               # Git ignore file
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Firebase account (free tier works great)
- Modern web browser
- Local web server (required for Firebase and browser security)

> **Important:** Do not open the app directly using `file://`. Run it from a local server instead.

### Start the app
- `npx http-server .` from the project root
- Or use VS Code Live Server

- Text editor (VS Code recommended)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Create a new project**
3. Enter project name (e.g., "Finacer")
4. Follow the setup wizard
5. Create the project

### 2. Enable Firebase Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get started**
3. Select **Email/Password** provider
4. Click **Enable** and save

### 3. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your region (closest to your users)
5. Create database

### 4. Get Your Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Web App Configuration**
3. Copy the entire configuration object

### 5. Update Firebase Config in Your Project

1. Open `assets/js/firebase.js`
2. Replace the `firebaseConfig` object with your credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 6. Add Firestore Security Rules

1. In Firebase Console, go to **Firestore Database**
2. Click **Rules** tab
3. Replace the default rules with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /customers/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

4. Click **Publish**

### 7. Run the Application

**Option A: Using VS Code Live Server**
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Click "Open with Live Server"
4. App opens at `http://localhost:5500`

**Option B: Using Python**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Visit `http://localhost:8000`

**Option C: Using Node.js**
```bash
# Install http-server
npm install -g http-server

# Run
http-server

# Visit http://localhost:8080
```

## 📖 How to Use

### Sign Up
1. Click "Sign Up" on the login page
2. Enter your email and create a secure password (min. 6 characters)
3. Confirm your password
4. Click "Create Account"

### Login
1. Enter your email
2. Enter your password
3. Click "Login"

### Add a Customer
1. Click "➕ Add Customer" in sidebar or dashboard
2. Enter customer name
3. Select start date
4. Enter principal amount
5. Enter interest percentage
6. Select interest type (Per Month or Per Year)
7. Watch the live preview update automatically
8. Click "💾 Add Customer"

### View All Customers
1. Click "👥 Customers" in sidebar
2. All customer data displays in a table
3. Use search box to find specific customers
4. See automatic calculations for each customer

### Edit Customer
1. Click "✏️ Edit" button on any customer
2. Modify details in the modal
3. Click "💾 Save Changes"

### Delete Customer
1. Click "🗑️ Delete" button on any customer
2. Confirm the deletion
3. Customer is removed permanently

### View Dashboard
1. Click "📊 Dashboard" in sidebar
2. See summary statistics:
   - Total customers count
   - Total principal amount
   - Total interest earned
   - Total final amount
3. View recent customers preview

## 🧮 Interest Calculation

The app calculates interest based on the selected type:

### Monthly Interest
- Daily Rate = (Interest% ÷ 12) ÷ 30
- Total Interest = Daily Interest × Days Passed
- Example: 12% monthly = 0.03% daily

### Yearly Interest
- Daily Rate = Interest% ÷ 365
- Total Interest = Daily Interest × Days Passed
- Example: 12% yearly = 0.033% daily

### Formula
```
Days Passed = Today - Start Date
Daily Interest Rate = Interest% / (12 or 365) / 100
Daily Interest Amount = Principal × Daily Interest Rate
Total Interest = Daily Interest Amount × Days Passed
Final Amount = Principal + Total Interest
```

## 🔒 Security Considerations

### Best Practices Implemented
✅ Firebase Authentication for secure login
✅ Firestore rules restrict data access to authenticated users only
✅ User data isolation - each user can only see their data
✅ Password validation (minimum 6 characters)
✅ HTTPS recommended for production
✅ No sensitive data stored in localStorage

### Security Rules Explained
The Firestore rules ensure:
- Only logged-in users can access customers collection
- Users can only read/write their own customer data
- `userId` field ensures data isolation
- Prevents unauthorized access to other users' data

## 📱 Responsive Design

- **Desktop**: Full feature set with sidebar
- **Tablet**: Optimized layout and sizing
- **Mobile**: Touch-friendly interface, collapsible navigation
- **Small Screens**: Simplified layout for best usability

## 🌐 Deploy to Firebase Hosting

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Hosting
```bash
firebase init hosting
```
- Select your project
- Use current directory as public directory
- Configure as single-page app (yes)

### 4. Deploy
```bash
firebase deploy
```

Your app will be live at: `https://your-project.firebaseapp.com`

## 🐛 Troubleshooting

### "Firebase initialization error"
- Check if Firebase config is correct in `firebase.js`
- Verify all credentials from Firebase Console

### "Permission denied" error
- Ensure Firestore security rules are published
- Check that `userId` field is set correctly
- Clear browser cache and reload

### Data not loading
- Check browser console for errors (F12)
- Verify user is authenticated
- Ensure Firestore database is enabled
- Check internet connection

### Cannot sign up
- Password must be at least 6 characters
- Email must be valid format
- Check that Authentication is enabled

## 🚀 Performance Tips

- App auto-refreshes data every 30 seconds
- Uses efficient Firestore queries
- Lazy loads data on section change
- Caches customer data in memory
- Smooth animations don't block UI

## 📊 Database Schema

### Customers Collection
```json
{
  "id": "auto-generated",
  "name": "Customer Name",
  "startDate": "2024-01-15",
  "principal": 10000,
  "interestPercentage": 12,
  "interestType": "monthly",
  "userId": "firebase-user-id",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## 💡 Features You Can Add

- Export to PDF/CSV
- Monthly/yearly reports
- Interest rate templates
- Customer categories
- Transaction history
- Bulk import customers
- Custom interest formulas
- Analytics dashboard

## 📄 License

This project is open source and free to use.

## 🤝 Contributing

Contributions are welcome! Feel free to fork and improve.

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors

## 📝 Changelog

### v1.0.0
- ✅ Initial release
- ✅ User authentication
- ✅ Customer management
- ✅ Automatic calculations
- ✅ Firestore integration
- ✅ Responsive design
- ✅ Security rules

---

**Made with ❤️ for Finance Professionals**

Happy managing! 💰
