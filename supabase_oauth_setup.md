# Supabase OAuth Setup Guide

## 🚨 OAuth Provider Setup erforderlich

Der Fehler `"Unsupported provider: provider is not enabled"` bedeutet, dass die OAuth-Provider noch nicht in Supabase aktiviert sind.

## 📋 Setup-Schritte

### 1. Supabase Dashboard öffnen
1. Gehe zu [supabase.com](https://supabase.com)
2. Logge dich ein und öffne dein Projekt
3. Navigiere zu **Authentication** → **Providers**

### 2. Google OAuth aktivieren

1. **In Supabase Dashboard:**
   - Gehe zu Authentication → Providers
   - Klicke auf **Google** Provider
   - Aktiviere "Enable sign in with Google"
   
2. **Google Cloud Console Setup:**
   - Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
   - Erstelle ein neues Projekt oder wähle ein existierendes
   - Aktiviere die "Google+ API"
   - Gehe zu "Credentials" und erstelle OAuth 2.0 Client ID
   - **Application type**: Web application
   - **Authorized redirect URIs**:
     ```
     https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
     ```
   
3. **In Supabase eintragen:**
   - Client ID: Aus Google Cloud Console
   - Client Secret: Aus Google Cloud Console

### 3. Apple OAuth aktivieren (Optional)

1. **In Supabase Dashboard:**
   - Gehe zu Authentication → Providers  
   - Klicke auf **Apple** Provider
   - Aktiviere "Enable sign in with Apple"

2. **Apple Developer Setup:**
   - Gehe zu [Apple Developer](https://developer.apple.com/)
   - Erstelle eine App ID mit "Sign in with Apple" Capability
   - Erstelle einen Services ID
   - **Return URLs**:
     ```
     https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
     ```

3. **In Supabase eintragen:**
   - Client ID: Services ID aus Apple Developer
   - Client Secret: Generiert aus Private Key

### 4. Email Provider aktivieren (Fallback)

Für sofortigen Test kannst du auch Email/Password Auth aktivieren:

1. Gehe zu Authentication → Providers
2. Aktiviere **Email** Provider
3. Konfiguriere Email Templates falls gewünscht

## 🔧 Temporäre Lösung: Demo Mode

Bis die OAuth-Provider konfiguriert sind, nutzen beide Apps den Demo-Modus mit placeholder credentials.

### React App Demo Mode:
- Automatisch aktiv wenn `isUsingPlaceholderCredentials = true`
- Login-Buttons führen direkt zur Dashboard

### Flutter App Demo Mode:
- `AuthService.isUsingPlaceholderCredentials` auf `true` setzen
- Login führt direkt zur Haupt-App

## 🧪 Testing nach Setup

Nach der Provider-Konfiguration:

1. **React App testen**: http://localhost:3000
   - Login-Seite sollte erscheinen
   - Google/Apple Buttons sollten OAuth-Flow starten

2. **Flutter App testen**: http://localhost:8080  
   - Login-Screen sollte erscheinen
   - OAuth-Buttons sollten funktionieren

## 📱 Mobile App Konfiguration

Für die Flutter Mobile App (nicht Web) sind zusätzlich erforderlich:

### iOS (Apple)
```xml
<!-- ios/Runner/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>supabase-auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.vacation.planner</string>
    </array>
  </dict>
</array>
```

### Android
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name="io.supabase.flutter.SupabaseAuthActivity"
          android:exported="true"
          android:launchMode="singleTop">
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.vacation.planner" />
  </intent-filter>
</activity>
```

## 🚀 Next Steps

1. **Sofort**: OAuth-Provider in Supabase Dashboard aktivieren
2. **Dann**: Database Migration SQL ausführen
3. **Schließlich**: Vollständigen Auth-Flow testen

Bei Problemen können wir auch erstmal nur Email/Password Authentication verwenden, bis OAuth konfiguriert ist.