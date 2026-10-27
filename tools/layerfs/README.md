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
| Store en ext4/xfs/btrfs **local** | ✓ (volume docker en `/`, btrfs) |
| Docker Engine | ✓ 29.7.2 |
| Imagen sandbox `layerfs-crm-runtime` | ✓ (node 24 + bun 1.4.4, local) |
| Daemon Linux compilado | ✓ `/home/enri/layerfs/daemon/layerfs-daemon` |
| Node ≥ 20 | ✓ 26 |
| Rust (para el addon nativo) | ✓ |
| Checkout de LayerFS | `~/tools/layerfs` (ya clonado + compilado) |

> **El proyecto NO se mueve.** `init` lee el árbol una vez desde el disco externo
> (NTFS/fuseblk sirve como *fuente*). La carpeta `/run/media/enri/DISCO DURO/crm-home/crm`
> queda donde está — **y LayerFS nunca la escribe después del init** (ver
> "Semántica de publish" abajo).

## Topología del Store

El Store vive **dentro de un volume docker plain** (`layerfs-crm-home`):

- Los sandboxes solo aceptan volumes *plain* (driver `local`, sin opciones) — un
  bind volume falla con `"exact plain local VM volume"`.
- Los contenedores lo montan en `/layerfs-store`; el daemon abre
  `/layerfs-store/global/store.sqlite` ahí adentro.
- En el host, el SDK abre el mismo archivo vía
  `/var/lib/docker/volumes/layerfs-crm-home/_data/global/store.sqlite` (corre como
  root, ver abajo).
- Bootstrap del volume (si hay que rehacerlo): copiá el contenido del Store con un
  contenedor efímero — ver los comentarios de `lf.env.example`.

## Semántica de publish (clave)

`branch.publish(x)` hace que el head de `x` sea el **próximo Layer de `main`, dentro
 del Store**. No existe materialize/export en el SDK público: **LayerFS nunca escribe
la carpeta del repo** después del init. Para ver el estado de main: `./lf fs read main /ruta`.
Traer cambios del Store al disco de forma masiva queda como paso aparte (pendiente de
Definir si se necesita; el valor acá es el aislamiento + historial + sandbox).

## Modelo de permisos (importante)

El Store instalado queda `root:root 0700/0600` porque los daemons de los sandboxes lo
abren como root (el SDK chequea ownership del `LAYERFS_HOME` contra el euid y exige
mode 0700/0600). Por eso:

- el **init** (one-time) necesita `sudo` → pide tu password una vez;
- **todas** las operaciones corren como root: el wrapper re-ejecuta con `sudo -E`
  (helpers y llamadas crudas al CLI por igual). La regla es: si el Store es
  inaccesible o de otro uid → sudo. Bajo un dir `0700` de root, un usuario común
  ni siquiera puede `stat` el Store (EACCES) — eso también dispara el re-exec;
- para probar sin root: `LF_NO_SUDO=1` (solo funciona con un Store no-root);
- **nunca** `sudo ./lf <cmd>` directo: sin `-E`, `HOME` pasa a `/root` y se rompen
  las rutas del checkout. El wrapper hace `sudo -E` por vos.

## Uso

```bash
cd tools/layerfs
cp lf.env.example lf.env      # ajustá LAYERFS_SOURCE si cambia la ruta
chmod 700 ~/$(echo $LAYERFS_HOME) 2>/dev/null || true

# 1) bootstrap (una vez; pide tu password)
./lf init

# 2) verificación end-to-end (fork → write → read → diff → merge → publish)
./lf smoke

# 3) trabajo diario
./lf fork feature-web-v3              # branch desde main (no copia archivos)
./lf run feature-web-v3 "bun run test" "verify"   # sandbox: exec + commit + unmount
./lf status                            # branches + sandboxes

# 4) publicar (mergea main primero: publish avanza main al head del release)
./lf ship feature-web-v3

# 5) cualquier otra llamada → passthrough al CLI oficial (también con sudo re-exec)
./lf fs read main /AGENTS.md
./lf branch list_commits feature-web-v3
```

## Gotchas del SDK (aprendidos en el smoke test)

| Situación | Comportamiento |
| --- | --- |
| `fs.write/read/...` con ruta relativa | `InvalidInput` — las rutas son absolutas dentro del árbol (`/tools/layerfs/x.md`) |
| Fork de un branch que ya existe | `NameTaken` (no `Exists`; `Exists` es para re-init del proyecto) |
| Merge a un release que ya existe | `NameTaken` — no hay API de delete de branches; usá nombres únicos |
| Re-init con socket/FIFO en el árbol | `Project(Unsupported)` — matar el daemon MCP de codegraph y `rm -rf .codegraph` antes |
| Init que falla a mitad | deja la entrada del proyecto: `sudo rm -rf $LAYERFS_HOME/crm-home` y reintentar |
| Ejecutar el CLI crudo sin root | `PermissionDenied` — el wrapper ya lo resuelve con sudo; no llamar `sudo` a mano |

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
| `lf` | Wrapper bash: aplica `lf.env`, sudo re-exec, y delega al CLI o a `lf.mjs` |
| `lf.mjs` | Helpers de flujo (init / fork / run / ship / status / smoke) sobre `@layerfs/agent` |
| `smoke.mjs` | Test end-to-end del flujo (invocado por `./lf smoke`) |
| `lf.env.example` | Plantilla de configuración (copiar a `lf.env`, gitignored) |
