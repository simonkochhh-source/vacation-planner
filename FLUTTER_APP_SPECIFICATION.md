# Flutter App Spezifikation: Vacation Planner (Trailkeeper)

**Erstellt am:** 2025-01-10  
**Basierend auf:** React App Analyse (Commit: 8fa60c1)  
**Version:** 1.0.0

## 📋 Projekt-Übersicht

**App Name:** Trailkeeper (Flutter Version)  
**Ziel:** Mobile-First Vacation Planning App mit vollständiger Feature-Parität zur React Web-App  
**Plattformen:** iOS & Android  
**Datenbasis:** Geteilte Supabase-Instanzen (Produktiv & Test)

## 🏗️ Architektur-Analyse React App

### Core Features identifiziert:
1. **Reise-Management** - Trips erstellen, bearbeiten, teilen
2. **Destination-Planning** - Native Inline Creator/Editor (kürzlich implementiert)
3. **Interactive Maps** - OpenStreetMap Integration 
4. **Social Features** - User-Profiles, Following, Photo-Sharing
5. **Timeline View** - Enhanced Timeline mit horizontalem Layout
6. **Budget Tracking** - Kosten-Management und Tracking
7. **Authentication** - Supabase Auth mit Email/OAuth
8. **Offline Capability** - LocalStorage Fallback
9. **Photo Management** - Upload, Sharing, Galleries
10. **Chat System** - Real-time Messaging zwischen Users

### Technischer Stack React:
- **Frontend:** React 19.1.1 + TypeScript
- **Backend:** Supabase (Database + Auth + Storage)
- **State Management:** React Context + Hooks
- **Maps:** Leaflet + OpenStreetMap
- **UI Components:** Lucide Icons + Custom Design System
- **Styling:** CSS-in-JS + Design Tokens
- **Testing:** Jest + React Testing Library

## 🎯 Flutter App Spezifikation

### 1. Architektur & State Management

```
lib/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   └── utils/
├── data/
│   ├── datasources/
│   ├── models/
│   ├── repositories/
│   └── providers/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
├── presentation/
│   ├── pages/
│   ├── widgets/
│   ├── providers/
│   └── themes/
└── main.dart
```

**State Management:** Flutter Riverpod 2.x
- **Warum:** Bessere Performance als Provider, Type-Safety, DevTools Support
- **Alternativen:** BLoC (falls Team-Präferenz)

### 2. Kern-Dependencies

```yaml
dependencies:
  flutter: 
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.0
  
  # Backend & Database
  supabase_flutter: ^2.5.0
  
  # Maps & Location
  flutter_map: ^7.0.0
  latlong2: ^0.9.0
  geolocator: ^12.0.0
  geocoding: ^3.0.0
  
  # UI & Design
  flutter_svg: ^2.0.0
  cached_network_image: ^3.3.0
  photo_view: ^0.15.0
  
  # Navigation
  go_router: ^14.0.0
  
  # Utilities
  intl: ^0.19.0
  uuid: ^4.0.0
  path_provider: ^2.1.0
  shared_preferences: ^2.2.0
  
  # Image Handling
  image_picker: ^1.0.0
  flutter_image_compress: ^2.1.0
  
  # Networking
  dio: ^5.4.0
  
  # Local Database (Offline)
  hive: ^2.2.3
  hive_flutter: ^1.1.0
```

### 3. Umgebungs-Konfiguration

```dart
// lib/core/config/environment.dart
enum Environment { development, production }

class EnvironmentConfig {
  static const Environment _currentEnv = Environment.development;
  
  // Supabase Configuration
  static const Map<Environment, Map<String, String>> _config = {
    Environment.development: {
      'supabaseUrl': 'https://lsztvtauiapnhqplapgb.supabase.co',
      'supabaseAnonKey': 'dev_anon_key_here',
      'redirectUrl': 'io.trailkeeper.dev://login-callback/',
    },
    Environment.production: {
      'supabaseUrl': 'https://kyzbtkkprvegzgzrlhez.supabase.co', 
      'supabaseAnonKey': 'prod_anon_key_here',
      'redirectUrl': 'io.trailkeeper://login-callback/',
    },
  };
  
  static String get supabaseUrl => _config[_currentEnv]!['supabaseUrl']!;
  static String get supabaseAnonKey => _config[_currentEnv]!['supabaseAnonKey']!;
  static String get redirectUrl => _config[_currentEnv]!['redirectUrl']!;
}
```

