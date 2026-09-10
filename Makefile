# CRM-HOME — tooling raíz del monorepo
# Fallback documentado (D1): si turbo falla con bun.lock (formato texto v2),
# los mismos scripts se ejecutan con:
#   bun --filter '@crm/api' run test
#   bun --filter './apps/*' run build
#   bun run <task>   (en el directorio del paquete correspondiente)

.DEFAULT_GOAL := help

dev: ## Arranca los dev servers (turbo run dev)
	turbo run dev

build: ## Compila todos los paquetes (turbo run build)
	turbo run build

test: ## Ejecuta los tests de todos los paquetes (turbo run test)
	turbo run test

# Levanta postgres:17-alpine y espera a que esté healthy. Mantenido como alias
# de solo-postgres para no forzar Mailpit en flujos que no necesitan SMTP.
db-up: ## Levanta solo postgres:17-alpine y espera a que esté healthy
	docker compose up -d postgres
	@until docker compose exec -T postgres pg_isready -U crm -d crm_home > /dev/null 2>&1; do \
		echo "Esperando a postgres..."; \
		sleep 2; \
	done
	@echo "postgres listo en localhost:5432 (db crm_home)"

db-down: ## Detiene los servicios de docker compose
	docker compose down

# Levanta Mailpit (SMTP :1025, UI :8025) sin postgres. Útil cuando solo se
# quieren inspeccionar emails sin levantar la base de datos. Override de
# puertos via docker-compose.override.yml (no commitear overrides locales).
mail-up: ## Levanta solo Mailpit (SMTP localhost:1025, UI http://localhost:8025)
	docker compose up -d mailpit
	@echo "Mailpit listo en http://localhost:8025 (SMTP localhost:1025)"

mail-down: ## Detiene solo Mailpit
	docker compose stop mailpit

# Levanta postgres + mailpit. Es el target canónico para dev local end-to-end.
# Si algún puerto está ocupado, parar el servicio local correspondiente o usar
# un docker-compose.override.yml (no versionado).
up: ## Levanta postgres + mailpit y espera a que ambos estén healthy
	docker compose up -d
	@until docker compose exec -T postgres pg_isready -U crm -d crm_home > /dev/null 2>&1; do \
		echo "Esperando a postgres..."; \
		sleep 2; \
	done
	@echo "postgres listo en localhost:5432"
	@echo "Mailpit listo en http://localhost:8025 (SMTP localhost:1025)"

down: ## Detiene todos los servicios de docker compose
	docker compose down

help: ## Lista los targets disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: dev build test db-up db-down mail-up mail-down up down help
