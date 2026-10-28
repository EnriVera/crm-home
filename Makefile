# CRM-HOME — tooling raíz del monorepo
# Fallback documentado (D1): si turbo falla con bun.lock (formato texto v2),
# los mismos scripts se ejecutan con:
#   bun --filter '@crm/api' run test
#   bun --filter './apps/*' run build
#   bun run <task>   (en el directorio del paquete correspondiente)

.DEFAULT_GOAL := help

# turbo vive en node_modules/.bin, que no está en el PATH de make (bun run sí
# lo agrega). bunx lo resuelve localmente, sin red.
TURBO := bunx turbo

dev: ## Arranca los dev servers (turbo run dev)
	$(TURBO) run dev

# Backend + SPA de Nuxt a la vez: el API en 3000 y el SPA en 5175, con la
# salida de cada uno etiquetada por turbo. Requiere la infra (make up) para
# que el API pueda hablar con Postgres.
dev-v3: ## Arranca el backend (:3000) y el SPA de Nuxt (:5175) a la vez
	$(TURBO) run dev --filter=@crm/api --filter=@crm/web-v3

build: ## Compila todos los paquetes (turbo run build)
	$(TURBO) run build

test: ## Ejecuta los tests de todos los paquetes (turbo run test)
	$(TURBO) run test

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
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: dev dev-v3 build test db-up db-down mail-up mail-down up down help
