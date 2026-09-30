# Diretrizes e Fatos do Projeto — Plataforma de Lives Interativas

> **Escopo**: Este arquivo estabelece o índice oficial de especificações técnicas, convenções inegociáveis de governança e comandos canônicos deste repositório. Todo agente e desenvolvedor deve consultar e obedecer a estas regras.

---

## 1. Índice de Especificações Técnicas

Toda a arquitetura, regras de negócio e especificações detalhadas do projeto estão centralizadas no diretório `docs/`:

- 📐 **[Especificação de Arquitetura](docs/spec/architecture.md)**: **Documento autoritativo único de arquitetura**. Descreve a Arquitetura Hexagonal, Host Agnóstico, contratos SPI da engine (`GameInputMapper`, `GameEngine`, `GameProjection`), concorrência serial BullMQ (FIFO 1), persistência de snapshots opacos em JSONB e o desacoplamento estrito entre apps (Zero `packages/shared`).
- ⚙️ **[Especificação da Stack & Cobertura](docs/spec/stack.md)**: Detalhamento de bibliotecas, versões (Fastify, TanStack Start, React 19, Socket.IO, BullMQ, Redis, PostgreSQL 17, Drizzle ORM, Better Auth, Tailwind CSS v4, Zustand) e thresholds estritos de cobertura Vitest V8 (**90% no Backend** e **85% no Frontend**).
- 📋 **[Documento de Requisitos de Produto (PRD)](docs/prd-mvp-live-interativa.md)**: Regras de negócio, catálogo de presentes, sistema de combos, cooldowns e critérios de aceite do MVP.
- 🧭 **[Roadmap Estratégico do Produto](docs/roadmap.md)**: Visão de produto no framework Now/Next/Later, grafo de dependências técnicas e acompanhamento de iniciativas.
- 🗺️ **[Plano de Implementação Ativo (Walking Skeleton)](docs/plans/mvp-walking-skeleton.md)**: Roadmap executável e passos de implementação TDD do MVP.

---

## 2. Invariantes de Governança e Qualidade

1. **Autoridade Arquitetural Única**: Toda decisão de design, portas, adaptadores, concorrência e contratos deve obedecer estritamente a [docs/spec/architecture.md](docs/spec/architecture.md).
2. **Zero Pacote Compartilhado**: `apps/api` (autoridade do domínio) e `apps/web` (consumidor independente) são completamente isolados. O contrato entre eles é exclusivamente a rede (REST + Socket.IO). Proibido criar `packages/shared` ou importar código do backend no frontend.
3. **Host Agnóstico**: O Host gerencia apenas infraestrutura, mensageria serial e timers. Regras de jogo residem unicamente em `apps/api/src/modules/games/<game>/`.
4. **TDD Rigoroso & Cobertura**: Ciclo Red → Green → Refactor obrigatório no motor de jogo e workers seriais. Mínimo inegociável de **90% no backend** e **85% no frontend**.
5. **Modo Strict Total**: Proibido uso de `any` em todo o monorepo.
6. **Estratégia Git & Worktrees**: Novas fases e funcionalidades são desenvolvidas em branches dedicadas (`feat/<nome>`). Subagentes usam modo `inherit` no fluxo sequencial e `branch` (Git Worktree isolado) para spikes. A branch `master` deve permanecer sempre verde e protegida por `./scripts/verify.sh`.

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
