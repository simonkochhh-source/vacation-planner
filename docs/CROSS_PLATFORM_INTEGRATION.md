# 🔄 Cross-Platform Integration Guide
## React Web App ↔ Flutter Mobile App

## 🎯 Integration Overview

This guide ensures seamless data synchronization and user experience consistency between the React web application and Flutter mobile app through shared Supabase infrastructure.

## 🗄️ Shared Database Schema

### Core Tables (Shared Exactly)
```sql
-- Users table (Supabase Auth)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User profiles
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username VARCHAR UNIQUE,
  display_name VARCHAR,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status trip_status DEFAULT 'planning',
  privacy trip_privacy DEFAULT 'private',
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  destinations UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  weather_info JSONB,
  vehicle_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Destinations
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  location VARCHAR,
  coordinates JSONB,
  category destination_category,
  status destination_status DEFAULT 'planned',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  duration INTEGER, -- minutes
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  transport_to_next JSONB,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  color VARCHAR,
  weather_info JSONB,
  is_return_destination BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Photos
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  trip_id UUID REFERENCES trips(id),
  destination_id UUID REFERENCES destinations(id),
  file_path TEXT NOT NULL,
  file_name VARCHAR,
  file_size INTEGER,
  mime_type VARCHAR,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  taken_at TIMESTAMP,
  location JSONB,
  privacy photo_privacy DEFAULT 'private',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Social features (Chat, Friends, etc.)
-- [Additional tables as per existing schema]
```

## 🔧 Flutter Supabase Integration

### Supabase Configuration
```dart
// lib/core/services/supabase_service.dart
class SupabaseService {
  static late SupabaseClient _client;
  
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: 'YOUR_SUPABASE_URL', // Same as React app
      anonKey: 'YOUR_SUPABASE_ANON_KEY', // Same as React app
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
    _client = Supabase.instance.client;
  }
  
  static SupabaseClient get client => _client;
}
```

### Data Models (Dart) - Exact React TypeScript Mapping
```dart
// lib/core/models/trip.dart
class Trip {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final DateTime? startDate;
  final DateTime? endDate;
  final TripStatus status;
  final TripPrivacy privacy;
  final double? budget;
  final double? actualCost;
  final List<String> destinations;
  final List<String> tags;
  final Map<String, dynamic>? weatherInfo;
  final Map<String, dynamic>? vehicleConfig;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Trip({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    this.startDate,
    this.endDate,
    this.status = TripStatus.planning,
    this.privacy = TripPrivacy.private,
    this.budget,
    this.actualCost,
    this.destinations = const [],
    this.tags = const [],
    this.weatherInfo,
    this.vehicleConfig,
    required this.createdAt,
    required this.updatedAt,
  });

  // JSON serialization - exactly matching React app
  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'],
      userId: json['user_id'],
      name: json['name'],
      description: json['description'],
      startDate: json['start_date'] != null 
          ? DateTime.parse(json['start_date']) 
          : null,
      endDate: json['end_date'] != null 
          ? DateTime.parse(json['end_date']) 
          : null,
      status: TripStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => TripStatus.planning,
      ),
      privacy: TripPrivacy.values.firstWhere(
        (e) => e.name == json['privacy'],
        orElse: () => TripPrivacy.private,
      ),
      budget: json['budget']?.toDouble(),
      actualCost: json['actual_cost']?.toDouble(),
      destinations: List<String>.from(json['destinations'] ?? []),
      tags: List<String>.from(json['tags'] ?? []),
      weatherInfo: json['weather_info'],
      vehicleConfig: json['vehicle_config'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'description': description,
      'start_date': startDate?.toIso8601String(),
      'end_date': endDate?.toIso8601String(),
      'status': status.name,
      'privacy': privacy.name,
      'budget': budget,
      'actual_cost': actualCost,
      'destinations': destinations,
      'tags': tags,
      'weather_info': weatherInfo,
      'vehicle_config': vehicleConfig,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

// Enums - exact mapping from React TypeScript
enum TripStatus { planning, active, completed, cancelled }
enum TripPrivacy { private, public, contacts }
enum DestinationStatus { planned, visited, skipped, inProgress }
enum DestinationCategory { 
  museum, restaurant, attraction, hotel, transport, 
  nature, entertainment, shopping, cultural, sports, other 
}
```

