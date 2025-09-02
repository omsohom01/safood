# Food Rescue App 🍽️

A comprehensive React Native mobile application that connects food donors (restaurants, grocery stores, individuals) with NGOs and volunteer drivers for real-time food donation pickups, built with Expo and Firebase.

## 🌟 Features

### Core Features
- **Multi-role Authentication**: Separate flows for Donors, NGOs, and Volunteer Drivers
- **Real-time Food Listings**: Donors can quickly list surplus food with photos, descriptions, and pickup details
- **Live Map Integration**: Interactive map showing nearby donations and pickup locations
- **Smart Matching**: NGOs can claim donations, volunteers can accept pickup jobs
- **Status Tracking**: Complete status flow from Listed → Claimed → Picked Up → Delivered
- **Push Notifications**: Instant alerts for urgent requests and status updates
- **Impact Analytics**: Comprehensive dashboard showing meals saved, deliveries completed
- **Volunteer Leaderboard**: Gamified impact tracking for volunteers

### Technical Features
- **Firebase Backend**: Authentication, Firestore database, real-time updates
- **Base64 Image Storage**: Food photos stored as Base64 in Firestore
- **Location Services**: GPS integration for pickup locations and route planning
- **Cross-platform**: Works on iOS, Android, and Web
- **Modern UI**: Clean, colorful design with smooth animations
- **TypeScript**: Fully typed codebase for better development experience

## 🏗️ Project Structure