### 4. Datenmodelle (Dart Äquivalente)

```dart
// lib/domain/entities/destination.dart
enum DestinationCategory {
  museum, restaurant, attraction, hotel, transport, 
  nature, entertainment, shopping, cultural, sports, other
}

enum DestinationStatus { planned, visited, skipped, inProgress }

enum TransportMode { walking, driving, publicTransport, bicycle, flight, train }

class Destination {
  final String id;
  final String tripId;
  final String name;
  final String location;
  final DestinationCategory category;
  final DateTime startDate;
  final DateTime endDate;
  final Coordinates? coordinates;
  final double? budget;
  final double? actualCost;
  final String? notes;
  final List<String> photos;
  final DestinationStatus status;
  final List<String> tags;
  final TransportInfo? transportToNext;
  
  // Native Creator Fields
  final bool isPaid;
  final TransportMode transportMode;
  
  const Destination({
    required this.id,
    required this.tripId,
    required this.name,
    required this.location,
    required this.category,
    required this.startDate,
    required this.endDate,
    this.coordinates,
    this.budget,
    this.actualCost,
    this.notes,
    this.photos = const [],
    this.status = DestinationStatus.planned,
    this.tags = const [],
    this.transportToNext,
    this.isPaid = false,
    this.transportMode = TransportMode.driving,
  });
}

// lib/domain/entities/trip.dart
enum TripStatus { planning, active, completed, cancelled }
enum TripPrivacy { private, public, contacts }

class Trip {
  final String id;
  final String name;
  final String? description;
  final DateTime startDate;
  final DateTime endDate;
  final List<String> destinations;
  final double? budget;
  final double? actualCost;
  final List<String> participants;
  final TripStatus status;
  final String? coverImage;
  final List<String> tags;
  final TripPrivacy privacy;
  final String ownerId;
  final List<String> taggedUsers;
  final VehicleConfig? vehicleConfig;
  
  const Trip({
    required this.id,
    required this.name,
    this.description,
    required this.startDate,
    required this.endDate,
    this.destinations = const [],
    this.budget,
    this.actualCost,
    this.participants = const [],
    this.status = TripStatus.planning,
    this.coverImage,
    this.tags = const [],
    this.privacy = TripPrivacy.private,
    required this.ownerId,
    this.taggedUsers = const [],
    this.vehicleConfig,
  });
}
```

### 5. Supabase Integration

```dart
// lib/data/datasources/supabase_client.dart
class SupabaseDataSource {
  static final SupabaseClient _client = SupabaseClient(
    EnvironmentConfig.supabaseUrl,
    EnvironmentConfig.supabaseAnonKey,
  );
  
  static SupabaseClient get client => _client;
  
  // Geteilte Tabellen zwischen React & Flutter
  static const String tripsTable = 'trips';
  static const String destinationsTable = 'destinations';
  static const String userProfilesTable = 'user_profiles';
  static const String photoSharesTable = 'photo_shares';
  static const String chatRoomsTable = 'chat_rooms';
  
  // Auth Methods
  Future<AuthResponse> signInWithEmail(String email, String password) async {
    return await _client.auth.signInWithPassword(
      email: email, 
      password: password
    );
  }
  
  Future<AuthResponse> signUpWithEmail(String email, String password) async {
    return await _client.auth.signUp(
      email: email, 
      password: password
    );
  }
  
  Future<void> signOut() async {
    await _client.auth.signOut();
  }
  
  // Real-time Subscriptions  
  Stream<List<Map<String, dynamic>>> watchTrips(String userId) {
    return _client
        .from(tripsTable)
        .stream(primaryKey: ['id'])
        .eq('owner_id', userId);
  }
  
  Stream<List<Map<String, dynamic>>> watchDestinations(String tripId) {
    return _client
        .from(destinationsTable)
        .stream(primaryKey: ['id'])
        .eq('trip_id', tripId);
  }
}

// lib/data/repositories/trip_repository_impl.dart
class TripRepositoryImpl implements TripRepository {
  final SupabaseDataSource _dataSource;
  
  TripRepositoryImpl(this._dataSource);
  
  @override
  Future<List<Trip>> getTrips() async {
    final response = await _dataSource.client
        .from('trips')
        .select()
        .order('created_at', ascending: false);
    
    return response.map((json) => Trip.fromJson(json)).toList();
  }
  
  @override
  Future<Trip> createTrip(CreateTripData data) async {
    final response = await _dataSource.client
        .from('trips')
        .insert(data.toJson())
        .select()
        .single();
    
    return Trip.fromJson(response);
  }
  
  @override
  Stream<List<Trip>> watchTrips() {
    return _dataSource.watchTrips(_getCurrentUserId())
        .map((list) => list.map((json) => Trip.fromJson(json)).toList());
  }
}
```

