# Especificação da Stack Tecnológica — Plataforma de Lives Interativas

> **Status**: Ativo  
> **Referência Principal**: [AGENTS.md](../../AGENTS.md)

---

## 1. Visão Geral da Stack

| Camada | Tecnologia Principal | Versão / Detalhes | Justificativa Técnica |
| :--- | :--- | :--- | :--- |
| **Monorepo** | `pnpm` workspaces | 9+ | Isolamento rígido de dependências entre `apps/api` e `apps/web`. |
| **Backend Runtime** | Node.js | v22+ (LTS) | Suporte nativo a ESM, alta performance e tipagem estrita com TypeScript. |
| **Framework HTTP** | Fastify | v5+ | Baixo overhead de CPU e latência mínima para rotas de controle e simulação. |
| **Documentação da API** | `@fastify/swagger` + `@fastify/swagger-ui` | OpenAPI em `/api/docs/json`; interface em `/api/docs/` | Schemas junto às rotas de cada módulo, registrados pelo Fastify. |
| **Streaming Tempo Real** | Socket.IO | v4+ | Comunicação bidirecional resiliente com fallback WebSocket e reconexão automática. |
| **Filas & Mensageria** | Redis 7 + BullMQ | v5+ | Garantia estrita de concorrência 1 e FIFO determinístico nos comandos do jogo. |
| **Banco de Dados** | PostgreSQL 17 | Relacional + JSONB | Armazenamento de sessões, auditoria e persistência de snapshots opacos de jogo. |
| **ORM / Migrações** | Drizzle ORM | v0.38+ | TypeScript-first, zero overhead e migrações SQL determinísticas. |
| **Autenticação** | Better Auth | Drizzle adapter | Sessões seguras protegendo rotas administrativas do streamer. |
| **Captura TikTok** | `tiktok-live-connector` | v2.5.0 | Conexão direta às lives públicas sem necessidade de chave de API oficial. |
| **Frontend Core** | TanStack Start + React 19 | `@tanstack/react-start` + Vite | SSR/SPA unificado, tipagem ponta a ponta e HMR ultrarrápido com Vite. |
| **Roteamento & Query** | TanStack Router / Query | v1+ | Rotas fortemente tipadas no sistema de arquivos e cache reativo de dados. |
| **Estado do Cliente** | Zustand | v5+ | Gerenciamento de estado leve e desacoplado de ciclo de vida de componentes. |
| **Estilização & UI** | Tailwind CSS v4 + shadcn/ui | `@tailwindcss/vite` | Design system moderno, acessível e livre de dependências pesadas. |
| **Motor de Áudio** | Web Audio API | Procedural nativo | Síntese de efeitos sonoros sem carregar arquivos pesados para combos e pontos. |
| **Testes & Cobertura** | Vitest + `@vitest/coverage-v8` | v3+ | Testes unitários, de integração e thresholds estritos de cobertura de código. |
| **Containerização** | Docker & Docker Compose | v2+ | Ambiente local reproduzível para Postgres, Redis, API e Web. |

---

## 2. Estratégia de Cobertura de Testes & Quality Gates

A plataforma adota **Vitest com provedor V8 (`@vitest/coverage-v8`)** em ambos os aplicativos, fiscalizado pelo script central [scripts/verify.sh](../../scripts/verify.sh):

### 2.1. Thresholds Mínimos Obrigatórios

| Aplicativo | Módulo / Camada | Linhas | Funções | Ramos | Declarações |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`apps/api` (Backend)** | Motor de Regras (`modules/games/*`), Ingress Worker e Serial Executor | **90%** | **90%** | **85%** | **90%** |
| **`apps/web` (Frontend)** | Features, Views, Stores Zustand e Hooks | **85%** | **85%** | **80%** | **85%** |

### 2.2. Exclusões Canônicas de Cobertura
- Arquivos de declaração de tipos (`*.d.ts`, `*.types.ts`).
- Componentes primitivos não-modificados de terceiros (`components/ui/*`).
- Árvores de rotas geradas automaticamente (`routeTree.gen.ts`).
- Utilitários de mock e setup de testes (`test-utils/**`, `test-setup.ts`).

### 2.3. Execução dos Gates

```bash
# Validação completa (Shadcn Linter + Typecheck + ESLint + Vitest Coverage V8 + Build)
./scripts/verify.sh

# Apenas backend com cobertura (Meta: 90%)
./scripts/verify.sh --api

# Apenas frontend com cobertura (Meta: 85%)
./scripts/verify.sh --web

# Iteração rápida de TDD (sem relatório de cobertura)
./scripts/verify.sh --quick
```