## 🔄 Real-time Synchronization

### React App - Supabase Realtime Setup
```typescript
// Already implemented in React app
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Real-time subscriptions for trips
const tripsSubscription = supabase
  .channel('trips')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'trips',
      filter: `user_id=eq.${user.id}` 
    },
    (payload) => {
      // Handle trip changes
      handleTripChange(payload);
    }
  )
  .subscribe();
```

### Flutter App - Supabase Realtime Setup
```dart
// lib/core/services/realtime_service.dart
class RealtimeService {
  static final SupabaseClient _client = SupabaseService.client;
  
  static Stream<List<Trip>> getUserTripsStream(String userId) {
    return _client
        .from('trips')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .map((data) => data.map((json) => Trip.fromJson(json)).toList());
  }
  
  static Stream<List<Destination>> getTripDestinationsStream(String tripId) {
    return _client
        .from('destinations')
        .stream(primaryKey: ['id'])
        .map((data) => data
            .where((d) => (d['trip_ids'] as List?)?.contains(tripId) ?? false)
            .map((json) => Destination.fromJson(json))
            .toList());
  }
  
  // Chat real-time
  static Stream<List<ChatMessage>> getChatMessagesStream(String roomId) {
    return _client
        .from('chat_messages')
        .stream(primaryKey: ['id'])
        .eq('room_id', roomId)
        .order('created_at')
        .map((data) => data.map((json) => ChatMessage.fromJson(json)).toList());
  }
}
```

## 🔐 Authentication Sync

### Session Sharing Strategy
```dart
// lib/core/services/auth_service.dart
class AuthService {
  static final SupabaseClient _client = SupabaseService.client;
  
  // Login methods that sync with React app
  static Future<AuthResponse> signInWithEmail(String email, String password) {
    return _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }
  
  // Session management
  static User? get currentUser => _client.auth.currentUser;
  static Session? get currentSession => _client.auth.currentSession;
  
  // Auth state stream for providers
  static Stream<AuthState> get authStateChanges => 
      _client.auth.onAuthStateChange;
  
  // Sign out (affects both platforms)
  static Future<void> signOut() => _client.auth.signOut();
  
  // Profile management
  static Future<UserProfile> getUserProfile() async {
    final user = currentUser;
    if (user == null) throw Exception('Not authenticated');
    
    final response = await _client
        .from('user_profiles')
        .select()
        .eq('id', user.id)
        .single();
    
    return UserProfile.fromJson(response);
  }
}
```

## 📱 Cross-Platform State Management

### Flutter Riverpod Providers
```dart
// lib/core/providers/auth_provider.dart
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState.initial()) {
    _init();
  }
  
  void _init() {
    // Listen to auth changes from Supabase (shared with React)
    AuthService.authStateChanges.listen((authState) {
      if (authState.event == AuthChangeEvent.signedIn) {
        state = AuthState.authenticated(authState.session!.user);
      } else if (authState.event == AuthChangeEvent.signedOut) {
        state = const AuthState.unauthenticated();
      }
    });
  }
}

// lib/core/providers/trips_provider.dart
final tripsProvider = StateNotifierProvider<TripsNotifier, TripsState>((ref) {
  final authState = ref.watch(authProvider);
  return TripsNotifier(authState.user?.id);
});

class TripsNotifier extends StateNotifier<TripsState> {
  final String? userId;
  StreamSubscription? _tripsSubscription;
  
  TripsNotifier(this.userId) : super(const TripsState.loading()) {
    if (userId != null) {
      _listenToTrips();
    }
  }
  
  void _listenToTrips() {
    _tripsSubscription = RealtimeService.getUserTripsStream(userId!)
        .listen((trips) {
      state = TripsState.loaded(trips);
    });
  }
  
  @override
  void dispose() {
    _tripsSubscription?.cancel();
    super.dispose();
  }
}
```