### 6. Native Inline Creator (Flutter)

```dart
// lib/presentation/widgets/native_destination_creator.dart
class NativeDestinationCreator extends ConsumerStatefulWidget {
  final String tripId;
  final DateTime selectedDate;
  final Function(Destination) onDestinationCreated;
  
  const NativeDestinationCreator({
    super.key,
    required this.tripId,
    required this.selectedDate,
    required this.onDestinationCreated,
  });

  @override
  ConsumerState<NativeDestinationCreator> createState() => 
      _NativeDestinationCreatorState();
}

class _NativeDestinationCreatorState extends ConsumerState<NativeDestinationCreator> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  
  DestinationCategory? selectedCategory;
  double? actualCost;
  bool isPaid = false;
  TransportMode transportMode = TransportMode.driving;
  Coordinates? coordinates;
  DateTime? endDate;
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTablet = MediaQuery.of(context).size.width > 600;
    
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 32,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header mit Gradient (wie React Version)
          _buildHeader(theme),
          
          // Content
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Enhanced Place Search
                _buildPlaceSearch(),
                
                const SizedBox(height: 24),
                
                // Horizontal Layout: Categories (2fr) | Options (1fr)
                if (isTablet) _buildHorizontalLayout() else _buildVerticalLayout(),
                
                const SizedBox(height: 24),
                
                // Action Buttons
                _buildActionButtons(),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildHeader(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.primary,
            AppTheme.colorTokens['primary-sage']!,
          ],
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(14),
          topRight: Radius.circular(14),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.add_location, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(
                'Neues Ziel hinzufügen',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close, color: Colors.white),
            iconSize: 16,
          ),
        ],
      ),
    );
  }
  
  Widget _buildPlaceSearch() {
    return EnhancedPlaceSearchField(
      controller: _nameController,
      onPlaceSelected: (place) {
        setState(() {
          _locationController.text = place.displayName;
          _nameController.text = place.name ?? place.displayName.split(',').first;
          coordinates = place.coordinates;
        });
      },
      decoration: InputDecoration(
        hintText: 'z.B. Hotel Le Marais, Restaurant xyz...',
        prefixIcon: const Icon(Icons.search),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2),
        ),
      ),
    );
  }
  
  Widget _buildHorizontalLayout() {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left: Categories (2fr equivalent)
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCategoryGrid(),
                if (selectedCategory == DestinationCategory.hotel) ...[
                  const SizedBox(height: 24),
                  _buildHotelEndDate(),
                ],
              ],
            ),
          ),
          
          // Divider
          Container(
            width: 1,
            margin: const EdgeInsets.symmetric(horizontal: 32),
            color: Theme.of(context).colorScheme.outline,
          ),
          
          // Right: Always visible options (1fr equivalent)
          Expanded(
            flex: 1,
            child: _buildOptionsPanel(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildVerticalLayout() {
    return Column(
      children: [
        _buildCategoryGrid(),
        if (selectedCategory == DestinationCategory.hotel) ...[
          const SizedBox(height: 24),
          _buildHotelEndDate(),
        ],
        const SizedBox(height: 24),
        Container(
          height: 1,
          color: Theme.of(context).colorScheme.outline,
          margin: const EdgeInsets.symmetric(vertical: 16),
        ),
        _buildOptionsPanel(),
      ],
    );
  }
  
  Widget _buildCategoryGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Was für ein Ziel ist das?',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 2.5,
          children: DestinationCategory.values.take(6).map((category) {
            final isSelected = selectedCategory == category;
            return GestureDetector(
              onTap: () => setState(() => selectedCategory = category),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected 
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surface,
                  border: Border.all(
                    color: isSelected 
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outline,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _getCategoryIcon(category),
                      style: const TextStyle(fontSize: 20),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getCategoryLabel(category),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: isSelected ? Colors.white : null,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
  
  Widget _buildOptionsPanel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cost Input - Always Visible
        _buildCostInput(),
        const SizedBox(height: 24),
        
        // Payment Status - Always Visible
        _buildPaymentStatus(),
        const SizedBox(height: 24),
        
        // Transport Mode - Always Visible
        _buildTransportMode(),
      ],
    );
  }
  
  Widget _buildCostInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.euro, size: 16),
            const SizedBox(width: 8),
            Text(
              'Kosten',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextFormField(
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            hintText: '89.50',
            prefixText: '€ ',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onChanged: (value) {
            setState(() {
              actualCost = double.tryParse(value);
              isPaid = actualCost != null && actualCost! > 0;
            });
          },
        ),
      ],
    );
  }
  
  Widget _buildPaymentStatus() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bezahlstatus',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => setState(() => isPaid = !isPaid),
            icon: Icon(isPaid ? Icons.check_circle : Icons.circle_outlined),
            label: Text(isPaid ? 'Bezahlt' : 'Nicht bezahlt'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isPaid 
                  ? AppTheme.colorTokens['success'] 
                  : Theme.of(context).colorScheme.outline,
              foregroundColor: isPaid ? Colors.white : null,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildTransportMode() {
    const transportOptions = [
      (TransportMode.driving, '🚗', 'Auto'),
      (TransportMode.walking, '🚶', 'Zu Fuß'),
      (TransportMode.bicycle, '🚲', 'Fahrrad'),
      (TransportMode.publicTransport, '🚌', 'Öffentlich'),
    ];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Verkehrsmittel:',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.5,
          children: transportOptions.map((option) {
            final (mode, icon, label) = option;
            final isSelected = transportMode == mode;
            
            return GestureDetector(
              onTap: () => setState(() => transportMode = mode),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected 
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surface,
                  border: Border.all(
                    color: isSelected 
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outline,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(icon, style: const TextStyle(fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: isSelected ? Colors.white : null,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
  
  Widget _buildHotelEndDate() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.calendar_today, size: 16),
            const SizedBox(width: 8),
            Text(
              'Bis wann bleibst du?',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextFormField(
          readOnly: true,
          decoration: InputDecoration(
            hintText: 'Ende auswählen',
            suffixIcon: const Icon(Icons.date_range),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: widget.selectedDate.add(const Duration(days: 1)),
              firstDate: widget.selectedDate,
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (date != null) {
              setState(() => endDate = date);
            }
          },
          controller: TextEditingController(
            text: endDate?.toString().split(' ')[0] ?? '',
          ),
        ),
      ],
    );
  }
  
  Widget _buildActionButtons() {
    final isComplete = selectedCategory != null && 
                     _nameController.text.isNotEmpty &&
                     (selectedCategory != DestinationCategory.hotel || endDate != null);
    
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Abbrechen'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: isComplete ? _handleCreate : null,
            icon: const Icon(Icons.add),
            label: const Text('Hinzufügen'),
          ),
        ),
      ],
    );
  }
  
  void _handleCreate() {
    if (selectedCategory == null || _nameController.text.isEmpty) return;
    
    final destination = Destination(
      id: const Uuid().v4(),
      tripId: widget.tripId,
      name: _nameController.text,
      location: _locationController.text,
      category: selectedCategory!,
      startDate: widget.selectedDate,
      endDate: endDate ?? widget.selectedDate,
      coordinates: coordinates,
      actualCost: actualCost,
      isPaid: isPaid,
      transportMode: transportMode,
    );
    
    widget.onDestinationCreated(destination);
    Navigator.of(context).pop();
  }
  
  String _getCategoryIcon(DestinationCategory category) {
    switch (category) {
      case DestinationCategory.hotel: return '🏨';
      case DestinationCategory.restaurant: return '🍽️';
      case DestinationCategory.transport: return '⛽';
      case DestinationCategory.attraction: return '🎯';
      case DestinationCategory.shopping: return '🛍️';
      case DestinationCategory.museum: return '🏛️';
      default: return '📍';
    }
  }
  
  String _getCategoryLabel(DestinationCategory category) {
    switch (category) {
      case DestinationCategory.hotel: return 'Hotel';
      case DestinationCategory.restaurant: return 'Restaurant';
      case DestinationCategory.transport: return 'Tankstelle';
      case DestinationCategory.attraction: return 'Sehenswürdigkeit';
      case DestinationCategory.shopping: return 'Shopping';
      case DestinationCategory.museum: return 'Museum';
      default: return 'Andere';
    }
  }
}
```

