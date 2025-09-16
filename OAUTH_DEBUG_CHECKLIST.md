# 🔍 OAuth Debug Checklist - Bad Request 400

## Problem
Google Login zeigt **Bad Request (400)** statt Google Dialog zu öffnen.

## ✅ Schritt-für-Schritt Diagnose

### 1. Supabase Provider Status überprüfen

**Gehe zu deinem Supabase Dashboard:**
1. **URL**: https://supabase.com/dashboard/project/kyzbtkkprvegzgzrlhez
2. **Navigation**: Authentication → Providers
3. **Google Provider checken**:
   - ❓ Ist der Toggle **"Enable sign in with Google"** auf **ON**?
   - ❓ Sind **Client ID** und **Client Secret** ausgefüllt?
   - ❓ Steht dort die **Redirect URL**: `https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback`?

**Screenshot machen und Status teilen!**

### 2. Google Cloud Console überprüfen

**Gehe zu**: https://console.cloud.google.com/apis/credentials
1. **OAuth 2.0 Client IDs** - existiert ein Client?
2. **Authorized redirect URIs** - steht dort:
   ```
   https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
   ```

### 3. Browser Network Tab analysieren

**In Chrome/Firefox:**
1. **F12** → **Network Tab** öffnen
2. **Google Login Button** klicken
3. **Fehlgeschlagene Requests** finden:
   - Welche URL wird aufgerufen?
   - Welcher exakte Fehlercode/Message?

## 🚀 Wahrscheinliche Ursachen

### Ursache A: Provider nicht aktiviert
**Lösung**: Supabase Dashboard → Authentication → Providers → Google → Enable ON

### Ursache B: Falsche Redirect URI
**Problem**: Google Cloud Console hat falsche/fehlende Redirect URI
**Lösung**: 
```
https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
```

### Ursache C: Client Credentials fehlen
**Problem**: Client ID/Secret nicht in Supabase eingegeben
**Lösung**: Google Cloud Credentials in Supabase Dashboard eintragen

### Ursache D: OAuth Consent Screen nicht konfiguriert
**Problem**: Google Cloud OAuth Consent Screen fehlt
**Lösung**: APIs & Services → OAuth consent screen konfigurieren

## 🛠️ Sofortiger Fix-Versuch

### Option 1: Email Authentication nutzen
```bash
# Teste erstmal Email Auth:
1. http://localhost:3000
2. "Continue with Email" klicken
3. Account erstellen: test@example.com / TestPassword123
```

### Option 2: Provider Status checken
```bash
# Supabase SQL Editor:
SELECT * FROM auth.providers WHERE provider = 'google';
```

## 📋 Info benötigt

**Teile mit:**
1. ✅ Ist Google Provider in Supabase Dashboard aktiviert? (Screenshot)
2. ✅ Existiert Google Cloud OAuth Client? (Screenshot)
3. ✅ Welche exakte Error Message im Browser Network Tab?
4. ✅ Welche URL wird beim Klick aufgerufen?

**Mit diesen Infos kann ich das Problem sofort lösen!** 🎯