## 🔄 Offline Synchronization

### Conflict Resolution Strategy
```dart
// lib/core/services/sync_service.dart
class SyncService {
  static final SupabaseClient _client = SupabaseService.client;
  static final Box _syncBox = Hive.box('sync_queue');
  
  // Queue operations when offline
  static Future<void> queueOperation(SyncOperation operation) async {
    await _syncBox.add(operation.toJson());
  }
  
  // Sync when back online
  static Future<void> syncPendingOperations() async {
    final operations = _syncBox.values
        .map((json) => SyncOperation.fromJson(json))
        .toList();
    
    for (final operation in operations) {
      try {
        await _executeOperation(operation);
        await _syncBox.delete(operation.id);
      } catch (e) {
        // Handle conflict - React app might have newer data
        await _resolveConflict(operation, e);
      }
    }
  }
  
  static Future<void> _resolveConflict(SyncOperation operation, dynamic error) async {
    // Last-write-wins strategy
    // Or show conflict resolution UI to user
    if (error is PostgrestException && error.code == '23505') {
      // Unique constraint violation - merge data
      await _mergeConflictingData(operation);
    }
  }
}
```

## 🎨 Design System Consistency

### Shared Design Tokens
```dart
// lib/app/theme/app_colors.dart
class AppColors {
  // Exact same values as React CSS variables
  static const Color primarySage = Color(0xFF87A96B);    // --color-primary-sage
  static const Color primaryOcean = Color(0xFF4A90A4);   // --color-primary-ocean
  static const Color primarySand = Color(0xFFD4B996);    // --color-primary-sand
  
  static const Color secondarySunset = Color(0xFFCC8B65); // --color-secondary-sunset
  static const Color secondaryForest = Color(0xFF5F7A61); // --color-secondary-forest
  static const Color secondarySky = Color(0xFF87CEEB);    // --color-secondary-sky
  
  // [Additional colors with exact hex mappings]
}

// lib/app/theme/app_theme.dart
class AppTheme {
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primaryOcean,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.primaryOcean,
      secondary: AppColors.primarySage,
      surface: Colors.white,
      background: AppColors.neutralCream,
      // [Additional color mappings]
    ),
    textTheme: AppTextStyles.lightTextTheme,
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16), // --radius-lg
      ),
    ),
  );
}
```

## 📊 Analytics & Monitoring

### Shared Analytics Events
```dart
// lib/core/services/analytics_service.dart
class AnalyticsService {
  // Track same events as React app for consistency
  static Future<void> trackTripCreated(String tripId) async {
    await FirebaseAnalytics.instance.logEvent(
      name: 'trip_created',
      parameters: {
        'trip_id': tripId,
        'platform': 'flutter',
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }
  
  static Future<void> trackDestinationAdded(String destinationId, String tripId) async {
    await FirebaseAnalytics.instance.logEvent(
      name: 'destination_added',
      parameters: {
        'destination_id': destinationId,
        'trip_id': tripId,
        'platform': 'flutter',
      },
    );
  }
  
  // [Additional shared events]
}
```

## 🔄 API Consistency

### Shared API Layer
```dart
// lib/core/repositories/trip_repository.dart
class TripRepository {
  static final SupabaseClient _client = SupabaseService.client;
  
  // Same API calls as React app
  static Future<List<Trip>> getUserTrips() async {
    final response = await _client
        .from('trips')
        .select()
        .eq('user_id', AuthService.currentUser!.id)
        .order('created_at', ascending: false);
    
    return response.map((json) => Trip.fromJson(json)).toList();
  }
  
  static Future<Trip> createTrip(CreateTripData data) async {
    final response = await _client
        .from('trips')
        .insert(data.toJson())
        .select()
        .single();
    
    return Trip.fromJson(response);
  }
  
  static Future<Trip> updateTrip(String tripId, UpdateTripData data) async {
    final response = await _client
        .from('trips')
        .update(data.toJson())
        .eq('id', tripId)
        .select()
        .single();
    
    return Trip.fromJson(response);
  }
  
  // [Additional CRUD operations matching React app]
}
```