### 7. Design System (Flutter)

```dart
// lib/presentation/themes/app_theme.dart
class AppTheme {
  // Design Tokens (1:1 aus React App)
  static const Map<String, Color> colorTokens = {
    'primary-sage': Color(0xFF87A96B),
    'primary-ocean': Color(0xFF4A90A4), 
    'primary-sand': Color(0xFFD4B996),
    'secondary-sunset': Color(0xFFCC8B65),
    'secondary-forest': Color(0xFF5F7A61),
    'secondary-sky': Color(0xFF87CEEB),
    'neutral-stone': Color(0xFF8B8680),
    'neutral-cream': Color(0xFFF5F3F0),
    'neutral-charcoal': Color(0xFF36454F),
    'neutral-mist': Color(0xFFE6E4E1),
    'accent-campfire': Color(0xFFD2691E),
    'accent-moss': Color(0xFF8FBC8F),
    'success': Color(0xFF8FBC8F),
    'warning': Color(0xFFCC8B65),
    'error': Color(0xFFDC2626),
  };
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: colorTokens['primary-ocean']!,
      secondary: colorTokens['primary-sage']!,
      surface: Colors.white,
      background: colorTokens['neutral-cream']!,
      outline: colorTokens['neutral-mist']!,
      error: colorTokens['error']!,
    ),
    textTheme: GoogleFonts.interTextTheme(),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: colorTokens['primary-ocean'],
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: colorTokens['primary-ocean'],
        side: BorderSide(color: colorTokens['neutral-mist']!, width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorTokens['neutral-mist']!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorTokens['primary-ocean']!, width: 2),
      ),
      filled: true,
      fillColor: Colors.white,
    ),
  );
  
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.dark(
      primary: colorTokens['primary-ocean']!,
      secondary: colorTokens['primary-sage']!,
      surface: const Color(0xFF2D2D2D),
      background: const Color(0xFF1A1A1A),
      outline: const Color(0xFF404040),
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  );
}
```

