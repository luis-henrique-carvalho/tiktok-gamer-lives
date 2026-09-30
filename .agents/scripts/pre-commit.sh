#!/usr/bin/env bash
set -euo pipefail

# Lê o payload JSON do Antigravity via stdin
PAYLOAD=$(cat)

# Extrai o comando que o agente pretende executar
COMMAND_LINE=$(echo "$PAYLOAD" | jq -r '.toolCall.args.CommandLine // empty')

# Padrão regex para arquivos e extensões sensíveis
SENSITIVE_PATTERN='(\.env(\..+)?|\.key|\.pem|\.crt|\.pfx|id_rsa|secrets\.json|creds\.md)$'

# Se o comando envolve git commit ou git add com arquivos sensíveis
if echo "$COMMAND_LINE" | grep -qE '\bgit\s+(commit|add)\b'; then
  # 1. Verifica se a linha de comando tenta adicionar explicitamente arquivos sensíveis
  if echo "$COMMAND_LINE" | grep -qE "$SENSITIVE_PATTERN"; then
    cat <<EOF
{
  "decision": "deny",
  "reason": "BLOQUEIO DE SEGURANÇA: Comando contém referências explícitas a arquivos sensíveis (.env, credenciais ou chaves)."
}
EOF
    exit 0
  fi

  # 2. Se for um comando de git commit, verifica arquivos já adicionados ao staging
  if echo "$COMMAND_LINE" | grep -qE '\bgit\s+commit\b'; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      STAGED_SENSITIVE=$(git diff --cached --name-only | grep -E "$SENSITIVE_PATTERN" || true)
      if [ -n "$STAGED_SENSITIVE" ]; then
        ESCAPED_FILES=$(echo "$STAGED_SENSITIVE" | tr '\n' ' ')
        cat <<EOF
{
  "decision": "deny",
  "reason": "BLOQUEIO DE SEGURANÇA: Tentativa de commitar arquivos sensíveis em staging: ${ESCAPED_FILES}. Remova-os do git stage antes de continuar."
}
EOF
        exit 0
      fi
    fi
  fi
fi

# Se passou em todas as verificações, permite a execução
cat <<EOF
{
  "decision": "allow"
}
EOF
exit 0
