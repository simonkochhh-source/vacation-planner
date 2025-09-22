# Avatar Upload Setup

Diese Anleitung erklärt, wie die Avatar-Upload-Funktionalität in Trailkeeper eingerichtet wird.

## 🎯 Funktionalität

- **Profilbild hochladen**: Benutzer können eigene Avatare hochladen
- **Automatische Größenanpassung**: Verschiedene Größen (small, medium, large)
- **Sichere Speicherung**: Supabase Storage mit RLS-Policies
- **Benutzerfreundlich**: Drag & Drop, Vorschau, Fehlermeldungen

## 🔧 Setup-Schritte

### 1. Supabase Storage einrichten

```sql
-- Führe diese Migration aus: supabase/migrations/004_create_avatar_storage.sql
-- Erstellt Storage-Bucket (Policies müssen manuell erstellt werden)
```

### 2. Storage-Bucket Konfiguration

1. Gehe zu deinem Supabase Dashboard
2. Navigiere zu **Storage** → **Buckets**
3. Überprüfe, dass der `avatars` Bucket erstellt wurde
4. Stelle sicher, dass er als "Public" markiert ist

### 3. RLS-Policies manuell erstellen

Da Storage-Policies spezielle Berechtigungen erfordern, erstelle sie manuell:

1. Gehe zu **Storage** → **Policies**
2. Klicke auf **"New Policy"**
3. Erstelle diese 4 Policies:

#### Policy 1: Upload erlauben
- **Name**: `Users can upload own avatars`
- **Command**: `INSERT`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 2: Update erlauben
- **Name**: `Users can update own avatars`
- **Command**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 3: Delete erlauben
- **Name**: `Users can delete own avatars`
- **Command**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 4: Öffentliches Anzeigen
- **Name**: `Anyone can view avatars`
- **Command**: `SELECT`
- **Target roles**: `anon, authenticated`
- **USING expression**:
```sql
bucket_id = 'avatars'
```

### 4. Komponenten verwenden

```tsx
import AvatarUpload from './components/User/AvatarUpload';

// Editierbar (für Profil-Einstellungen)
<AvatarUpload 
  currentAvatarUrl={user.avatar_url}
  size="large"
  editable={true}
  onAvatarUpdate={(newUrl) => console.log('New avatar:', newUrl)}
/>

// Nur anzeigen (für User-Listen)
<AvatarUpload 
  currentAvatarUrl={user.avatar_url}
  size="small"
  editable={false}
/>
```

## 📁 Dateistruktur

```
storage/
└── avatars/
    ├── user-id-1-timestamp.jpg
    ├── user-id-2-timestamp.png
    └── ...
```

## 🛡️ Sicherheit

- **Benutzer-Isolation**: Jeder User kann nur seine eigenen Avatare verwalten
- **Dateityp-Validierung**: Nur Bilddateien erlaubt
- **Größenbegrenzung**: Maximum 5MB pro Datei
- **Automatische Bereinigung**: Alte Avatare werden beim Upload neuer gelöscht

## 🎨 Verwendung in der App

Die Avatar-Funktionalität ist bereits in folgenden Komponenten integriert:

1. **UserProfileManager**: Große, editierbare Avatare für Profil-Einstellungen
2. **TripSharingManager**: Kleine Avatare bei Trip-Teilnehmern
3. **UserSearchComponent**: Kleine Avatare in Suchergebnissen

## 🔍 Troubleshooting

### Problem: Upload schlägt fehl
- ✅ Überprüfe, ob der Storage-Bucket existiert
- ✅ Stelle sicher, dass RLS-Policies korrekt sind
- ✅ Überprüfe die Dateigröße (max 5MB)
- ✅ Überprüfe den Dateityp (nur Bilder)

### Problem: Avatare werden nicht angezeigt
- ✅ Überprüfe, ob der Bucket als "Public" markiert ist
- ✅ Teste die URL direkt im Browser
- ✅ Überprüfe die Netzwerk-Konsole auf Fehler

### Problem: Permission Denied
- ✅ Überprüfe, ob die RLS-Policies korrekt erstellt wurden
- ✅ Stelle sicher, dass der Benutzer authentifiziert ist
- ✅ Überprüfe die Bucket-Berechtigungen

## 💡 Erweiterungen

Zukünftige Verbesserungen könnten beinhalten:
- Automatische Bildkomprimierung
- Mehrere Bildgrößen (Thumbnails)
- Bulk-Upload für Reise-Fotos
- Integration mit externen Bildquellen