### 8. Navigation Structure

```dart
// lib/core/router/app_router.dart
final appRouter = GoRouter(
  initialLocation: '/dashboard',
  redirect: (context, state) {
    final isLoggedIn = ref.read(authStateProvider).when(
      data: (user) => user != null,
      loading: () => false,
      error: (_, __) => false,
    );
    
    final isAuthRoute = state.location.startsWith('/auth');
    
    if (!isLoggedIn && !isAuthRoute) {
      return '/auth/login';
    }
    
    if (isLoggedIn && isAuthRoute) {
      return '/dashboard';
    }
    
    return null;
  },
  routes: [
    GoRoute(
      path: '/auth',
      builder: (context, state) => const AuthWrapperPage(),
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterPage(),
        ),
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) => const ForgotPasswordPage(),
        ),
      ],
    ),
    
    ShellRoute(
      builder: (context, state, child) => MainLayout(child: child),
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardView(),
        ),
        GoRoute(
          path: '/timeline',
          builder: (context, state) => const TimelineView(),
        ),
        GoRoute(
          path: '/timeline/:tripId',
          builder: (context, state) => TimelineView(
            tripId: state.pathParameters['tripId'],
          ),
        ),
        GoRoute(
          path: '/map',
          builder: (context, state) => const MapView(),
        ),
        GoRoute(
          path: '/map/:tripId',
          builder: (context, state) => MapView(
            tripId: state.pathParameters['tripId'],
          ),
        ),
        GoRoute(
          path: '/social',
          builder: (context, state) => const SocialView(),
          routes: [
            GoRoute(
              path: '/feed',
              builder: (context, state) => const SocialFeedView(),
            ),
            GoRoute(
              path: '/users/:userId',
              builder: (context, state) => UserProfileView(
                userId: state.pathParameters['userId']!,
              ),
            ),
            GoRoute(
              path: '/chat',
              builder: (context, state) => const ChatView(),
            ),
            GoRoute(
              path: '/chat/:roomId',
              builder: (context, state) => ChatRoomView(
                roomId: state.pathParameters['roomId']!,
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/budget',
          builder: (context, state) => const BudgetView(),
        ),
        GoRoute(
          path: '/photos',
          builder: (context, state) => const PhotosView(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileView(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsView(),
        ),
      ],
    ),
  ],
  errorBuilder: (context, state) => const ErrorPage(),
);
```

