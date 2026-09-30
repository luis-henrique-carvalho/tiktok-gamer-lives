# Diretrizes e Fatos do Projeto — Plataforma de Lives Interativas

> **Escopo**: Este arquivo estabelece os fatos permanentes, convenções inegociáveis e links para as especificações técnicas detalhadas deste repositório. Todo agente e desenvolvedor deve consultar e obedecer a estas regras.

---

## 1. Índice de Especificações Técnicas

As especificações detalhadas do projeto estão modularizadas no diretório `docs/spec/`:

- 📐 **[Especificação de Arquitetura](docs/spec/architecture.md)**: Arquitetura Hexagonal, Host Agnóstico, contratos SPI da engine (`GameInputMapper`, `GameEngine`, `GameProjection`), concorrência serial BullMQ (FIFO 1) e persistência de snapshots opacos em JSONB.
- ⚙️ **[Especificação da Stack & Cobertura](docs/spec/stack.md)**: Detalhamento de bibliotecas, versões (Fastify, TanStack Start, React 19, Socket.IO, BullMQ, Redis, PostgreSQL 17, Drizzle ORM, Better Auth, Tailwind CSS v4, Zustand) e thresholds estritos de cobertura Vitest V8.
- 📋 **[Documento de Requisitos de Produto (PRD)](docs/prd-mvp-live-interativa.md)**: Regras de negócio, catálogo de presentes, sistema de combos, cooldowns e critérios de aceite do MVP.
- 🗺️ **[Plano de Implementação Ativo (Walking Skeleton)](docs/plans/mvp-walking-skeleton.md)**: Roadmap executável e passos de implementação TDD do MVP.

---

## 2. Invariantes de Arquitetura e Governança

### 2.1. Zero Pacote Compartilhado (`packages/shared` Proibido)
- `apps/api` é a **autoridade do domínio**: schemas Zod, entidades, contratos da engine e regras residem no backend.
- `apps/web` é um **consumidor independente**: declara seus próprios tipos locais para payloads de rede (REST + Socket.IO). Nunca importe código de `apps/api` dentro de `apps/web`.

### 2.2. Host Agnóstico e Hexagonal
- O Host da plataforma gerencia apenas infraestrutura, mensageria serial, timers e entrega de eventos.
- O Host **não conhece** regras de jogos (torres, vidas, pontuações ou times).
- Novas regras de jogo pertencem exclusivamente a `apps/api/src/modules/games/<game>/`.

### 2.3. TDD Rigoroso & Cobertura de Testes
- O ciclo **Red → Green → Refactor** é obrigatório para:
  1. Regras do motor do jogo (ex: A x B).
  2. Ingress Worker (deduplicação e buffer de combos).
  3. Serial Executor (garantia estrita de concorrência 1 e FIFO).
- A suite deve atingir os thresholds mínimos configurados em `docs/spec/stack.md` (**90% no backend** e **85% no frontend**).

---

## 3. Restrições e Segurança ("O que NÃO fazer")

1. **NUNCA commitar segredos**: `.env`, `.pem`, `.key`, `secrets.json` ou credenciais de banco (fiscalizado pelo pre-commit hook).
2. **NUNCA alterar configurações de qualidade sem permissão**: `tsconfig.json`, `eslint.config.js` e `vitest.config.ts` são protegidos pelo hook `guard_protected_files.py`.
3. **NUNCA rodar agentes de escrita em paralelo**: construtores de backend e frontend rodam sequencialmente para evitar conflitos de código.
4. **NUNCA misturar lógica de jogo no Host**: novas regras pertencem a `apps/api/src/modules/games/<game>/`, nunca a rotas Fastify ou executors genéricos.
5. **NUNCA usar `any`**: TypeScript em modo strict em todos os arquivos.

---

## 4. Comandos Canônicos

```bash
# Validação completa de qualidade e cobertura
./scripts/verify.sh

# Instalação
pnpm install

# Desenvolvimento geral
pnpm dev

# Backend isolado
pnpm --filter api dev
pnpm --filter api test:coverage
pnpm --filter api db:migrate

# Frontend isolado
pnpm --filter web dev
pnpm --filter web test:coverage
pnpm --filter web build
```
