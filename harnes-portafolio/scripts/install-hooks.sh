#!/usr/bin/env bash
# install-hooks.sh — instala un git hook pre-commit que corre check.mjs y
# bloquea el commit si la verificacion falla. Respalda cualquier hook existente.
#
# Uso:  bash harnes-portafolio/scripts/install-hooks.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GIT_DIR="$REPO_ROOT/.git"
HOOKS_DIR="$GIT_DIR/hooks"
HOOK_PATH="$HOOKS_DIR/pre-commit"

if [ ! -d "$GIT_DIR" ]; then
  echo "ERROR: no se encontro $GIT_DIR — ejecuta esto dentro del repo git." >&2
  exit 1
fi

mkdir -p "$HOOKS_DIR"

if [ -e "$HOOK_PATH" ]; then
  BACKUP="$HOOK_PATH.backup.$(date +%Y%m%d%H%M%S)"
  cp "$HOOK_PATH" "$BACKUP"
  echo "Aviso: ya existia un pre-commit. Respaldo guardado en: $BACKUP"
fi

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
# pre-commit — instalado por harnes-portafolio/scripts/install-hooks.sh
# Corre la verificacion determinista del portafolio y bloquea el commit si falla.
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
echo "[pre-commit] Ejecutando harnes-portafolio/scripts/check.mjs ..."
if ! node "$REPO_ROOT/harnes-portafolio/scripts/check.mjs"; then
  echo "[pre-commit] check.mjs fallo — commit bloqueado. Corrige los FAIL y reintenta." >&2
  echo "[pre-commit] (para saltar en una emergencia: git commit --no-verify)" >&2
  exit 1
fi
echo "[pre-commit] OK"
HOOK

chmod +x "$HOOK_PATH"
echo "Hook pre-commit instalado en: $HOOK_PATH"
echo "A partir de ahora cada 'git commit' correra check.mjs y bloqueara si hay FAIL."
