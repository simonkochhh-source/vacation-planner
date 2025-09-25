# 🌍 Environment Management System

## Übersicht

Dieses Projekt verwendet ein Multi-Environment System für saubere Mandantentrennung zwischen Development und Production:

- **Development**: Localhost mit Dev/Test Supabase Projekt
- **Production**: Vercel Deployment mit Production Supabase Projekt

## 🏗️ Environment Struktur

### Environment Dateien

| Datei | Zweck | Verwendung |
|-------|-------|------------|
| `.env` | **Aktive Konfiguration** | Wird von React gelesen |
| `.env.development` | Development Template | Dev/Test Supabase Projekt |
| `.env.production` | Production Template | Production Supabase Projekt |
| `.env.local` | Local Overrides | Überschreibt .env (optional) |
| `.env.backup` | Sicherung | Backup der letzten .env |

### Supabase Projekte

| Environment | Supabase Projekt | URL | Zweck |
|-------------|------------------|-----|-------|
| **Development** | Vacation Planner Dev | `lsztvtauiapnhqplapgb.supabase.co` | Localhost Testing |
| **Production** | Vacation Planner | `kyzbtkkprvegzgzrlhez.supabase.co` | Live App |

## 🚀 Verwendung

### Quick Commands (über npm)

```bash
# Development Environment aktivieren + starten
npm run dev

# Production Environment aktivieren + starten  
npm run prod

# Current Environment Status anzeigen
npm run env:status

# Nur Environment wechseln (ohne starten)
npm run env:dev    # zu Development
npm run env:prod   # zu Production

# Production Build
npm run build:prod
```

### Manual Commands (Bash Scripts)

```bash
# Environment Status prüfen
./scripts/env-status.sh

# Zu Development wechseln
./scripts/env-dev.sh
npm start

# Zu Production wechseln
./scripts/env-prod.sh
npm start
```

## 🔧 Environment Features

### Development Environment
- ✅ **Dev Supabase Projekt** (lsztvtauiapnhqplapgb)
- ✅ **Debug Mode** aktiviert
- ✅ **Source Maps** generiert
- ✅ **Mock Places** für Testing
- ✅ **Development Tools** sichtbar
- ✅ **Error Tolerance** erhöht

### Production Environment  
- ✅ **Production Supabase Projekt** (kyzbtkkprvegzgzrlhez)
- ✅ **Optimierte Performance**
- ✅ **Keine Source Maps**
- ✅ **Echte APIs**
- ✅ **Production Security**
- ✅ **Error Handling** strikt

## 🔑 OAuth Konfiguration

### Development OAuth Setup

Da das Development Environment das Dev Supabase Projekt verwendet, muss OAuth dort separat konfiguriert werden:

1. **Gehe zu Dev Dashboard:**
   ```
   https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb
   ```

2. **Authentication → Providers → Google:**
   - ✅ Enable Google OAuth
   - ✅ Client ID aus Google Cloud Console
   - ✅ Client Secret aus Google Cloud Console

3. **Site URL konfigurieren:**
   ```
   http://localhost:3000
   http://localhost:3001
   ```

4. **Redirect URLs hinzufügen:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```

### Production OAuth (bereits konfiguriert)
- ✅ Google OAuth funktioniert
- ✅ Vercel Domains konfiguriert
- ✅ Production URLs eingerichtet

## 📋 Workflow Beispiele

### Lokale Development
```bash
# 1. Development Environment aktivieren
npm run env:dev

# 2. Schema in Dev DB sicherstellen (falls nötig)
# Supabase Dashboard: lsztvtauiapnhqplapgb/sql
# Execute: database/CRITICAL-DEV-SYNC-FIXED.sql

# 3. OAuth in Dev DB konfigurieren
# Dashboard: Authentication → Providers → Google

# 4. App starten
npm start
```

### Production Testing
```bash
# 1. Production Environment aktivieren
npm run env:prod

# 2. App starten (nutzt Production DB)
npm start

# 3. Testen auf localhost (mit Production Daten)
```

### Deployment (Vercel)
```bash
# 1. Production Build erstellen
npm run build:prod

# 2. Deploy
# Vercel liest .env.production automatisch
```

## 🔍 Troubleshooting

### Problem: OAuth funktioniert nicht in Development
**Lösung:**
1. `npm run env:status` - prüfe aktive Environment
2. Falls Development: OAuth in Dev Supabase Dashboard konfigurieren
3. Database Schema mit `CRITICAL-DEV-SYNC-FIXED.sql` synchronisieren

### Problem: Falsche Database wird verwendet
**Lösung:**
```bash
npm run env:status  # Status prüfen
npm run env:dev     # oder npm run env:prod
npm start           # neu starten
```

### Problem: Environment wechselt nicht
**Lösung:**
- `.env.local` kann `.env` überschreiben
- Temporär `.env.local` umbenennen zum Testen

## 🎯 Vorteile

✅ **Klare Mandantentrennung** zwischen Dev und Prod  
✅ **Einfaches Switching** zwischen Environments  
✅ **Sichere Production** ohne Dev-Daten  
✅ **Isolierte Testing** in Dev Environment  
✅ **Automatische Builds** für Deployment  
✅ **Konsistente Konfiguration** über Scripts  

## 📁 File Structure

```
vacation-planner/
├── .env                    # Aktive Konfiguration
├── .env.development       # Dev Template  
├── .env.production        # Prod Template
├── .env.local             # Local Overrides (optional)
├── .env.backup           # Backup (automatisch)
├── scripts/
│   ├── env-dev.sh        # Switch to Dev
│   ├── env-prod.sh       # Switch to Prod
│   └── env-status.sh     # Status Check
└── ENVIRONMENT-SETUP.md  # This file
```

Das System ermöglicht saubere Entwicklung mit separaten Datenbanken und einfaches Environment-Management! 🚀