### 9. Authentication Flow

```dart
// lib/presentation/providers/auth_provider.dart
@riverpod
class AuthState extends _$AuthState {
  @override
  FutureOr<User?> build() async {
    final session = SupabaseDataSource.client.auth.currentSession;
    return session?.user;
  }
  
  Future<void> signIn(String email, String password) async {
    state = const AsyncLoading();
    
    try {
      final response = await SupabaseDataSource.client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      if (response.user != null) {
        state = AsyncData(response.user);
      } else {
        state = AsyncError('Login failed', StackTrace.current);
      }
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
    }
  }
  
  Future<void> signUp(String email, String password) async {
    state = const AsyncLoading();
    
    try {
      final response = await SupabaseDataSource.client.auth.signUp(
        email: email,
        password: password,
      );
      
      if (response.user != null) {
        state = AsyncData(response.user);
      } else {
        state = AsyncError('Registration failed', StackTrace.current);
      }
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
    }
  }
  
  Future<void> signOut() async {
    await SupabaseDataSource.client.auth.signOut();
    state = const AsyncData(null);
  }
  
  Future<void> signInWithGoogle() async {
    state = const AsyncLoading();
    
    try {
      await SupabaseDataSource.client.auth.signInWithOAuth(
        Provider.google,
        redirectTo: EnvironmentConfig.redirectUrl,
      );
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
    }
  }
}

// lib/presentation/pages/auth/login_page.dart
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo/Branding
                Container(
                  height: 120,
                  width: 120,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.colorTokens['primary-ocean']!,
                        AppTheme.colorTokens['primary-sage']!,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(
                    Icons.map,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
                
                const SizedBox(height: 32),
                
                Text(
                  'Willkommen bei Trailkeeper',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 8),
                
                Text(
                  'Plane deine perfekte Reise',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 48),
                
                // Email Field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value?.isEmpty ?? true) return 'Email ist erforderlich';
                    if (!value!.contains('@')) return 'Ungültige Email';
                    return null;
                  },
                ),
                
                const SizedBox(height: 16),
                
                // Password Field
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Passwort',
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                  validator: (value) {
                    if (value?.isEmpty ?? true) return 'Passwort ist erforderlich';
                    if (value!.length < 6) return 'Mindestens 6 Zeichen';
                    return null;
                  },
                ),
                
                const SizedBox(height: 24),
                
                // Login Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: authState.isLoading ? null : _handleLogin,
                    child: authState.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Anmelden'),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Google Sign In
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: authState.isLoading ? null : _handleGoogleSignIn,
                    icon: const Icon(Icons.g_mobiledata),
                    label: const Text('Mit Google anmelden'),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Links
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () => context.go('/auth/register'),
                      child: const Text('Konto erstellen'),
                    ),
                    TextButton(
                      onPressed: () => context.go('/auth/forgot-password'),
                      child: const Text('Passwort vergessen?'),
                    ),
                  ],
                ),
                
                // Error Display
                if (authState.hasError) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.error,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            authState.error.toString(),
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  void _handleLogin() {
    if (_formKey.currentState?.validate() ?? false) {
      ref.read(authStateProvider.notifier).signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );
    }
  }
  
  void _handleGoogleSignIn() {
    ref.read(authStateProvider.notifier).signInWithGoogle();
  }
}
```

## 📅 Development Roadmap & Prioritäten

### Phase 1: Foundation (Wochen 1-2)
- [ ] **Flutter Projekt Setup** mit Environment Configuration
- [ ] **Supabase Integration** mit geteilter Datenbasis
- [ ] **Authentication Flow** (Email + OAuth)
- [ ] **Core Data Models** und Repository Pattern
- [ ] **Design System** Implementation
- [ ] **Navigation Structure** mit Go Router

