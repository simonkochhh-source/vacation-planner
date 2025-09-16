# 🔧 Supabase Environment Setup - Schritt für Schritt

## Problem
Die `.env` Datei enthält noch Placeholder-Werte statt echter Supabase-Credentials.

## Lösung: Echte Credentials einfügen

### 1. Supabase-Dashboard öffnen
Gehen Sie zu: https://supabase.com/dashboard

### 2. Ihr Projekt auswählen
- Wählen Sie Ihr erstelltes Projekt aus
- Klicken Sie auf "Settings" (Zahnrad-Symbol)
- Klicken Sie auf "API"

### 3. Credentials kopieren
Sie finden dort:
- **Project URL**: `https://abcdefghijklmnop.supabase.co`
- **anon/public key**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSI...`

### 4. .env Datei aktualisieren
Ersetzen Sie in der `.env` Datei:

**VORHER (Placeholder):**
```
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**NACHHER (Ihre echten Werte):**
```
REACT_APP_SUPABASE_URL=https://ihre-echte-projekt-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=ihr_echter_anon_key_hier
```

### 5. Development Server neustarten
```bash
# Server stoppen (Ctrl+C)
# Dann neu starten:
npm start
```

## ⚠️ Wichtige Hinweise

- **Niemals committen**: Die `.env` Datei sollte in `.gitignore` stehen
- **Nur anon/public key**: Niemals den "service_role" key verwenden
- **Projekt-URL Format**: Immer `https://projektid.supabase.co` (ohne /rest/v1)

## 🧪 Test der Integration

Nach dem Update sollten Sie in der Browser-Konsole sehen:
- ✅ Keine "placeholder credentials" Warnung mehr
- ✅ Supabase-API Calls an Ihre echte URL
- ✅ Daten werden in Supabase gespeichert statt LocalStorage

## 🚀 Erwartetes Verhalten

1. **App startet** ohne Supabase-Warnungen
2. **Neue Reise erstellen** → Wird in Supabase gespeichert
3. **Browser-Tab 2 öffnen** → Reise erscheint automatisch (Real-time Sync)
4. **Supabase Dashboard** → Daten sind in den Tabellen sichtbar