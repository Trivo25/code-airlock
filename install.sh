#!/usr/bin/env sh
set -eu

repo="Trivo25/code-airlock"
ref="${CODE_AIRLOCK_REF:-main}"
prefix="${PREFIX:-$HOME/.local/bin}"
target="$prefix/code-airlock"
alias_name="${CODE_AIRLOCK_ALIAS:-codelock}"
install_alias="${CODE_AIRLOCK_INSTALL_ALIAS:-1}"
url="https://raw.githubusercontent.com/$repo/$ref/code-airlock"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  }
}

need curl
need chmod
need mkdir
need ln

mkdir -p "$prefix"

if [ -f "./code-airlock" ]; then
  cp "./code-airlock" "$target"
else
  curl -fsSL "$url" -o "$target"
fi

chmod +x "$target"

printf 'Installed code-airlock to %s\n' "$target"

if [ "$install_alias" = 1 ]; then
  alias_target="$prefix/$alias_name"
  existing_alias="$(command -v "$alias_name" 2>/dev/null || true)"
  if [ -z "$existing_alias" ] || [ "$existing_alias" = "$alias_target" ]; then
    ln -sf "$target" "$alias_target"
    printf 'Installed %s alias to %s\n' "$alias_name" "$alias_target"
  else
    printf 'Skipping %s alias: command already exists at %s\n' "$alias_name" "$existing_alias"
    printf 'Use a shell alias instead: alias %s=code-airlock\n' "$alias_name"
  fi
fi

case ":$PATH:" in
  *":$prefix:"*) ;;
  *)
    printf '\n%s is not on your PATH.\n' "$prefix"
    printf 'Add this to your shell profile:\n\n'
    printf "  export PATH=\"%s:\$PATH\"\n" "$prefix"
    ;;
esac