```
food-rescue/
├── app/                          # App screens and navigation
│   ├── (tabs)/                  # Main tab navigation
│   │   ├── index.tsx           # Root/Loading screen
│   │   ├── home.tsx            # Dashboard with role-specific content
│   │   ├── map.tsx             # Interactive map for donations/pickups
│   │   ├── add.tsx             # Add new food donation (Donors only)
│   │   ├── notifications.tsx   # Notifications center
│   │   └── profile.tsx         # User profile and analytics
│   ├── auth/                    # Authentication screens
│   │   ├── welcome.tsx         # Role selection screen
│   │   ├── signup.tsx          # User registration
│   │   └── signin.tsx          # User login
│   ├── onboarding/             # App introduction screens
│   └── _layout.tsx             # Root layout with auth provider
├── components/                  # Reusable UI components
│   ├── ui/                     # Custom UI components
│   │   ├── Button.tsx          # Styled button component
│   │   ├── InputField.tsx      # Form input field
│   │   ├── FoodCard.tsx        # Food donation card
│   │   └── StatCard.tsx        # Statistics display card
├── contexts/                    # React contexts
│   └── AuthContext.tsx         # Authentication state management
├── services/                    # Backend services
│   └── firebaseService.ts      # Firebase operations
├── types/                       # TypeScript type definitions
│   └── index.ts                # App-wide types and interfaces
├── config/                      # Configuration files
│   └── firebase.ts             # Firebase configuration
├── constants/                   # App constants
│   └── Colors.ts               # Color scheme and theme
└── assets/                      # Images, fonts, and static files
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd food-rescue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Get your Firebase configuration
   - Update `config/firebase.ts` with your Firebase config:
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

4. **Set up Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Donations are readable by all authenticated users
       match /donations/{donationId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           (resource == null || resource.data.donorId == request.auth.uid);
       }
       
       // Notifications are readable by the recipient
       match /notifications/{notificationId} {
         allow read, write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
       
       // Analytics are readable by the owner
       match /ngo_analytics/{ngoId} {
         allow read, write: if request.auth != null && request.auth.uid == ngoId;
       }
       
       match /volunteer_stats/{volunteerId} {
         allow read, write: if request.auth != null && request.auth.uid == volunteerId;
       }
     }
   }
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 👥 User Roles & Features

### 🏪 Food Donors (Restaurants, Stores, Individuals)
- **Add Donations**: Upload food photos, descriptions, quantities, pickup windows
- **Location Selection**: Set pickup addresses with GPS integration
- **Urgent Requests**: Mark time-sensitive donations for priority handling
- **Track Status**: Monitor donation progress from listing to delivery
- **Impact Dashboard**: View total donations and community impact

### ❤️ NGOs & Charities
- **Browse Donations**: View all available food donations in real-time
- **Claim System**: Reserve donations for their organization
- **Map View**: See nearby donations with location markers
- **Analytics Dashboard**: Track meals saved, deliveries completed, donors helped
- **Notification System**: Instant alerts for new donations and urgent requests

### 🚗 Volunteer Drivers
- **Pickup Map**: Interactive map showing available pickup jobs
- **Route Planning**: GPS navigation to pickup and delivery locations
- **Accept Jobs**: Claim pickup assignments from NGOs
- **Delivery Tracking**: Update status throughout the delivery process
- **Leaderboard**: Gamified system showing volunteer rankings and badges
- **Impact Stats**: Personal dashboard with deliveries made and meals saved

## 📱 Screenshots & Demo

### Onboarding & Authentication
- Welcome screens with role selection
- Clean signup/signin forms
- Role-specific onboarding

### Dashboard Views
- **Donor Dashboard**: Donation management and statistics
- **NGO Dashboard**: Available donations and impact analytics
- **Volunteer Dashboard**: Pickup opportunities and leaderboard

### Core Features
- **Food Listing**: Photo upload, description, location picker
- **Interactive Map**: Real-time markers for donations and pickups
- **Notifications**: Push notifications for status updates
- **Profile & Analytics**: User stats and impact tracking

## 🔧 Technical Implementation

### Architecture
- **Frontend**: React Native with Expo
- **Backend**: Firebase (Authentication + Firestore)
- **State Management**: React Context API
- **Navigation**: Expo Router (file-based routing)
- **Styling**: StyleSheet + NativeWind (Tailwind CSS)
- **Maps**: React Native Maps with Google Maps
- **Notifications**: Expo Notifications

### Key Technologies
- **TypeScript**: Type safety and better development experience
- **Expo**: Rapid development and easy deployment
- **Firebase Auth**: Secure user authentication
- **Firestore**: Real-time database with offline support
- **Expo Image Picker**: Camera and photo library access
- **Expo Location**: GPS and location services
- **Linear Gradient**: Beautiful gradient backgrounds

### Performance Optimizations
- **Image Optimization**: Base64 encoding for quick loading
- **Real-time Updates**: Firestore listeners for live data
- **Lazy Loading**: Conditional component rendering
- **Memory Management**: Proper cleanup of listeners and subscriptions

## 🌐 Firebase Configuration

### Required Firebase Services
1. **Authentication**: Enable Email/Password provider
2. **Firestore Database**: Create collections for:
   - `users`: User profiles and roles
   - `donations`: Food donation listings
   - `notifications`: Push notifications
   - `ngo_analytics`: NGO statistics
   - `volunteer_stats`: Volunteer performance data

### Environment Variables
Create a `.env` file in the project root:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 📋 Development Workflow

### Code Structure
- **Components**: Reusable UI components with TypeScript props
- **Services**: Firebase operations and API calls
- **Types**: Comprehensive type definitions for all data structures
- **Constants**: Colors, configurations, and app constants

### Best Practices
- **Type Safety**: All components and functions are fully typed
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Proper loading indicators for all async operations
- **Responsive Design**: Works across different screen sizes
- **Accessibility**: Screen reader support and proper accessibility labels

## 🚀 Deployment

### Building for Production

1. **Configure app signing** (for standalone apps)
2. **Build the app**:
   ```bash
   # For Android
   npx expo build:android
   
   # For iOS
   npx expo build:ios
   
   # For both platforms
   npx eas build --platform all
   ```

3. **Deploy to app stores**:
   - Google Play Store (Android)
   - Apple App Store (iOS)

### Web Deployment
```bash
npx expo export:web
# Deploy the web-build folder to your hosting service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team**: For the amazing development platform
- **Firebase Team**: For the robust backend services
- **React Native Community**: For the excellent libraries and support
- **Food Rescue Organizations**: For inspiration and real-world insights

## 📞 Support

For support, email [support@foodrescue.app](mailto:support@foodrescue.app) or create an issue in this repository.

---

Built with ❤️ to fight food waste and feed communities worldwide 🌍