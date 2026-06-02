#!/usr/bin/env bash
# Sobe a API (Fastify) e o Web (Vite) juntos, sem precisar entrar em cada pasta.
#
# Uso:
#   ./dev.sh            # sobe os dois (Ctrl-C encerra ambos)
#   ./dev.sh api        # só a API
#   ./dev.sh web        # só o Web
#
# Requisitos: pnpm instalado e dependências já instaladas (pnpm install em api/ e web/).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-all}"

# Encerra os dois processos filhos ao sair (Ctrl-C, kill, etc.).
cleanup() {
  echo ""
  echo "Encerrando…"
  kill 0 2>/dev/null
}
trap cleanup EXIT INT TERM

run_api() {
  echo "▶ API  → http://localhost:3333"
  pnpm -C "$ROOT/api" dev
}

run_web() {
  echo "▶ Web  → http://localhost:5173"
  pnpm -C "$ROOT/web" dev
}

case "$TARGET" in
  api) run_api ;;
  web) run_web ;;
  all)
    run_api &
    run_web &
    wait
    ;;
  *)
    echo "Uso: ./dev.sh [api|web]   (sem argumento sobe os dois)"
    exit 1
    ;;
esac
