# Plano de Implementação — Fase 1: Fundação de Infraestrutura & Docker Compose

> **Status**: Proposto (Aguardando Aprovação no Gate 1)  
> **Referência Principal**: [docs/plans/mvp-walking-skeleton.md](file:///home/luis/repositories/tiktok-gamer-lives/docs/plans/mvp-walking-skeleton.md)  
> **Design & Governança**: [GEMINI.md](file:///home/luis/repositories/tiktok-gamer-lives/GEMINI.md), [docs/spec/architecture.md](file:///home/luis/repositories/tiktok-gamer-lives/docs/spec/architecture.md), [docs/spec/stack.md](file:///home/luis/repositories/tiktok-gamer-lives/docs/spec/stack.md)

---

## 1. Visão Geral e Contexto

A **Fase 1** estabelece os alicerces de execução do monorepo, infraestrutura conteinerizada e design system visual:
1. Orquestração multi-contêiner via **Docker Compose** com Node.js **24.21.0 (LTS)** em imagens slim, orquestrando **PostgreSQL 17**, **Redis 7**, **API (Fastify 5)** e **Web (TanStack Start / Vite)**.
2. Bootstrap do Backend em `apps/api` com validação tipada de variáveis de ambiente com **Zod**, servidor **Fastify 5** com health check `GET /health` e suporte a CORS.
3. Configuração do Design System em `apps/web` com **Tailwind CSS v4**, aplicação do tema shadcn customizado (**Enterprise Mod 2** via tweakcn), instalação de todos os componentes do catálogo shadcn UI e criação do componente **Typography** fortemente tipado (zero `any`) referenciado no ViralForge e fiscalizado pelo `check_shadcn_usage.py`.
4. Roteamento mínimo no frontend (`__root.tsx` e `index.tsx`) exibindo a página placeholder com estado da plataforma.
5. Garantia dos thresholds de cobertura do Vitest V8 (**90% no Backend** e **85% no Frontend**) e validação 100% verde no `./scripts/verify.sh`.

---

## 2. Requisitos Específicos do Usuário

1. **Node.js 24.21.0 (LTS)** nas imagens Docker (`apps/api/Dockerfile.dev` e `apps/web/Dockerfile.dev`).
2. **Tema shadcn**: [tweakcn theme cmlva2weo000104jr85nt08re](https://tweakcn.com/r/themes/cmlva2weo000104jr85nt08re) (Enterprise Mod 2 com OKLCH colors, Inter font, JetBrains Mono e radius 1.4rem).
3. **Catálogo shadcn completo**: Instalação de todos os componentes de UI via CLI pnpm/shadcn.
4. **Typography UI**: Implementação de `apps/web/src/components/ui/typography.tsx` estruturado com base no tema e na referência `/home/luis/repositories/viralforge/web/src/components/ui/typography.tsx`, com tipagem estrita TypeScript (sem `any`), suporte a `asChild` via `@radix-ui/react-slot`, `as` polimórfico e atributos semânticos para o linter de shadcn.

---

## 3. Arquitetura e Contratos

```
┌─────────────────────────────────────────────────────────────┐
│                       Docker Compose                        │
│                                                             │
│   ┌───────────────┐     ┌───────────────┐                   │
│   │ postgres:17   │     │ redis:7       │                   │
│   │ port: 5432    │     │ port: 6379    │                   │
│   └───────▲───────┘     └───────▲───────┘                   │
│           │                     │                           │
│   ┌───────┴─────────────────────┴───────┐                   │
│   │ apps/api (Node 24.21.0)             │                   │
│   │ Fastify 5 + Zod Env + Health Check  │                   │
│   │ port: 3001                          │                   │
│   └─────────────────▲───────────────────┘                   │
│                     │ /api proxy                            │
│   ┌─────────────────┴───────────────────┐                   │
│   │ apps/web (Node 24.21.0)             │                   │
│   │ Vite 6 / React 19 / TanStack Router │                   │
│   │ Tailwind v4 + Shadcn UI + Typography│                   │
│   │ port: 5176                          │                   │
│   └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

- **Isolamento Estrito**: `apps/api` e `apps/web` são totalmente isolados; nenhum pacote compartilhado.
- **Portas**: API na porta `3001`, Web na porta `5176`, Postgres na porta `5432`, Redis na porta `6379`.
- **Live Reload**: Montagem de volumes com bind mount local (`. :/app`) e volumes anônimos para `node_modules` preservando dependências linux do contêiner.

---

## 4. Plano de Execução Sequencial (Subagentes)

### 4.1. Backend Builder (`apps/api` & Docker Compose)
- **Instalação Canônica**: `pnpm --filter api add @fastify/cors`
- **Ambiente & Configuração**:
  - Criar `apps/api/src/config/env.ts` com validação Zod (`PORT`, `HOST`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`).
  - Criar teste `apps/api/src/config/__tests__/env.test.ts`.
- **Servidor Fastify**:
  - Criar factory do Fastify em `apps/api/src/app.ts` com CORS e rota `GET /health` retornando status, uptime e timestamp.
  - Atualizar `apps/api/src/index.ts` para inicializar a aplicação com shutdown gracioso.
  - Criar teste de integração Fastify `apps/api/src/__tests__/app.test.ts`.
- **Conteinerização**:
  - Criar `apps/api/Dockerfile.dev` baseado em `node:24.21.0-slim` com pnpm 12.5.1.
  - Criar `docker-compose.yml` na raiz com serviços `postgres`, `redis`, `api`, `web`.
- **Threshold**: Garantir 90%+ de cobertura no backend.

### 4.2. Frontend Builder (`apps/web` & Shadcn Design System)
- **Instalação Canônica via CLI**:
  - `pnpm --filter web add tailwindcss @tailwindcss/vite tw-animate-css clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-slot @tanstack/react-router @tanstack/react-query date-fns`
  - Dependências dos componentes shadcn (Radix primitives, cmdk, vaul, sonner, etc.).
  - Dev dependencies: `@tanstack/router-plugin`, `@types/node`.
- **Configuração Shadcn & Tailwind v4**:
  - Criar `apps/web/components.json` configurado para Tailwind v4 (`src/styles/index.css`, `@/components/ui`, etc.).
  - Criar `apps/web/src/lib/utils.ts` com função `cn()`.
  - Configurar `apps/web/src/styles/index.css` com o tema tweakcn completo (`oklch` tokens, fontes, shadows, @layer base, @theme inline).
- **Catálogo Shadcn & Typography**:
  - Instalar todos os componentes shadcn no diretório `apps/web/src/components/ui/`.
  - Criar `apps/web/src/components/ui/typography.tsx` adaptado do ViralForge, sem `any`, suportando `asChild`, `as` e variantes canônicas (`h1`-`h4`, `p`, `lead`, `large`, `small`, `muted`, `destructive`, `inlineCode`, `blockquote`, `list`).
  - Criar `apps/web/src/components/ui/__tests__/typography.test.tsx` com testes de renderização e acessibilidade.
- **Roteamento & Shell**:
  - Criar `apps/web/vite.config.ts` com plugins TanStack Router, Tailwind CSS v4, React e proxy para `/api` na porta 3001.
  - Criar `apps/web/index.html` com suporte a fontes e dark mode.
  - Criar `apps/web/src/main.tsx` inicializando TanStack Router.
  - Criar `apps/web/src/routes/__root.tsx` e `apps/web/src/routes/index.tsx` (exibindo Card, Badge e Typography "Plataforma de Lives Interativas — Online").
  - Criar teste `apps/web/src/routes/__tests__/index.test.tsx` para assegurar cobertura >= 85%.
- **Conteinerização**:
  - Criar `apps/web/Dockerfile.dev` baseado em `node:24.21.0-slim`.

### 4.3. Test Verifier
- Executar `./scripts/verify.sh` validando:
  1. `check_shadcn_usage.py` (zero erros).
  2. Typecheck strict em ambos os apps.
  3. ESLint em ambos os apps.
  4. Vitest Coverage backend >= 90% e frontend >= 85%.
  5. Vite production build de `apps/web`.
- Testar orquestração Docker:
  - `docker compose config`
  - `docker compose up -d --build`
  - Validar `curl http://localhost:3001/health` retornando 200.
  - Validar `curl http://localhost:5176` respondendo HTML da aplicação.
  - Desligar com `docker compose down`.

### 4.4. Implementation Validator
- Code review contra a especificação técnica:
  - Zero `any`.
  - Zero `packages/shared`.
  - Obediência ao tema tweakcn e aos princípios SOLID/Ponytail.

---

## 5. Critérios de Aceite (Definition of Done)

- [ ] `docker-compose.yml` sobe os 4 serviços (`postgres`, `redis`, `api`, `web`) usando `node:24.21.0-slim` para os nós Node.js.
- [ ] `GET http://localhost:3001/health` retorna `HTTP 200` com `{ status: 'ok', uptime: number, timestamp: string }`.
- [ ] `http://localhost:5176` renderiza a aplicação Web sem erros de console, aplicando as variáveis do tema tweakcn.
- [ ] Catálogo completo shadcn UI disponível em `apps/web/src/components/ui/`.
- [ ] Componente `Typography` implementado, testado e em conformidade estrita com `scripts/check_shadcn_usage.py`.
- [ ] Script `./scripts/verify.sh` executa com sucesso total (100% verde) com backend >= 90% e frontend >= 85%.
