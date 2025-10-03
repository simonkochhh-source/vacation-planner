# 🚀 Flutter App Quick Start Guide

## 📋 Prerequisites

### Development Environment
- [ ] Flutter SDK 3.16+ installed
- [ ] Dart SDK 3.2+ installed
- [ ] Android Studio with Android SDK
- [ ] Xcode (for iOS development)
- [ ] VS Code with Flutter extensions

### Accounts & Services
- [ ] Apple Developer Account ($99/year)
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Firebase project (free tier)
- [ ] Supabase project (existing)

## 🛠️ Initial Setup

### 1. Create Flutter Project
```bash
# Create new Flutter project
flutter create vacation_planner_mobile
cd vacation_planner_mobile

# Set up proper bundle identifiers
# iOS: ios/Runner/Info.plist
# Android: android/app/build.gradle
```

### 2. Add Core Dependencies
```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.0
  
  # Backend Integration
  supabase_flutter: ^2.0.0
  
  # Navigation
  go_router: ^12.0.0
  
  # Local Storage
  hive_flutter: ^1.1.0
  flutter_secure_storage: ^9.0.0
  
  # UI Components
  material_icons: ^7.0.0
  cached_network_image: ^3.3.0
  
  # Platform Services
  firebase_core: ^2.24.0
  firebase_analytics: ^10.7.0
  google_maps_flutter: ^2.5.0
  camera: ^0.10.5
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

### 3. Project Structure Setup
```bash
# Create folder structure
mkdir -p lib/{app,core,features,shared}
mkdir -p lib/app/{routes,theme,constants}
mkdir -p lib/core/{services,models,providers,utils,network}
mkdir -p lib/features/{auth,trips,destinations,timeline,maps,photos,budget,social,chat,search,profile}
mkdir -p lib/shared/{widgets,components,extensions}
```

## 🔧 Configuration

### 1. Supabase Configuration
```dart
// lib/main.dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(const ProviderScope(child: VacationPlannerApp()));
}
```

### 2. Theme Configuration
```dart
// lib/app/theme/app_theme.dart
class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF4A90A4), // primaryOcean
    ),
    fontFamily: 'Inter',
    // Additional theme configuration
  );
}
```

### 3. Navigation Setup
```dart
// lib/app/routes/app_router.dart
final appRouter = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const AuthWrapper(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/trips',
      builder: (context, state) => const TripsScreen(),
    ),
    // Additional routes
  ],
);
```

## 📱 Core Implementation

### 1. Authentication Service
```dart
// lib/core/services/auth_service.dart
class AuthService {
  static final _client = Supabase.instance.client;
  
  static Future<AuthResponse> signIn(String email, String password) {
    return _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }
  
  static User? get currentUser => _client.auth.currentUser;
  static Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;
}
```

### 2. State Management
```dart
// lib/core/providers/auth_provider.dart
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState.initial()) {
    AuthService.authStateChanges.listen((authState) {
      // Handle auth state changes
    });
  }
}
```

### 3. Data Models
```dart
// lib/core/models/trip.dart
class Trip {
  final String id;
  final String name;
  final DateTime? startDate;
  final DateTime? endDate;
  // Additional fields matching React app
  
  const Trip({required this.id, required this.name, this.startDate, this.endDate});
  
  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
    id: json['id'],
    name: json['name'],
    startDate: json['start_date'] != null ? DateTime.parse(json['start_date']) : null,
    endDate: json['end_date'] != null ? DateTime.parse(json['end_date']) : null,
  );
  
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'start_date': startDate?.toIso8601String(),
    'end_date': endDate?.toIso8601String(),
  };
}
```

## 🎨 UI Implementation

### 1. Design System Components
```dart
// lib/shared/widgets/app_button.dart
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  
  const AppButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: _getButtonStyle(variant),
      child: Text(text),
    );
  }
}
```

### 2. Feature Screens
```dart
// lib/features/trips/screens/trips_screen.dart
class TripsScreen extends ConsumerWidget {
  const TripsScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripsState = ref.watch(tripsProvider);
    
