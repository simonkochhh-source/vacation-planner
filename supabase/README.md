# Supabase Database Migrations

Diese Migrations erweitern Trailkeeper um ein vollständiges User-Management-System mit Nickname-Support und Trip-Sharing-Funktionalität.

## Migrations Übersicht

### 001_create_users_table.sql
**Zweck**: Erstellt eine erweiterte User-Tabelle mit Nickname-System und Suchfunktionalität

**Features**:
- ✅ Erweiterte User-Profile mit Nicknames
- ✅ Automatische Nickname-Generierung aus E-Mail
- ✅ User-Suche nach Nickname und Display Name
- ✅ Privacy-Einstellungen (öffentlich/privat)
- ✅ Row Level Security (RLS) Policies
- ✅ Automatische User-Erstellung bei Auth-Registrierung

**Wichtige Tabellen/Funktionen**:
- `public.users` - Erweiterte User-Profile
- `public.public_users` - View für öffentliche User-Daten
- `public.search_users()` - User-Suchfunktion
- `public.handle_new_user()` - Automatische User-Erstellung

### 002_sync_database_structure.sql
**Zweck**: Synchronisiert bestehende Trip-Struktur mit User-System und fügt Sharing-Funktionalität hinzu

**Features**:
- ✅ Trip-Ownership (ownerId) Integration
- ✅ Trip-Sharing mit Tagged Users
- ✅ Privacy-Einstellungen (private/public)
- ✅ Trip-Zugriffskontrolle und RLS
- ✅ Public Trip Search
- ✅ Notification-System für geteilte Trips

**Wichtige Funktionen**:
- `public.user_has_trip_access()` - Zugriffsberechtigungen prüfen
- `public.get_user_trips()` - Alle zugänglichen Trips für User
- `public.search_public_trips()` - Öffentliche Trip-Suche
- `public.get_trip_sharing_info()` - Trip-Sharing-Details

## Installation

### 1. Supabase CLI installieren
```bash
npm install -g supabase
```

### 2. Projekt initialisieren
```bash
cd vacation-planner
supabase init
```

### 3. Mit Supabase-Projekt verbinden
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Migrations ausführen
```bash
# Alle Migrations ausführen
supabase db push

# Oder einzeln:
supabase db push migrations/001_create_users_table.sql
supabase db push migrations/002_sync_database_structure.sql
```

### 5. TypeScript-Typen generieren
```bash
supabase gen types typescript --local > src/types/supabase.ts
```

## Verwendung

### User-Suche
```typescript
import { userService } from './services/userService';

// Benutzer suchen
const users = await userService.searchUsers('nickname');

// Benutzer-Profil laden
const profile = await userService.getCurrentUserProfile();

// Profil aktualisieren
await userService.updateUserProfile({
  nickname: 'neuer_nickname',
  display_name: 'Neuer Name',
  is_profile_public: true
});
```

### Trip-Sharing
```typescript
import { TripSharingManager } from './components/Trip/TripSharingManager';

// In React Component:
<TripSharingManager 
  trip={currentTrip}
  onTripUpdate={(updatedTrip) => {
    // Trip-Update verarbeiten
  }}
/>
```

### User-Suche Component
```typescript
import { UserSearchComponent } from './components/User/UserSearchComponent';

<UserSearchComponent
  onUserSelect={(user) => {
    // Ausgewählten User verarbeiten
  }}
  placeholder="Nach Benutzern suchen..."
  excludeUserIds={[currentUserId]}
/>
```

## Datenschutz & Sicherheit

### Row Level Security (RLS)
Alle Tabellen sind mit RLS gesichert:

- **Users**: Benutzer sehen nur eigene Profile und öffentliche Profile
- **Trips**: Benutzer sehen nur eigene, geteilte und öffentliche Trips
- **Notifications**: Benutzer sehen nur eigene Benachrichtigungen

### Privacy-Einstellungen
- **Profile**: Öffentlich/Privat sichtbar
- **Trips**: Private/Öffentliche Sichtbarkeit
- **Sharing**: Kontrollierte Freigabe an spezifische User

## Fehlerbehebung

### Migration-Fehler
```bash
# Status überprüfen
supabase status

# Lokale DB zurücksetzen
supabase db reset

# Remote-Schema überprüfen
supabase db diff
```

### User-Erstellung funktioniert nicht
1. Überprüfen Sie, ob der Trigger `on_auth_user_created` aktiv ist
2. Prüfen Sie die Auth-User-Tabelle auf neue Einträge
3. Überprüfen Sie die Logs: `supabase logs`

### Nickname-Konflikte
Die automatische Nickname-Generierung behandelt Konflikte durch Anhängen von Zahlen:
- `benutzer` → `benutzer1` → `benutzer2` etc.

## Weitere Informationen

### User-Service API
Siehe `src/services/userService.ts` für vollständige API-Dokumentation.

### UI-Komponenten
- `UserProfileManager` - Profil-Verwaltung
- `UserSearchComponent` - User-Suche
- `TripSharingManager` - Trip-Sharing

### Nützliche SQL-Queries

```sql
-- Alle User mit öffentlichen Profilen
SELECT * FROM public.public_users;

-- Trip-Sharing-Info für einen Trip
SELECT * FROM public.get_trip_sharing_info('trip-uuid');

-- User-Trips für einen bestimmten User
SELECT * FROM public.get_user_trips('user-uuid');

-- Öffentliche Trips suchen
SELECT * FROM public.search_public_trips('München');
```