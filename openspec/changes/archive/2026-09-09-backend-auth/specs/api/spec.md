# Delta for Api

> Change: `backend-auth`. `backend-auth` es el primer change de dominio que la
> spec `api` difería: introduce migraciones versionadas y schema real.

## MODIFIED Requirements

### Requirement: Kysely cableado con migraciones versionadas

`apps/api` DEBE incluir kysely con dialect postgres cableado en un adapter bajo
`src/infrastructure/kysely/`, leyendo la conexión de `DATABASE_URL`, CON
migraciones versionadas mediante kysely migrator nativo
(`FileMigrationProvider`) bajo `src/infrastructure/kysely/migrations/` y un
runner explícito (`bun run db:migrate`); las migraciones NUNCA DEBEN ejecutarse
automáticamente al arrancar nitro. `DatabaseSchema` DEBE reflejar las tablas
creadas por las migraciones aplicadas.
(Previously: kysely cableado SIN migraciones ni schema de base de datos,
diferidos al primer change de dominio — `backend-auth` es ese change.)

#### Scenario: Adapter kysely presente y confinado

- GIVEN el scaffold de `apps/api`
- WHEN se inspecciona `src/infrastructure/kysely/`
- THEN existe el adapter de conexión configurado con dialect postgres y `DATABASE_URL`, junto con el directorio de migraciones y el runner explícito

#### Scenario: Migraciones solo vía script explícito

- GIVEN `apps/api` con migraciones versionadas
- WHEN se arranca el servidor en modo dev sin ejecutar `db:migrate`
- THEN ninguna migración corre implícitamente durante el arranque
