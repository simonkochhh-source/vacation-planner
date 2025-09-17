# Production OAuth Setup für Supabase

## Problem
Das Google SSO funktioniert nur auf localhost:3000, aber nicht auf anderen Domains/IPs in der Produktion.

## Lösung

### 1. Supabase Dashboard Konfiguration

Gehe zu deinem Supabase Projekt: https://supabase.com/dashboard/

**Authentication → URL Configuration:**

Füge folgende URLs hinzu:

```
Site URL: https://deine-domain.com
```

**Zusätzliche Redirect URLs:**
```
http://localhost:3000/dashboard
https://deine-domain.com/dashboard
https://www.deine-domain.com/dashboard
http://deine-ip-adresse:3000/dashboard
https://deine-ip-adresse/dashboard
```

### 2. Google Cloud Console Konfiguration

Gehe zu: https://console.cloud.google.com/apis/credentials

**OAuth 2.0 Client IDs → Dein Client → Autorisierte Redirect-URIs:**

```
https://kyzbtkkprvegzgzrlhez.supabase.co/auth/v1/callback
```

**Autorisierte JavaScript-Ursprünge:**
```
http://localhost:3000
https://deine-domain.com
https://www.deine-domain.com
http://deine-ip-adresse:3000
https://deine-ip-adresse
```

### 3. Code-Änderungen (bereits implementiert)

Die App wurde aktualisiert, um dynamisch die korrekte Redirect-URL zu verwenden:

```typescript
// Dynamische URL-Erkennung
const getRedirectUrl = () => {
  const origin = window.location.origin;
  return `${origin}/dashboard`;
};

// Verwendung in OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getRedirectUrl(),
  },
});
```

### 4. Umgebungsvariablen

Stelle sicher, dass die Produktionsumgebung die korrekten Supabase-Credentials hat:

```env
REACT_APP_SUPABASE_URL=https://kyzbtkkprvegzgzrlhez.supabase.co
REACT_APP_SUPABASE_ANON_KEY=dein_anon_key
```

### 5. Deployment-Checkliste

- [ ] Supabase Site URL aktualisiert
- [ ] Supabase Redirect URLs hinzugefügt
- [ ] Google OAuth Redirect URIs aktualisiert
- [ ] Google JavaScript-Ursprünge hinzugefügt
- [ ] Umgebungsvariablen in Produktion gesetzt
- [ ] App neu deployed

### 6. Testing

Nach der Konfiguration teste:

1. **Localhost**: http://localhost:3000
2. **Deine Domain**: https://deine-domain.com
3. **IP-Adresse**: http://deine-ip:port

### 7. Häufige Probleme

**"redirect_uri_mismatch"**
- Prüfe Google Console Redirect URIs
- Prüfe Supabase Redirect URLs

**"invalid_request"**
- Prüfe Supabase Site URL
- Prüfe dass alle URLs korrekt sind

**"unauthorized_client"**
- Prüfe Google OAuth Client Configuration
- Prüfe dass der Client für Web Application konfiguriert ist

### 8. Debug-Logs

Die App loggt jetzt ausführlich die verwendeten URLs:

```
🔗 Auth: Current origin: https://deine-domain.com
🔗 Auth: Current hostname: deine-domain.com
🔗 Auth: Current protocol: https:
🔗 Auth: Redirect URL: https://deine-domain.com/dashboard
```

Prüfe diese Logs in der Browser-Konsole, um sicherzustellen, dass die korrekten URLs verwendet werden.