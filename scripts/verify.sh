#!/usr/bin/env bash
# ==============================================================================
# verify.sh — Validador Completo de Qualidade e Cobertura de Testes
#
# Monorepo:
#  1. Backend (apps/api): Typecheck + Lint + Vitest com Cobertura V8 (90%)
#  2. Frontend (apps/web): Shadcn Linter + Typecheck + Lint + Vitest com Cobertura V8 (85%) + Build
#
# Uso:
#   ./scripts/verify.sh            # Validação completa com thresholds de cobertura
#   ./scripts/verify.sh --api      # Apenas backend Fastify
#   ./scripts/verify.sh --web      # Apenas frontend TanStack Start
#   ./scripts/verify.sh --quick    # Roda testes rápidos sem gerar relatório de cobertura
# ==============================================================================

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

run_api=true
run_web=true
run_coverage=true

for arg in "$@"; do
  case $arg in
    --api)
      run_api=true
      run_web=false
      ;;
    --web)
      run_api=false
      run_web=true
      ;;
    --quick)
      run_coverage=false
      ;;
    -h|--help)
      echo -e "${BOLD}Uso:${RESET} ./scripts/verify.sh [--api | --web] [--quick]"
      exit 0
      ;;
  esac
done

step() {
  echo -e "\n${BLUE}${BOLD}==>${RESET} ${BOLD}$1${RESET}"
}

success() {
  echo -e "${GREEN}✓ $1${RESET}"
}

warn() {
  echo -e "${YELLOW}⚠ $1${RESET}"
}

error() {
  echo -e "${RED}✗ $1${RESET}" >&2
}

START_TIME=$(date +%s)

# ==============================================================================
# 1. VALIDAÇÃO DE DESIGN SYSTEM (Shadcn UI)
# ==============================================================================
if [ "$run_web" = true ]; then
  step "[Frontend 1/5] Verificação de Conformidade Shadcn UI..."
  if [ -f "./scripts/check_shadcn_usage.py" ]; then
    python3 ./scripts/check_shadcn_usage.py
  fi
fi

# ==============================================================================
# 2. BACKEND API (apps/api — Fastify + BullMQ + Drizzle)
# ==============================================================================
if [ "$run_api" = true ]; then
  echo -e "\n${YELLOW}${BOLD}=====================================================${RESET}"
  echo -e "${YELLOW}${BOLD}  1. BACKEND API (apps/api) — Meta: 90% Cobertura    ${RESET}"
  echo -e "${YELLOW}${BOLD}=====================================================${RESET}"

  if [ -d "apps/api" ]; then
    step "[Backend 1/3] TypeScript Typecheck..."
    if pnpm --filter api run typecheck 2>/dev/null || pnpm --filter api exec tsc --noEmit; then
      success "Typecheck do Backend passou sem erros."
    else
      error "Falha no Typecheck do Backend."
      exit 1
    fi

    step "[Backend 2/3] ESLint..."
    if [ -f "apps/api/node_modules/.bin/eslint" ] || [ -f "node_modules/.bin/eslint" ]; then
      if pnpm --filter api run lint; then
        success "ESLint do Backend passou sem erros."
      else
        error "Falha no ESLint do Backend."
        exit 1
      fi
    else
      warn "ESLint ainda não configurado no backend. Pulando."
    fi

    if [ "$run_coverage" = true ]; then
      step "[Backend 3/3] Vitest com Cobertura V8 (Threshold: 90%)..."
      if pnpm --filter api run test:coverage; then
        success "Testes e Thresholds de Cobertura do Backend validados com sucesso (90%+)."
      else
        error "Falha nos testes ou thresholds de cobertura do Backend."
        exit 1
      fi
    else
      step "[Backend 3/3] Vitest (Modo Rápido)..."
      if pnpm --filter api run test; then
        success "Testes do Backend passaram com sucesso."
      else
        error "Falha nos testes do Backend."
        exit 1
      fi
    fi
  else
    warn "apps/api ainda não inicializado no monorepo. Pulando etapa."
  fi
fi

# ==============================================================================
# 3. FRONTEND WEB (apps/web — TanStack Start + React 19)
# ==============================================================================
if [ "$run_web" = true ]; then
  echo -e "\n${YELLOW}${BOLD}=====================================================${RESET}"
  echo -e "${YELLOW}${BOLD}  2. FRONTEND WEB (apps/web) — Meta: 85% Cobertura   ${RESET}"
  echo -e "${YELLOW}${BOLD}=====================================================${RESET}"

  if [ -d "apps/web" ]; then
    step "[Web 2/5] TypeScript Typecheck (Strict TS)..."
    if pnpm --filter web run typecheck 2>/dev/null || pnpm --filter web exec tsc --noEmit; then
      success "Typecheck do Frontend passou sem erros."
    else
      error "Falha no Typecheck do Frontend."
      exit 1
    fi

    step "[Web 3/5] ESLint..."
    if [ -f "apps/web/node_modules/.bin/eslint" ] || [ -f "node_modules/.bin/eslint" ]; then
      if pnpm --filter web run lint; then
        success "ESLint do Frontend passou sem erros."
      else
        error "Falha no ESLint do Frontend."
        exit 1
      fi
    else
      warn "ESLint ainda não configurado no frontend. Pulando."
    fi

    if [ "$run_coverage" = true ]; then
      step "[Web 4/5] Vitest com Cobertura V8 (Threshold: 85%)..."
      if pnpm --filter web run test:coverage; then
        success "Testes e Thresholds de Cobertura do Frontend validados com sucesso (85%+)."
      else
        error "Falha nos testes ou thresholds de cobertura do Frontend."
        exit 1
      fi
    else
      step "[Web 4/5] Vitest (Modo Rápido)..."
      if pnpm --filter web run test; then
        success "Testes do Frontend passaram com sucesso."
      else
        error "Falha nos testes do Frontend."
        exit 1
      fi
    fi

    step "[Web 5/5] Vite Production Build..."
    if [ -f "apps/web/vite.config.ts" ] && [ -f "apps/web/index.html" ]; then
      if pnpm --filter web run build; then
        success "Build de produção do Frontend gerado com sucesso."
      else
        error "Falha no Build do Frontend."
        exit 1
      fi
    else
      warn "Build completo do Frontend aguardando vite.config.ts e index.html completos."
    fi
  else
    warn "apps/web ainda não inicializado no monorepo. Pulando etapa."
  fi
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n${GREEN}${BOLD}=====================================================${RESET}"
echo -e "${GREEN}${BOLD}  ✓ TODAS AS VALIDAÇÕES PASSARAM COM SUCESSO! (${ELAPSED}s) ${RESET}"
echo -e "${GREEN}${BOLD}=====================================================${RESET}\n"
