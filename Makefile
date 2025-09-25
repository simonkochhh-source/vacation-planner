# Vacation Planner Makefile
# Vereinfacht Docker und Development Commands

.PHONY: help dev build up down logs clean setup-docker test-db migrate

# Default target
help: ## Zeige alle verfügbaren Commands
	@echo "Vacation Planner Docker Commands:"
	@echo "================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development Commands
dev: ## Starte Development Server (npm start)
	npm start

dev-docker: ## Starte Development mit Docker
	docker-compose up --build app

# Docker Commands
setup-docker: ## Erstelle Docker Setup (PostgreSQL + Adminer)
	@echo "🐳 Docker Setup wird ausgeführt..."
	@chmod +x scripts/docker-setup.sh
	@./scripts/docker-setup.sh

build: ## Baue Docker Images
	docker-compose build

up: ## Starte alle Services
	docker-compose up -d

down: ## Stoppe alle Services
	docker-compose down

restart: ## Restart alle Services
	docker-compose restart

logs: ## Zeige Logs aller Services
	docker-compose logs -f

logs-db: ## Zeige nur PostgreSQL Logs
	docker-compose logs -f postgres

logs-app: ## Zeige nur App Logs
	docker-compose logs -f app

# Database Commands
test-db: ## Starte nur PostgreSQL für Testing
	docker-compose up -d postgres
	@echo "✅ Test Database läuft auf localhost:5432"
	@echo "📝 Credentials: User=supabase_admin, DB=vacation_planner"

migrate: ## Führe Schema-Migration aus
	@echo "📊 Führe Schema-Migration aus..."
	docker-compose exec postgres psql -U supabase_admin -d vacation_planner -f /docker-entrypoint-initdb.d/complete_test_schema.sql
	@echo "✅ Schema-Migration abgeschlossen!"

db-shell: ## Öffne PostgreSQL Shell
	docker-compose exec postgres psql -U supabase_admin -d vacation_planner

adminer: ## Öffne Adminer im Browser
	@echo "🔧 Öffne Adminer..."
	@open http://localhost:8080 2>/dev/null || echo "📱 Öffne http://localhost:8080 im Browser"

# Cleanup Commands
clean: ## Stoppe Services und lösche Volumes
	docker-compose down -v
	docker system prune -f

clean-all: ## Komplette Cleanup (inkl. Images)
	docker-compose down -v --rmi all
	docker system prune -af

# Production Commands
prod-build: ## Baue Production Image
	docker build --target production -t vacation-planner:latest .

prod-run: ## Starte Production Container
	docker run -d --name vacation-planner -p 80:80 vacation-planner:latest

# Environment Commands
env-test: ## Kopiere Test Environment
	cp .env.local.example .env.local
	@echo "✅ Test Environment konfiguriert"

env-docker: ## Kopiere Docker Environment
	cp .env.docker .env.local
	@echo "✅ Docker Environment konfiguriert"

env-prod: ## Kopiere Production Environment
	cp .env .env.local
	@echo "✅ Production Environment konfiguriert"

# Status Commands
status: ## Zeige Status aller Container
	docker-compose ps

health: ## Prüfe Health Status
	@echo "🏥 System Health Check:"
	@echo "======================="
	@docker-compose ps
	@echo ""
	@curl -s http://localhost:3001 > /dev/null && echo "✅ App: OK" || echo "❌ App: Error"
	@docker-compose exec postgres pg_isready -U supabase_admin > /dev/null 2>&1 && echo "✅ DB: OK" || echo "❌ DB: Error"
	@curl -s http://localhost:8080 > /dev/null && echo "✅ Adminer: OK" || echo "❌ Adminer: Error"

# Supabase Commands
sb-link-test: ## Link zu Test Database
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh link-test

sb-link-prod: ## Link zu Production Database
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh link-prod

sb-migrate: ## Migriere Production Schema zu Test
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh migrate-prod-to-test

sb-local: ## Starte lokale Supabase Instanz
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh local-start

sb-stop: ## Stoppe lokale Supabase Instanz
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh local-stop

sb-status: ## Zeige Supabase Status
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh status

sb-schema: ## Wende Complete Schema an
	@chmod +x scripts/supabase-commands.sh
	@./scripts/supabase-commands.sh apply-schema

# Quick Commands
quick-start: setup-docker up ## Quick Setup: Docker + Services
	@echo "🚀 Quick Start abgeschlossen!"
	@echo "📱 App: http://localhost:3001"
	@echo "🛠️  Adminer: http://localhost:8080"

quick-test: test-db migrate ## Quick Test: DB + Schema
	@echo "🧪 Test Environment bereit!"

quick-supabase: sb-link-test sb-schema ## Quick Supabase: Link + Schema
	@echo "📊 Supabase Test Environment bereit!"