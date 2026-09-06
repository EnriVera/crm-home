# `src/domain/` — regla vinculante (PRD §10)

Esta capa es **TypeScript puro**: entidades, value objects y puertos
(interfaces). Ningún archivo bajo `domain/` PUEDE importar dependencias
externas (`kysely`, `h3`, `nitro`, SDKs de OpenTelemetry, etc.) ni módulos de
`application/`, `infrastructure/` o `http/`.

Los puertos viven en `domain/ports/` y son implementados por adapters bajo
`infrastructure/`. La regla es auditable por path:

```bash
grep -rE "from ['\"](kysely|h3|nitro|@opentelemetry)" src/domain src/application
# → debe devolver cero resultados
```