## 🧪 Cross-Platform Testing

### Integration Testing Strategy
```dart
// test/integration/cross_platform_sync_test.dart
void main() {
  group('Cross-Platform Sync Tests', () {
    testWidgets('Trip created in Flutter syncs to React', (tester) async {
      // 1. Create trip in Flutter app
      final trip = await TripRepository.createTrip(testTripData);
      
      // 2. Verify trip exists in Supabase
      final response = await SupabaseService.client
          .from('trips')
          .select()
          .eq('id', trip.id)
          .single();
      
      expect(response['id'], equals(trip.id));
      
      // 3. Verify trip would be visible in React app
      // (This would require React app to be running for full E2E test)
    });
    
    testWidgets('Real-time updates work across platforms', (tester) async {
      // Test real-time synchronization
      final stream = RealtimeService.getUserTripsStream(testUserId);
      
      // Listen for updates
      final subscription = stream.listen(expectAsync1((trips) {
        expect(trips.any((t) => t.id == testTripId), isTrue);
      }));
      
      // Simulate update from React app
      await SupabaseService.client
          .from('trips')
          .update({'name': 'Updated from React'})
          .eq('id', testTripId);
      
      await subscription.cancel();
    });
  });
}
```

## 📱 Platform-Specific Adaptations

### iOS Adaptations
```dart
// lib/core/services/ios_service.dart
class iOSService {
  // iOS-specific features that complement React app
  static Future<void> setupiOSFeatures() async {
    // Siri Shortcuts for trip access
    await _setupSiriShortcuts();
    
    // Widget data for home screen
    await _updateWidgetData();
    
    // Apple Watch integration (future)
    // await _setupWatchConnectivity();
  }
  
  static Future<void> _setupSiriShortcuts() async {
    // Register shortcuts for recent trips
    final trips = await TripRepository.getUserTrips();
    for (final trip in trips.take(5)) {
      await _registerTripShortcut(trip);
    }
  }
}
```

### Android Adaptations
```dart
// lib/core/services/android_service.dart
class AndroidService {
  // Android-specific features that complement React app
  static Future<void> setupAndroidFeatures() async {
    // Home screen widgets
    await _updateHomeWidgets();
    
    // Google Assistant actions
    await _setupAssistantActions();
    
    // Android Auto integration (future)
    // await _setupAndroidAuto();
  }
}
```

## 🚀 Deployment Considerations

### Environment Configuration
```dart
// lib/core/config/app_config.dart
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'YOUR_SUPABASE_URL', // Same as React app
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY', 
    defaultValue: 'YOUR_SUPABASE_ANON_KEY', // Same as React app
  );
  
  // Ensure same environment is used
  static bool get isProduction => supabaseUrl.contains('prod');
  static bool get isDevelopment => supabaseUrl.contains('dev');
}
```

## ✅ Cross-Platform Checklist

### Data Consistency
- [ ] All models match React TypeScript interfaces exactly
- [ ] Database schemas are identical
- [ ] API responses are consistent
- [ ] Real-time updates work both ways
- [ ] Offline sync maintains data integrity

### User Experience Consistency  
- [ ] Design tokens are identical (colors, spacing, typography)
- [ ] Navigation patterns are similar but platform-appropriate
- [ ] Feature parity is maintained
- [ ] Performance is comparable
- [ ] Error handling is consistent

### Security & Privacy
- [ ] Authentication flows are synchronized
- [ ] Permissions are handled consistently
- [ ] Data encryption is equivalent
- [ ] Privacy settings sync across platforms
- [ ] Session management is coordinated

### Testing & Quality
- [ ] Cross-platform integration tests pass
- [ ] Real-time sync stress tests pass
- [ ] Offline/online transition tests pass
- [ ] Performance benchmarks meet targets
- [ ] User acceptance testing on both platforms

---

This integration guide ensures that the Flutter mobile app and React web app work seamlessly together, providing users with a consistent experience regardless of platform while leveraging the unique capabilities of each platform.