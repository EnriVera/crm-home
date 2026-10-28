#!/usr/bin/env bash
# free-dev-ports.sh - libera los puertos de los dev servers de este repo.
#
# Por qué: si un dev server queda vivo de una sesión anterior (crash, ctrl-c
# a medias, o un `make dev-v3` anterior que quedó huérfano), el próximo
# `make dev-v3` falla con EADDRINUSE en el API y Nuxt abre un prompt
# interactivo ("Take over port 5175?") que cuelga a turbo en un contexto no
# interactivo.
#
# Qué hace: por cada puerto, encuentra el PID que lo tiene tomado y, solo si
# ese proceso es un dev server de ESTE repo (la ruta del repo aparece en su
# command line), lo termina. Un puerto tomado por otra cosa avisa y no mata.
#
# Uso: tools/free-dev-ports.sh [puerto ...]   (default: 3000 5175)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS=("$@")
if [ ${#PORTS[@]} -eq 0 ]; then
  PORTS=(3000 5175)
fi

# Marca los procesos que son dev servers de este repo: nitro/nuxt de node_modules
# del repo o del paquete, cuya command line incluye la ruta del repo.
is_repo_dev_server() {
  local pid="$1" cmd
  cmd="$(ps -o args= -p "$pid" 2>/dev/null || true)"
  [ -n "$cmd" ] || return 1
  case "$cmd" in
    *"$REPO_ROOT"*) ;;
    *) return 1 ;;
  esac
  case "$cmd" in
    *"node_modules/.bin/nitro"*|*"node_modules/.bin/nuxt"*|*"/nitro dev"*|*"/nuxt dev"*) return 0 ;;
    *) return 1 ;;
  esac
}

freed=()
for port in "${PORTS[@]}"; do
  pids="$(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
  if [ -z "$pids" ]; then
    echo "puerto $port libre"
    continue
  fi
  for pid in $pids; do
    if is_repo_dev_server "$pid"; then
      cmd="$(ps -o args= -p "$pid" 2>/dev/null || true)"
      echo "puerto $port ocupado por un dev server de este repo (pid $pid): lo termino"
      kill "$pid" 2>/dev/null || true
      freed+=("$port")
    else
      cmd="$(ps -o args= -p "$pid" 2>/dev/null || true)"
      echo "AVISO: el puerto $port lo tiene otro proceso (pid $pid): $cmd" >&2
      echo "       No lo mato. Liberalo a mano o cambiá el puerto." >&2
    fi
  done
done

if [ ${#freed[@]} -gt 0 ]; then
  # Espera a que el kernel libere el socket.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    busy=""
    for port in "${freed[@]}"; do
      if ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then busy="$busy $port"; fi
    done
    [ -z "$busy" ] && break
    sleep 0.3
  done
  for port in "${freed[@]}"; do
    if ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then
      echo "AVISO: el puerto $port sigue ocupado" >&2
    fi
  done
fi
