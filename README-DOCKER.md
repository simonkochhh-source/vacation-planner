# 🐳 Docker Setup für Vacation Planner

## Übersicht

Dieses Setup ermöglicht eine vollständige lokale Entwicklungsumgebung mit:
- **PostgreSQL** für lokale Datenbankentwicklung
- **Adminer** für Database Management
- **Schema Migration** für automatische Datenbankinitialisierung
- **Multi-Stage Docker Build** für Development und Production

## 🚀 Quick Start

### 1. Docker Installation prüfen
```bash
# Prüfe ob Docker installiert ist
docker --version

# Falls nicht installiert (macOS):
brew install --cask docker
```

### 2. Automatisches Setup
```bash
# Führe das Setup-Script aus
make setup-docker

# Oder manuell:
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

### 3. Services starten
```bash
# Alle Services starten
make up

# Oder einzeln:
make test-db     # Nur PostgreSQL
make adminer     # Database Management UI
```

## 📋 Verfügbare Commands

### Development
```bash
make dev          # Normale Development (npm start)
make dev-docker   # Development mit Docker
```

### Docker Services
```bash
make up           # Starte alle Services
make down         # Stoppe alle Services
make logs         # Zeige alle Logs
make status       # Status aller Container
make health       # System Health Check
```

### Database
```bash
make test-db      # Starte PostgreSQL
make migrate      # Führe Schema-Migration aus
make db-shell     # Öffne PostgreSQL Shell
make adminer      # Öffne Adminer im Browser
```

### Quick Commands
```bash
make quick-start  # Complete Setup: Docker + Services
make quick-test   # Test Setup: DB + Schema
```

## 🔧 Konfiguration

### Environment Files
- **`.env.docker`** - Docker-spezifische Konfiguration
- **`.env.local`** - Lokale Entwicklung (überschreibt .env)
- **`.env`** - Production Konfiguration

### Switching Environments
```bash
make env-docker   # Nutze Docker Environment
make env-test     # Nutze Test Environment
make env-prod     # Nutze Production Environment
```

## 🌐 Service URLs

Nach dem Start sind folgende Services verfügbar:

| Service | URL | Beschreibung |
|---------|-----|--------------|
| **App** | http://localhost:3001 | React Application |
| **PostgreSQL** | localhost:5432 | Database Server |
| **Adminer** | http://localhost:8080 | DB Management UI |

### Database Credentials
- **Host**: localhost:5432
- **Database**: vacation_planner
- **User**: supabase_admin
- **Password**: your_super_secret_jwt_token_with_at_least_32_characters_long

## 📊 Database Schema

Das Database Schema wird automatisch aus `database/complete_test_schema.sql` geladen und enthält:

- ✅ **trips** - Reisen mit Privacy Settings
- ✅ **destinations** - Reiseziele mit GPS und Kosten
- ✅ **user_profiles** - Benutzerprofile mit Social Features
- ✅ **follows** - Social Network Funktionen
- ✅ **user_activities** - Activity Feed
- ✅ **RLS Policies** - Row Level Security
- ✅ **Functions & Triggers** - Automatische Updates

## 🏗️ Docker Architecture

### Development Setup
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   PostgreSQL    │    │    Adminer      │
│  localhost:3001 │───▶│  localhost:5432 │◀───│ localhost:8080  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production Setup
```
┌─────────────────┐    ┌─────────────────┐
│   Nginx + App   │    │   Supabase      │
│  localhost:80   │───▶│    (Cloud)      │
└─────────────────┘    └─────────────────┘
```

## 🛠️ Troubleshooting

### Docker nicht installiert
```bash
# macOS
brew install --cask docker

# Nach Installation Docker Desktop starten
open /Applications/Docker.app
```

### Services starten nicht
```bash
# Container Status prüfen
make status

# Logs anzeigen
make logs

# Services neu starten
make restart
```

### Database Connection Error
```bash
# Prüfe ob PostgreSQL läuft
make logs-db

# Schema erneut migrieren
make migrate

# Database Shell für Debug
make db-shell
```

### Port bereits belegt
```bash
# Prüfe laufende Processes
lsof -i :3001  # App Port
lsof -i :5432  # PostgreSQL Port
lsof -i :8080  # Adminer Port

# Stoppe alle Container
make down
```

## 🧹 Cleanup

```bash
make clean      # Stoppe Services, lösche Volumes
make clean-all  # Komplette Cleanup inkl. Images
```

## 📈 Production Build

```bash
# Baue Production Image
make prod-build

# Starte Production Container
make prod-run

# App läuft dann auf localhost:80
```

## 🔄 Workflow Integration

### Für Test Environment
1. `make env-docker` - Docker Environment aktivieren
2. `make quick-start` - Services starten + Schema migrieren
3. `make dev` - React App starten

### Für Supabase Development
1. `make env-test` - Test/Supabase Environment
2. `npm start` - Mit Supabase Cloud verbinden

### Für Production
1. `make env-prod` - Production Environment
2. `make prod-build` - Production Build
3. `make prod-run` - Production Container starten