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

db-up: ## Levanta postgres:17-alpine y espera a que esté healthy
	docker compose up -d postgres
	@until docker compose exec -T postgres pg_isready -U crm -d crm_home > /dev/null 2>&1; do echo "Esperando a postgres..."; sleep 2; done
	@echo "postgres listo en localhost:5432 (db crm_home)"

db-down: ## Detiene los servicios de docker compose
	docker compose down

help: ## Lista los targets disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: dev build test db-up db-down help
