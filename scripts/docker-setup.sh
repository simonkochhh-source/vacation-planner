#!/bin/bash

# Docker Setup Script für Vacation Planner
# Dieses Script richtet die Docker-basierte Entwicklungsumgebung ein

set -e

echo "🐳 Vacation Planner Docker Setup"
echo "================================="

# Prüfe ob Docker installiert ist
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert!"
    echo "📥 Installiere Docker Desktop für macOS..."
    
    if command -v brew &> /dev/null; then
        echo "🍺 Installiere Docker über Homebrew..."
        brew install --cask docker
    else
        echo "💻 Bitte installiere Docker Desktop manuell von: https://www.docker.com/products/docker-desktop"
        echo "⚠️  Nach der Installation, starte Docker Desktop und führe dieses Script erneut aus."
        exit 1
    fi
    
    echo "✅ Docker Installation abgeschlossen!"
    echo "🚀 Starte Docker Desktop und führe dieses Script erneut aus."
    exit 0
fi

# Prüfe ob Docker läuft
if ! docker info &> /dev/null; then
    echo "⚠️  Docker ist installiert, aber nicht gestartet!"
    echo "🚀 Bitte starte Docker Desktop und führe dieses Script erneut aus."
    exit 1
fi

echo "✅ Docker ist installiert und läuft!"

# Erstelle .env.docker falls nicht vorhanden
if [ ! -f .env.docker ]; then
    echo "📝 Erstelle .env.docker Konfiguration..."
    cp .env.docker.example .env.docker 2>/dev/null || echo "⚠️  .env.docker.example nicht gefunden, verwende Standard-Konfiguration"
fi

echo "🏗️  Baue Docker Container..."

# Stoppe eventuell laufende Container
echo "🛑 Stoppe laufende Container..."
docker-compose down 2>/dev/null || true

# Baue und starte Container
echo "🚀 Starte PostgreSQL Container..."
docker-compose up -d postgres

# Warte bis PostgreSQL bereit ist
echo "⏳ Warte auf PostgreSQL..."
until docker-compose exec postgres pg_isready -U supabase_admin -d vacation_planner; do
    echo "⏳ PostgreSQL startet noch..."
    sleep 2
done

echo "✅ PostgreSQL ist bereit!"

# Führe Schema-Migration aus
echo "📊 Führe Schema-Migration aus..."
if [ -f "database/complete_test_schema.sql" ]; then
    docker-compose exec postgres psql -U supabase_admin -d vacation_planner -f /docker-entrypoint-initdb.d/complete_test_schema.sql
    echo "✅ Schema-Migration abgeschlossen!"
else
    echo "⚠️  Schema-Datei nicht gefunden: database/complete_test_schema.sql"
fi

# Starte optional Adminer für DB Management
echo "🔧 Starte Adminer für Database Management..."
docker-compose up -d adminer

echo ""
echo "🎉 Docker Setup abgeschlossen!"
echo ""
echo "🔗 Services:"
echo "   📊 PostgreSQL:  localhost:5432"
echo "   🛠️  Adminer:     http://localhost:8080"
echo "   📝 Credentials:  User: supabase_admin, DB: vacation_planner"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Kopiere .env.docker zu .env.local für lokale Docker-Entwicklung"
echo "   2. Starte die App mit: npm start"
echo "   3. Konfiguriere Google OAuth in .env.docker"
echo ""
echo "🛑 Container stoppen: docker-compose down"
echo "📊 Logs anzeigen:     docker-compose logs -f"