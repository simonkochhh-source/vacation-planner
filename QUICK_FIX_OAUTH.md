# 🚨 OAuth Provider Fehler - Schnelle Lösung

## Problem
```
GET https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/authorize?provider=google 400 (Bad Request)
```

## ⚡ Sofortige Lösung: Email Authentication verwenden

### 1. Email Provider in Supabase aktivieren

**Gehe zu deinem Supabase Dashboard:**

1. **Öffne**: https://supabase.com/dashboard
2. **Projekt auswählen**: `kyzbtkkprvegzgzrlhez` 
3. **Navigiere zu**: Authentication → Providers
4. **Aktiviere Email Provider**:
   - Klicke auf "Email" Provider
   - Toggle "Enable email sign in" auf **ON**
   - Klicke "Save"

### 2. React App testen

1. **Öffne**: http://localhost:3000
2. **Ignoriere Google/Apple Buttons** (zeigen OAuth-Fehler)
3. **Klicke**: "Continue with Email" 
4. **Erstelle Test-Account**: 
   - Email: `test@example.com`
   - Password: `TestPassword123`
5. **Klicke**: "Sign Up"

### 3. Bestätigungs-Email (Optional deaktivieren)

Wenn Email-Bestätigung stört:

1. **Supabase Dashboard** → Authentication → Settings
2. **Email Confirmation**: Deaktivieren für Development
3. **Save**

## 🔧 OAuth Provider später aktivieren

### Google OAuth Setup (Optional)

1. **Google Cloud Console**: https://console.cloud.google.com/
2. **Neues Projekt erstellen** oder existierendes wählen
3. **APIs & Services** → **Credentials**
4. **Create Credentials** → **OAuth 2.0 Client ID**
5. **Application type**: Web application
6. **Authorized redirect URIs**: 
   ```
   https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
   ```
7. **Copy Client ID und Client Secret**

8. **Zurück zu Supabase**:
   - Authentication → Providers → Google
   - Enable toggle ON
   - Client ID einfügen
   - Client Secret einfügen
   - Save

### Apple OAuth Setup (Optional)

Ähnlich, aber mit Apple Developer Account erforderlich.

## 🎯 Empfohlener Workflow

**Für Development:**
1. ✅ Email Authentication verwenden (funktioniert sofort)
2. ⏳ OAuth später für Production aktivieren

**Für Production:**
1. ✅ OAuth Provider konfigurieren  
2. ✅ Email als Backup behalten

## 🚀 Test Commands

```bash
# React App
cd /Users/si.koch/Documents/Claude Projekte/Urkaubsplanung/vacation-planner
npm start
# → http://localhost:3000

# Flutter App  
cd /Users/si.koch/Documents/Claude Projekte/Urkaubsplanung/vacation_planner_mobile
flutter run -d web-server --web-port=8080
# → http://localhost:8080
```

## 📊 Status Check

- ✅ Email/Password Auth: Funktioniert sofort nach Aktivierung
- ⏳ Google OAuth: Benötigt Google Cloud Setup
- ⏳ Apple OAuth: Benötigt Apple Developer Setup
- ✅ Demo Mode: Funktioniert immer (placeholder credentials)

**Nutze erstmal Email Authentication - das ist die schnellste Lösung!** 🎯