    return Scaffold(
      appBar: AppBar(title: const Text('My Trips')),
      body: tripsState.when(
        loading: () => const CircularProgressIndicator(),
        error: (error, stack) => Text('Error: $error'),
        data: (trips) => ListView.builder(
          itemCount: trips.length,
          itemBuilder: (context, index) => TripCard(trip: trips[index]),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/create-trip'),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

## 🧪 Testing Setup

### 1. Unit Tests
```dart
// test/core/services/auth_service_test.dart
void main() {
  group('AuthService', () {
    test('should sign in user with valid credentials', () async {
      // Test implementation
    });
    
    test('should throw error with invalid credentials', () async {
      // Test implementation
    });
  });
}
```

### 2. Widget Tests
```dart
// test/features/trips/trips_screen_test.dart
void main() {
  testWidgets('TripsScreen should display trips list', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(home: TripsScreen()),
      ),
    );
    
    expect(find.text('My Trips'), findsOneWidget);
    expect(find.byType(ListView), findsOneWidget);
  });
}
```

### 3. Integration Tests
```dart
// integration_test/app_test.dart
void main() {
  group('App Integration Tests', () {
    testWidgets('complete user flow', (tester) async {
      await tester.pumpWidget(VacationPlannerApp());
      
      // Test complete user journey
      // Login -> Create Trip -> Add Destinations -> etc.
    });
  });
}
```

## 📱 Platform Configuration

### iOS Setup
```xml
<!-- ios/Runner/Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to show your trips on the map.</string>
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos for your trips.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select trip photos.</string>
```

### Android Setup
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## 🚀 Development Workflow

### 1. Development Commands
```bash
# Run app in debug mode
flutter run

# Run with specific device
flutter run -d ios
flutter run -d android

# Hot reload
# Press 'r' in terminal or save file in IDE

# Run tests
flutter test
flutter test integration_test/

# Build for release
flutter build ios
flutter build appbundle
```

### 2. Debug Tools
```bash
# Flutter Inspector
flutter inspector

# Performance profiling
flutter run --profile
flutter run --trace-startup

# Analyze code
flutter analyze
dart fix --apply
```

### 3. Common Issues & Solutions
```bash
# Clear build cache
flutter clean
flutter pub get

# Reset iOS simulator
flutter clean
cd ios && rm -rf Pods Podfile.lock
cd .. && flutter pub get
cd ios && pod install

# Fix Android Gradle issues
cd android && ./gradlew clean
cd .. && flutter clean && flutter pub get
```

## 📦 Deployment

### 1. iOS Deployment
```bash
# Build for App Store
flutter build ios --release

# Open in Xcode for submission
open ios/Runner.xcworkspace
```

### 2. Android Deployment
```bash
# Build App Bundle
flutter build appbundle --release

# Upload to Google Play Console
# Upload build/app/outputs/bundle/release/app-release.aab
```

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/flutter.yml
name: Flutter CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
      
  build:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build ios --release --no-codesign
      - run: flutter build appbundle --release
```

## 📚 Resources

### Documentation
- [Flutter Documentation](https://docs.flutter.dev/)
- [Supabase Flutter Guide](https://supabase.com/docs/reference/dart/introduction)
- [Riverpod Documentation](https://riverpod.dev/)
- [Material Design 3](https://m3.material.io/)

### Tools & Packages
- [pub.dev](https://pub.dev/) - Dart & Flutter packages
- [FlutterFire](https://firebase.flutter.dev/) - Firebase for Flutter
- [Very Good CLI](https://cli.vgv.dev/) - Flutter project templates

### Learning Resources
- [Flutter Codelabs](https://docs.flutter.dev/codelabs)
- [Flutter YouTube Channel](https://www.youtube.com/c/flutterdev)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)

---

## 🎯 Next Steps

1. **Set up development environment** following prerequisites
2. **Create project** using commands above
3. **Follow Phase 1 todos** from FLUTTER_DEVELOPMENT_TODOS.md
4. **Implement authentication** as first feature
5. **Set up CI/CD pipeline** early in development
6. **Regular testing** on both iOS and Android devices
7. **Follow cross-platform integration guide** for Supabase sync

**Estimated Time to First Working Version:** 4-6 weeks
**Estimated Time to App Store Release:** 12-14 weeks