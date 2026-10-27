# LayerFS en crm-home

Integración de [LayerFS](https://layerfs.ai) (Ephemeral-AI-Lab) para trabajar con el repo
desde ramas/branches isolated, sin tocar el working tree.

## Qué resuelve

- **Store local** con toda la historia del proyecto (commits, branches, layers) — un solo SQLite.
- **Workspaces efímeros**: cada comando corre en un sandbox Docker con el árbol completo
  (incluye `node_modules`), sin instalar nada y sin tocar tu working tree.
- **Rewind**: cada commit es un checkpoint; podés forkear desde cualquier punto.
- **Agentes en paralelo** sobre branches distintos, con conflicto explícito si tocan el mismo archivo.

## Requisitos

| Requisito | Estado en esta máquina |
| --- | --- |
| Linux + un solo kernel (Store local) | ✓ |
| Store en ext4/xfs/btrfs **local** | ✓ (`/home` es btrfs) |
| Docker Engine | ✓ 29.7.2 |
| Node ≥ 20 | ✓ 26 |
| Rust (para el addon nativo) | ✓ |
| Checkout de LayerFS | `~/tools/layerfs` (ya clonado + compilado) |

> **El proyecto NO se mueve.** `init` lee el árbol una vez desde el disco externo
> (NTFS/fuseblk sirve como *fuente*; el Store queda en `/home`). La carpeta
> `/run/media/enri/DISCO DURO/crm-home/crm` queda donde está.

## Modelo de permisos (importante)

El Store instalado queda `root:root 0700/0600` porque los daemons de los sandboxes lo
abren como root. Por eso:

- el **init** (one-time) necesita `sudo` → pide tu password una vez;
- las operaciones posteriores también correan como root si el Store es root-owned, y el
  wrapper hace el re-exec con `sudo -E` por vos;
- para probar sin root: `LF_NO_SUDO=1` (solo funciona con un Store no-root).

## Uso

```bash
cd tools/layerfs
cp lf.env.example lf.env      # ajustá LAYERFS_SOURCE si cambia la ruta
chmod 700 ~/$(echo $LAYERFS_HOME) 2>/dev/null || true

# 1) bootstrap (una vez; pide tu password)
./lf init

# 2) trabajo diario
./lf fork feature-web-v3              # branch desde main (no copia archivos)
./lf run feature-web-v3 "bun run test" "verify"   # sandbox: exec + commit + unmount
./lf status                            # branches + sandboxes

# 3) publicar (mergea main primero: publish solo sobrescribe)
./lf ship feature-web-v3

# 4) cualquier otra llamada → passthrough al CLI oficial
./lf fs read main /AGENTS.md --text
./lf branch list_commits feature-web-v3
```

## Reglas de trabajo con esto

1. **Un branch por agente/tarea.** Los forks son gratis; los commits se mergean.
2. **Ownership por superficie.** Dos agentes en el mismo archivo → `Conflict` (se rechaza,
   no se aplica a medias). Separá superficies de escritura (mismo criterio ODD).
3. **Nunca `publish` directo de un branch viejo**: `ship` mergea `main` primero y publica
   la release, así no pisás Layers publicados por otros.
4. **`.lww` solo para archivos regenerables** (`bun.lockb`, `dist/`, `.nuxt/`, `.turbo/`,
   `apps/web-v2/.vitest/json/output.json`). Nunca para código.
5. **El historial de LayerFS no es un backup**: el Store es `synchronous=OFF`. Seguí usando git
   para el historial de verdad.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `lf` | Wrapper bash: aplica `lf.env` y delega al CLI o a `lf.mjs` |
| `lf.mjs` | Helpers de flujo (init / fork / run / ship / status) sobre `@layerfs/agent` |
| `lf.env.example` | Plantilla de configuración (copiar a `lf.env`, gitignored) |