### Phase 2: Core Features (Wochen 3-5)
- [ ] **Trip Management** - CRUD Operations
- [ ] **Native Destination Creator** (1:1 aus React App)
- [ ] **Timeline View** mit horizontalem Layout
- [ ] **Maps Integration** mit OpenStreetMap
- [ ] **Offline Support** mit Hive
- [ ] **Budget Tracking** Features

### Phase 3: Advanced Features (Wochen 6-8)
- [ ] **Social Features** - Profiles, Following, Friends
- [ ] **Photo Management** - Upload, Galleries, Sharing
- [ ] **Real-time Chat** System
- [ ] **Push Notifications**
- [ ] **Export Functionality**
- [ ] **Advanced Filtering** und Search

### Phase 4: Polish & Launch (Wochen 9-10)
- [ ] **Performance Optimization**
- [ ] **UI/UX Refinements**
- [ ] **Testing** (Unit, Widget, Integration)
- [ ] **Platform-specific Features** (iOS/Android)
- [ ] **App Store Deployment**

## 🔄 Daten-Synchronisation

### Shared Database Schema:
```sql
-- Geteilte Tabellen zwischen React & Flutter
- trips (owner_id, name, start_date, end_date, privacy, etc.)
- destinations (trip_id, name, location, category, actual_cost, etc.)  
- user_profiles (id, nickname, avatar_url, bio, etc.)
- photo_shares (user_id, trip_id, photo_url, privacy, etc.)
- chat_rooms, chat_messages, chat_participants
- friendships (user1_id, user2_id, status)
- user_activities (activity feed)
```

### Environment Management:
- **Development:** `lsztvtauiapnhqplapgb.supabase.co` (Test-Daten)
- **Production:** `kyzbtkkprvegzgzrlhez.supabase.co` (Live-Daten)
- **Build Flavors:** Separate App-Bundle für Test/Prod

### Real-time Sync Features:
- **Supabase Realtime** für Live-Updates zwischen React & Flutter
- **Conflict Resolution** bei gleichzeitigen Änderungen
- **Offline-First** Architektur mit automatischer Synchronisation

## 🎯 Besondere Anforderungen

### Native Mobile Features:
- **Push Notifications** für Trip Updates, Chat Messages
- **Camera Integration** für Photo Upload
- **GPS/Location Services** für Route Tracking
- **Biometric Authentication** (Face ID, Fingerprint)
- **App Shortcuts** und Widgets
- **Share Extension** für externe Content

### Performance Ziele:
- **App Startup:** < 3 Sekunden (Cold Start)
- **Navigation:** < 200ms zwischen Screens
- **Map Rendering:** < 1 Sekunde für komplexe Routes
- **Image Loading:** Progressive mit Placeholders
- **Memory Usage:** < 150MB average

### Platform Integration:
- **iOS:** Native Share Sheet, Haptic Feedback, SF Symbols
- **Android:** Material You Theming, Adaptive Icons, Edge-to-Edge

## 📚 Testing Strategy

### Unit Tests:
```dart
// test/domain/entities/destination_test.dart
// test/data/repositories/trip_repository_test.dart
// test/presentation/providers/auth_provider_test.dart
```

### Widget Tests:
```dart
// test/presentation/widgets/native_destination_creator_test.dart
// test/presentation/pages/timeline_view_test.dart
```

### Integration Tests:
```dart
// integration_test/app_test.dart
// integration_test/auth_flow_test.dart
// integration_test/trip_creation_test.dart
```

## 🚀 Deployment

### Build Configuration:
```yaml
# android/app/build.gradle
android {
    defaultConfig {
        // App ID unterschiedlich für Environments
        applicationIdSuffix '.dev' // nur für development
    }
    
    buildTypes {
        debug {
            applicationIdSuffix '.debug'
            debuggable true
        }
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
    
    flavorDimensions "environment"
    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
        }
        production {
            dimension "environment"
        }
    }
}
```

### App Store Metadata:
- **Name:** Trailkeeper - Vacation Planner
- **Kategorie:** Travel & Local
- **Keywords:** vacation, travel, planning, itinerary, maps
- **Beschreibung:** [Detailed app description]
- **Screenshots:** [Required screenshots for all device sizes]

---

**Ende der Spezifikation**

Diese umfassende Spezifikation bietet eine vollständige Roadmap für die Entwicklung einer Flutter-Version der Trailkeeper App mit vollständiger Feature-Parität zur React Web-App und geteilter Supabase-Datenbasis.