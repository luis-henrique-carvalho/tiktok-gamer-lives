# Plano de Implementação — MVP Plataforma de Lives Interativas (Walking Skeleton com TDD)

> **Status do Plano**: Em Execução  
> **Especificação Arquitetural de Referência**: Consulte [docs/spec/architecture.md](../spec/architecture.md) para os diagramas, decisões e contratos SPI consolidados.  
> **Stack e Thresholds de Cobertura**: Consulte [docs/spec/stack.md](../spec/stack.md) (90% Backend, 85% Frontend).

Este documento estabelece o roteiro de execução prática do MVP (Walking Skeleton ponta a ponta) orientado a **TDD (Test-Driven Development)** nos módulos que concentram lógica de negócio, regras do jogo, deduplicação de eventos, ordenação serial e transições de estado, garantindo testes nos pontos de contato públicos (*seams*) sem acoplamento a detalhes de implementação interna.

---


## 1. Estrutura do Monorepo

```
tiktok-gamer-lives/
├── docker-compose.yml          # Postgres 17, Redis 7, apps/api, apps/web
├── pnpm-workspace.yaml         # Configuração dos workspaces (sem packages/)
├── package.json                # Scripts globais (dev, build, lint, test)
├── tsconfig.base.json          # Configuração base de TypeScript
├── apps/
│   ├── api/                    # Backend: Autoridade do domínio
│   │   ├── Dockerfile.dev
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts        # Inicialização do processo
│   │       ├── app.ts          # Montagem Fastify, handler de erros e OpenAPI
│   │       ├── contracts/      # SPI e tipos internos ao backend
│   │       │   ├── engine.ts
│   │       │   ├── ingress.ts
│   │       │   └── session.ts
│   │       ├── common/         # Configuração e Host agnóstico a jogos
│   │       │   ├── config/env.ts
│   │       │   ├── domain/errors/
│   │       │   ├── registry/game-registry.ts
│   │       │   ├── executor/
│   │       │   │   ├── application/usecases/process-game-command.usecase.ts
│   │       │   │   ├── application/repositories/
│   │       │   │   └── infrastructure/   # Worker e repositórios Drizzle
│   │       │   ├── timers/
│   │       │   └── infrastructure/
│   │       │       ├── http/            # Health, erros e docs da API
│   │       │       ├── database/drizzle/ # Cliente, schema e migrações
│   │       │       ├── queue/           # Conexão Redis e filas BullMQ
│   │       │       └── socket/          # Publicação Socket.IO
│   │       └── modules/
│   │           ├── games/axb/          # Engine, mapper, projection e testes puros
│   │           ├── sessions/
│   │           │   ├── domain/session.entity.ts
│   │           │   ├── application/usecases/      # Criar, iniciar, pausar, retomar, encerrar
│   │           │   ├── application/repositories/session.repository.ts
│   │           │   └── infrastructure/
│   │           │       ├── database/drizzle/drizzle-session.repository.ts
│   │           │       └── http/                  # controllers, dtos, routes/docs
│   │           ├── ingress/
│   │           │   ├── application/usecases/process-interaction.usecase.ts
│   │           │   ├── application/repositories/interaction.repository.ts
│   │           │   └── infrastructure/
│   │           │       ├── database/drizzle/drizzle-interaction.repository.ts
│   │           │       ├── queue/ingress.worker.ts
│   │           │       ├── tiktok/
│   │           │       ├── simulator/
│   │           │       └── http/                  # controllers, dtos, routes/docs
│   │           └── auth/infrastructure/            # Better Auth e suas rotas
│   │
│   └── web/                    # Frontend: Consumidor da API pública
│       ├── Dockerfile.dev
│       ├── package.json
│       ├── vite.config.ts
│       ├── components.json     # shadcn/ui (New York, Slate)
│       └── src/
│           ├── api/            # Tipagem local + client HTTP para payloads REST e Socket.IO
│           │   ├── types.ts    # Tipos locais: SessionResponse, AxBProjectionPayload, SnapshotEvent, etc.
│           │   └── client.ts   # Funções fetch tipadas (createSession, startSession, pauseSession, etc.)
│           ├── routes/         # Rotas tipadas do TanStack Router/Start
│           │   ├── __root.tsx
│           │   ├── index.tsx
│           │   ├── login.tsx
│           │   ├── dashboard.tsx
│           │   └── overlay.tsx
│           ├── features/       # Módulos verticais Feature-Driven
│           │   ├── auth/       # LoginForm, RegisterForm, useAuth, LoginView
│           │   │   ├── views/
│           │   │   ├── components/
│           │   │   ├── hooks/
│           │   │   └── services/
│           │   ├── dashboard/  # SessionControls, AxBConfigForm, SimulatorPanel, MetricsCard, DashboardView
│           │   │   ├── views/
│           │   │   ├── components/
│           │   │   ├── hooks/
│           │   │   ├── services/
│           │   │   └── stores/
│           │   └── overlay/    # OverlayView, themes/ (NeonArena, Minimal), AudioEffectPlayer
│           │       ├── views/
│           │       ├── components/
│           │       ├── themes/
│           │       └── stores/
│           ├── components/ui/  # Primitivos shadcn/ui
│           ├── styles/         # Tailwind CSS v4 (index.css, theme.css)
│           └── lib/            # utils, query-client, socket-client, auth-client
│               ├── utils.ts
│               ├── query-client.ts
│               ├── socket-client.ts
│               └── auth-client.ts
```

Esta árvore descreve a organização atual e o destino das próximas fases. A fase 2 reside em `src/modules/games/axb/` e `src/common/registry/`. Não se criam pastas de camadas vazias no jogo A x B nem casos de uso de login que dupliquem o Better Auth.

---

## 2. Fases de Implementação Detalhadas (Com TDD nos Módulos Críticos)

A implementação é dividida em **9 fases sequenciais**, detalhando objetivos, metodologia (TDD vs Scaffolding), costuras sob teste (seams) e critérios de conclusão verificáveis.

---

### Fase 1: Fundação do Monorepo e Docker Compose — `[CONCLUÍDA]`

- **Objetivo**: Estabelecer o monorepo pnpm com dois apps (`api` e `web`), orquestração de contêineres e bootstrap mínimo de cada app.
- **Metodologia**: Scaffolding e Configuração estrutural (TDD nos módulos de configuração e rotas).
- **Status de Execução**: **Concluída com 100% de Cobertura no Backend e Frontend**.
- **Arquivos Criados & Validados**:
  - `docker-compose.yml` (Postgres 17, Redis 7, apps/api Fastify em Node 24.21.0, apps/web TanStack Router em Node 24.21.0).
  - `.env` e `.env.example` configurados na raiz e em cada workspace.
  - `apps/api/src/common/config/env.ts` (validação com Zod; movido após a conclusão da fase).
  - `apps/api/src/app.ts` e `apps/api/src/index.ts` (Fastify 5 com health check e CORS).
  - `apps/web/src/styles/index.css` (tema Tweakcn Enterprise Mod 2 em Tailwind v4).
  - `apps/web/src/components/ui/` (catálogo completo de 47 componentes Shadcn UI).
  - `apps/web/src/components/ui/typography.tsx` (Typography estritamente tipado).
  - `apps/web/src/routes/__root.tsx` e `apps/web/src/routes/index.tsx` (rotas base).
- **Critério de Conclusão**: `pnpm install` executa sem erros; `docker compose up -d --build` sobe 4 serviços saudáveis; `GET /health` retorna `200`; `http://localhost:5176` renderiza a aplicação Web; `./scripts/verify.sh` passa 100%.

---

### Fase 2: Motor de Regras A x B & Game Registry (TDD no Domínio Puro) — `[CONCLUÍDA]`

- **Objetivo**: Implementar o motor de regras determinístico do jogo **A x B** (`RG-01` a `RG-12`) e o catálogo `GameRegistry`, 100% puro e sem I/O, guiado por testes rigorosos. Todos os contratos, tipos e constantes são internos a `apps/api`.
- **Metodologia**: **TDD Rigoroso (Red → Green)** usando Vitest.
- **Costuras sob Teste (Seams)**:
  - `AxBGameEngine.applyCommand(state, command, context)`
  - `AxBInputMapper.mapInteraction(interaction, config)`
  - `AxBProjection.project(state, config, meta)`
  - `GameRegistry.registerGame(module)` e `GameRegistry.getGame(gameId)`
- **Ciclos TDD**:
  1. *Ciclo 1 (Votos e Cooldown)*:
     - **Red**: Teste para `RG-01` (comentários válidos `A`/`B` pontuam +1; textos inválidos como `time A` ou `AAAA` são ignorados) e `RG-02` (cooldown de 5 segundos compartilhado entre A e B por usuário).
     - **Green**: Implementação mínima em `mapper.ts` e `engine.ts`.
  2. *Ciclo 2 (Presentes e Unidades Reconhecidas)*:
     - **Red**: Teste para `RG-04` e `RG-05` (o mapper usa `resourceKey`; recebe unidades já reconhecidas e o engine converte essas unidades em pontos sem processar contagens cumulativas).
     - **Green**: Implementação do mapeamento de recurso e conversão de unidades em `engine.ts`.
  3. *Ciclo 3 (Vitória, Excedente e Timer de Intervalo)*:
     - **Red**: Teste para `RG-09` e `RG-10` (primeira contribuição que atinge/ultrapassa a meta define vitória, pontos excedentes ficam no placar da rodada e motor emite `timerRequests` de 5.000 ms para intervalo).
     - **Green**: Lógica de declaração de vitória e emissão declarativa de timer.
  4. *Ciclo 4 (Pausa e Fila de Pendências)*:
     - **Red**: Teste para `RG-03`, `RG-08`, `RG-11` e `RG-12` (em pausa ou intervalo, comentários são descartados; contribuições reconhecidas ficam pendentes; `RESUME` as drena FIFO preservando o placar da rodada; vitória interrompe a drenagem e conserva o restante para a próxima rodada).
     - **Green**: Tratamento de contexto pausado, comando explícito de retomada e pendências.
  5. *Ciclo 5 (Game Registry)*:
     - **Red**: Teste para registrar múltiplos módulos de jogo e recuperar por `gameId`.
     - **Green**: Implementação de `apps/api/src/common/registry/game-registry.ts`.
- **Arquivos entregues na fase 2**:
  - `apps/api/src/contracts/engine.ts` (`GameModule`, `GameEngine`, `GameInputMapper`, `GameProjection`, `TimerRequest`).
  - `apps/api/src/contracts/ingress.ts` (`CommentInteraction`, `GiftInteraction`, `NormalizedInteraction`, `ConnectionStatus`).
  - `apps/api/src/contracts/session.ts` (`SessionState`, `SnapshotEnvelope`).
  - `apps/api/src/modules/games/axb/types.ts` (`AxBState`, `AxBCommand`, `AxBProjection`, `AxBConfig`).
  - `apps/api/src/modules/games/axb/schema.ts` (schemas Zod de configuração).
  - `apps/api/src/modules/games/axb/constants.ts` (regras de recurso e defaults).
  - `apps/api/src/modules/games/axb/__tests__/engine.test.ts`
  - `apps/api/src/modules/games/axb/__tests__/mapper.test.ts`
  - `apps/api/src/modules/games/axb/engine.ts`
  - `apps/api/src/modules/games/axb/mapper.ts`
  - `apps/api/src/modules/games/axb/projection.ts`
  - `apps/api/src/modules/games/axb/index.ts`
  - `apps/api/src/common/registry/__tests__/game-registry.test.ts`
  - `apps/api/src/common/registry/game-registry.ts`

**Contrato para as fases de ingresso:** um presente normalizado traz `resourceKey` opaco com namespace de origem, contagem cumulativa e identidade de sequência quando disponível. O núcleo de ingresso é responsável por deduplicação, reconhecimento de incremento, confiabilidade da identidade e persistência atômica do cursor com as novas unidades. Somente então entrega `RecognizedGiftContribution` (`resourceKey`, `units`) ao mapper A x B. Nem mapper nem engine comparam contagens cumulativas ou mantêm estado de combo. A implementação de ingresso, armazenamento/cursor e adaptadores externos permanece nas fases 3–5.
- **Critério de Conclusão**: 100% dos testes unitários de domínio passando no Vitest (`pnpm --filter api test`). Nenhuma dependência de I/O nos módulos testados.

---

### Fase 3: Persistência (PostgreSQL + Drizzle) & Better Auth

- **Objetivo**: Configurar a camada de dados relacional com Drizzle ORM no PostgreSQL, os contratos e adaptadores de repositório necessários às próximas fases e a autenticação com Better Auth. Tudo dentro de `apps/api`.
- **Metodologia**: Híbrido (Scaffold de schemas relacionais + Teste de integração de persistência e auth).
- **Arquivos a Criar**:
  - `apps/api/src/common/infrastructure/database/drizzle/schema.ts` (tabelas: `users`, `sessions`, `accounts`, `game_sessions`, `interactions`, `game_commands`, `game_snapshots`, `game_rounds`).
  - `apps/api/src/common/infrastructure/database/drizzle/client.ts` e `migrations/` (conexão e migrações PostgreSQL).
  - `apps/api/src/modules/sessions/application/repositories/session.repository.ts` e `apps/api/src/modules/sessions/infrastructure/database/drizzle/drizzle-session.repository.ts`.
  - `apps/api/src/modules/ingress/application/repositories/interaction.repository.ts` e `apps/api/src/modules/ingress/infrastructure/database/drizzle/drizzle-interaction.repository.ts`.
  - `apps/api/src/common/executor/application/repositories/` (interfaces de comandos e snapshots) e `apps/api/src/common/executor/infrastructure/database/drizzle/` (implementações).
  - `apps/api/src/modules/auth/infrastructure/better-auth.ts` e `apps/api/src/modules/auth/infrastructure/http/routes/auth.routes.ts` (Better Auth com Drizzle adapter).
- **Regra de dependência**: interfaces de repositório pertencem à aplicação; implementações Drizzle pertencem à infraestrutura. Casos de uso não importam schema, cliente Drizzle nem DTO HTTP. Better Auth fornece os fluxos padrão de registro, login e sessão.
- **Critério de Conclusão**: Containers Postgres e Redis sobem via `docker compose up -d postgres redis`; migrações Drizzle rodam com sucesso; script de teste confirma criação e validação de sessão do Better Auth no banco.

---

### Fase 4: Filas BullMQ, Ingress Worker & Serial Executor (TDD na Orquestração)

- **Objetivo**: Construir a infraestrutura assíncrona com BullMQ (`ingress-queue`, `game-commands-queue`), garantindo deduplicação, execução serial estrita (FIFO conc=1) e persistência atômica de snapshots.
- **Metodologia**: **TDD Rigoroso (Red → Green)** com Redis e PostgreSQL.
- **Costuras sob Teste (Seams)**:
  - `ProcessInteractionUseCase.execute(rawInteraction)` e `IngressWorker.process(rawInteraction)`.
  - `ProcessGameCommandUseCase.execute(commandJob)` via worker serial BullMQ.
  - Casos de uso de sessão `create/start/pause/resume/end`.
- **Ciclos TDD**:
  1. *Ciclo 1 (Ingress & Deduplicação)*:
     - **Red**: Teste que envia duas interações com mesma `idempotencyKey` e verifica que apenas uma é persistida e enfileirada no `game-commands-queue`.
     - **Green**: Implementação de `apps/api/src/modules/ingress/application/usecases/process-interaction.usecase.ts` e `apps/api/src/modules/ingress/infrastructure/queue/ingress.worker.ts`.
  2. *Ciclo 2 (Execução Serial FIFO com concorrência 1)*:
     - **Red**: Teste que dispara 20 comandos simultâneos e valida que são processados em ordem sequencial estrita, gerando versões incrementais de snapshots sem race conditions.
     - **Green**: Implementação de `apps/api/src/common/executor/application/usecases/process-game-command.usecase.ts` e `apps/api/src/common/executor/infrastructure/queue/command.worker.ts`.
  3. *Ciclo 3 (Timers Declarativos e Intervalo de 5s)*:
     - **Red**: Teste que simula vitória e verifica agendamento do delayed job de 5.000 ms no BullMQ, acionando o comando de início da rodada seguinte ao expirar.
     - **Green**: Integração de timers declarativos no executor serial genérico de `common/executor/`.
  4. *Ciclo 4 (Ciclo de Sessão & Pausa)*:
     - **Red**: Teste que pausa a sessão, envia presentes (que viram pendências no Postgres) e na retomada drena as pendências em FIFO antes de aceitar novos eventos.
     - **Green**: Implementação dos casos de uso em `apps/api/src/modules/sessions/application/usecases/`.
- **Arquivos a Criar**:
  - `apps/api/src/common/infrastructure/queue/` (conexão Redis, `ingress-queue` e `game-commands-queue`).
  - `apps/api/src/modules/ingress/application/usecases/process-interaction.usecase.ts` e `apps/api/src/modules/ingress/infrastructure/queue/ingress.worker.ts`.
  - `apps/api/src/common/executor/application/usecases/process-game-command.usecase.ts` e `apps/api/src/common/executor/infrastructure/queue/command.worker.ts`.
  - `apps/api/src/common/timers/` (agendamento de delayed jobs declarativos).
  - `apps/api/src/modules/sessions/domain/session.entity.ts` e `apps/api/src/modules/sessions/application/usecases/` (criar, iniciar, pausar, retomar e encerrar).
  - Testes dos casos de uso, worker de ingresso e executor serial, incluindo deduplicação, FIFO e transação de snapshot.
- **Critério de Conclusão**: Testes de integração de filas e transações passando no Vitest com Docker ativo.

---

### Fase 5: Adaptadores (TikTok, Simulador), Socket.IO & Rotas Fastify

- **Objetivo**: Integrar os adaptadores externos de captura, o gerador de tráfego sintético, o gateway Socket.IO para streaming em tempo real pós-commit e os endpoints REST no Fastify.
- **Metodologia**: Testes de Integração de rotas e adaptadores (incluindo teste de estresse de rajada CA-11).
- **Costuras sob Teste (Seams)**:
  - Endpoints REST Fastify (`/api/session/*`, `/api/simulator/*`, `/api/tiktok/*`).
  - Eventos de broadcast Socket.IO (`snapshot`, `contribution_alert`).
  - Carga sintética do simulador (200 eventos/s por 60s).
- **Resiliência — Heartbeat do Adaptador TikTok**:
  > A biblioteca `tiktok-live-connector` depende de engenharia reversa dos Protobufs do TikTok Web. Conexões podem cair silenciosamente ou o TikTok pode mudar a estrutura dos pacotes.
  - O `TikTokLiveCaptureAdapter` implementa um **watchdog de heartbeat**: se nenhum pacote nativo do WebSocket do TikTok for recebido em `N` segundos (configurável, default 15s), força reconexão agressiva com backoff exponencial (1s → 2s → 4s → max 30s).
  - Em cada falha de heartbeat ou reconexão, emite evento `tiktok:connection_warning` via Socket.IO para o `/dashboard` do operador, com timestamp, motivo e contagem de tentativas.
  - Após `maxReconnectAttempts` (default 10), emite `tiktok:connection_lost` e muda o status da sessão para indicar ingestão parada — sem derrubar a sessão, permitindo reconexão manual pelo operador.
- **Resiliência — Coalescência de Snapshots no Socket.IO**:
  > Sob rajadas de 200 eventos/s, emitir um evento Socket.IO por cada snapshot é desperdício de bandwidth e causa sobrecarga nos clientes.
  - O `SocketIOPublisher` implementa **coalescência server-side**: acumula snapshots em janela configurável (default 50ms) e emite apenas o snapshot mais recente (latest-wins) por janela, reduzindo de ~200 emissões/s para ~20 emissões/s.
  - Eventos `contribution_alert` são emitidos imediatamente (sem coalescência) para garantir feedback visual instantâneo.
- **Arquivos a Criar**:
  - `apps/api/src/modules/ingress/infrastructure/tiktok/tiktok-capture.adapter.ts` (`TikTokLiveCaptureAdapter` com heartbeat, reconexão e alertas ao dashboard).
  - `apps/api/src/modules/ingress/infrastructure/simulator/simulator-capture.adapter.ts` (tráfego sintético contínuo e rajada CA-11).
  - `apps/api/src/common/infrastructure/socket/socketio-snapshot-publisher.ts` (coalescência de snapshots e alertas imediatos).
  - `apps/api/src/modules/sessions/infrastructure/http/` com `controllers/`, `dtos/`, `routes/` e `routes/docs/` (sessão e exportação de auditoria JSON).
  - `apps/api/src/modules/ingress/infrastructure/http/` com `controllers/`, `dtos/`, `routes/` e `routes/docs/` (simulador e conexão TikTok).
  - Schemas OpenAPI de cada rota nos respectivos `routes/docs/`; o handler global e `/api/docs/` já existem em `common/infrastructure/http/` e `app.ts`.
  - `apps/api/src/app.ts` e `apps/api/src/index.ts` (composição dos adaptadores e inicialização na porta 3001).
  - Testes de integração das rotas, do watchdog e da rajada CA-11 junto dos respectivos módulos.
- **Critério de Conclusão**: Servidor Fastify respondendo com status 200/201 nas rotas; clientes Socket.IO recebendo snapshots coalescidos com projeção correta; teste de rajada CA-11 executado com convergência total do placar; watchdog do TikTok dispara reconexão após timeout simulado.

---

### Fase 6: Frontend — TanStack Start, Base shadcn/ui & Autenticação

- **Objetivo**: Configurar a fundação do frontend `apps/web` baseada em `viralforge/web`, com Vite, React 19, Tailwind CSS v4, componentes primitivos shadcn/ui e tela de login protegida por Better Auth.
- **Metodologia**: Scaffolding e UI Features (primitivos declarativos).
- **Arquivos a Criar**:
  - `apps/web/components.json` (shadcn/ui New York Slate).
  - `apps/web/src/styles/index.css` e `apps/web/src/styles/theme.css`.
  - `apps/web/src/lib/utils.ts`, `query-client.ts`, `auth-client.ts`.
  - `apps/web/src/lib/socket-client.ts` — **Com acumulador de snapshots (batching)**:
    > Sob rajadas, o servidor pode emitir ~20 snapshots/s (após coalescência server-side). Mesmo assim, atualizar o estado do React a cada evento causa re-renders excessivos que bloqueiam o thread principal do browser — especialmente no OBS Browser Source.
    - O `socket-client` implementa um **acumulador `requestAnimationFrame`**: recebe eventos `snapshot` do Socket.IO, guarda apenas o snapshot mais recente em uma variável mutable (latest-wins, sem setState), e a cada frame (`requestAnimationFrame` ~60fps) faz flush para o Zustand store somente se houve mudança desde o último frame.
    - Resultado: independente de quantos snapshots cheguem por segundo, o React re-renderiza no máximo **60 vezes por segundo**, alinhado com a taxa de atualização do display e do OBS.
    - Eventos `contribution_alert` continuam sendo processados imediatamente (sem acumulador) para feedback instantâneo.
  - `apps/web/src/api/types.ts` — **Tipos locais** dos payloads REST e Socket.IO consumidos:
    ```typescript
    // Tipos que o frontend define LOCALMENTE para consumir a API
    export interface SessionResponse { id: string; status: string; gameId: string; /* ... */ }
    export interface AxBProjectionPayload { scoreA: number; scoreB: number; round: number; /* ... */ }
    export interface SnapshotEvent { type: 'snapshot'; payload: AxBProjectionPayload; version: number; }
    export interface ContributionAlertEvent { type: 'contribution_alert'; username: string; /* ... */ }
    ```
  - `apps/web/src/api/client.ts` — Funções fetch tipadas para os endpoints REST:
    ```typescript
    export async function createSession(config: CreateSessionInput): Promise<SessionResponse> { /* ... */ }
    export async function startSession(sessionId: string): Promise<void> { /* ... */ }
    export async function pauseSession(sessionId: string): Promise<void> { /* ... */ }
    ```
  - `apps/web/src/components/ui/` (`button.tsx`, `card.tsx`, `input.tsx`, `slider.tsx`, `switch.tsx`, `badge.tsx`, `progress.tsx`, `tabs.tsx`, `select.tsx`, `tooltip.tsx`, `sonner.tsx`).
  - `apps/web/src/routes/__root.tsx` (QueryClient, Tooltip, Toaster, Devtools).
  - `apps/web/src/routes/index.tsx`, `apps/web/src/routes/login.tsx`.
  - `apps/web/src/features/auth/views/LoginView.tsx`, `components/LoginForm.tsx`.
- **Critério de Conclusão**: Aplicação web inicia na porta 5176 sem erros; tela de login renderiza; fluxo de registro e login com Better Auth funciona gravando sessão; `apps/web` não tem nenhuma dependência de workspace para `apps/api`.

---

### Fase 7: Frontend — Dashboard do Operador (`/dashboard`)

- **Objetivo**: Implementar o painel completo do streamer em `features/dashboard/`, permitindo configurar regras, operar a sessão, acionar o simulador e monitorar métricas em tempo real.
- **Metodologia**: Desenvolvimento Feature-Driven & Integração de Estado com Zustand e TanStack Query.
- **Arquivos a Criar**:
  - `apps/web/src/routes/dashboard.tsx`.
  - `apps/web/src/features/dashboard/views/DashboardView.tsx`.
  - `apps/web/src/features/dashboard/components/SessionControls.tsx` (Iniciar, Pausar, Retomar, Encerrar).
  - `apps/web/src/features/dashboard/components/AxBConfigForm.tsx` (Nomes, cores, meta, tabela de presentes).
  - `apps/web/src/features/dashboard/components/TikTokConnectorCard.tsx` (Status e conexão @username).
  - `apps/web/src/features/dashboard/components/SimulatorPanel.tsx` (Disparos manuais, slider de tráfego contínuo, disparador de rajada).
  - `apps/web/src/features/dashboard/components/MetricsCard.tsx` (Latência p95/p99, taxa de eventos/s, profundidade da fila).
  - `apps/web/src/features/dashboard/components/EventsHistoryLog.tsx`.
  - `apps/web/src/features/dashboard/services/session-api.ts`.
  - `apps/web/src/features/dashboard/stores/useDashboardStore.ts`.
- **Critério de Conclusão**: Operador consegue configurar regras do A x B, iniciar uma sessão de simulação, disparar eventos manuais e tráfego contínuo, visualizar logs e métricas atualizadas em tempo real.

---

### Fase 8: Frontend — Overlay OBS (`/overlay`), Templates & Efeitos de Áudio

- **Objetivo**: Desenvolver a tela transparente 1080×1920 para o OBS Browser Source, com sistema desacoplado de templates plugáveis e sintetizador procedural de áudio com Web Audio API.
- **Metodologia**: Visual, Animações CSS & Áudio Web API.
- **Arquivos a Criar**:
  - `apps/web/src/routes/overlay.tsx`.
  - `apps/web/src/features/overlay/views/OverlayView.tsx` (Layout 1080×1920, fundo transparente, distintivo permanente de simulação).
  - `apps/web/src/features/overlay/themes/NeonArenaTheme.tsx` (Torres neon com barras de energia, partículas e altura proporcional aos pontos).
  - `apps/web/src/features/overlay/themes/MinimalTheme.tsx` (Layout minimalista esport de alto contraste).
  - `apps/web/src/features/overlay/components/ContributionAlertBadge.tsx` (Badge com nome do espectador, presente e pontos).
  - `apps/web/src/features/overlay/components/RoundCelebrationBanner.tsx` (Banner de vitória e contagem regressiva de 5s).
  - `apps/web/src/features/overlay/components/AudioEffectPlayer.tsx` — **Com limitador de polifonia**:
    > 50 presentes disparados no mesmo segundo criam 50 instâncias de som sobrepostas, resultando em distorção digital (clipping) e saturação da CPU do OBS.
    - Implementa um **cooldown por tipo de som** (configurável, default 80ms): se o mesmo tipo de efeito (ex: "rosa") é disparado dentro da janela de cooldown, não cria nova instância de `OscillatorNode`.
    - Em vez de tocar novamente, aplica **pitch escalation**: incrementa levemente a frequência do oscilador ativo (+20Hz por evento agrupado) e aumenta o gain em +1dB (com teto de segurança), dando sensação de escala e urgência sem multiplicar instâncias.
    - Limite máximo de **4 vozes simultâneas** (`maxPolyphony`): se 4 sons diferentes estão tocando, o mais antigo é terminado (FIFO) antes de iniciar o novo.
    - Sons de vitória/fanfarra são exceção: sempre tocam imediatamente com prioridade, cancelando efeitos de contribuição ativos.
  - `apps/web/src/features/overlay/stores/useOverlayStore.ts`.
- **Critério de Conclusão**: Overlay renderiza no OBS a 60 FPS com fundo transparente; torres sobem proporcionalmente às pontuações recebidas via Socket.IO; áudio toca sincronizado; ao bater a meta, a celebração e a contagem de 5s são exibidas perfeitamente.

---

### Fase 9: Verificação Integrada de Ponta a Ponta no Docker Compose

- **Objetivo**: Subir a stack inteira em contêineres Docker e validar o fluxo completo do MVP.
- **Metodologia**: E2E Smoke Testing e validação dos Critérios de Aceite (CA-01 a CA-15).
- **Passos de Verificação**:
  1. Executar `docker compose up --build -d` e verificar todos os serviços com status `healthy`.
  2. Acessar `http://localhost:5176/login`, registrar operador e entrar no `/dashboard`.
  3. Iniciar sessão em Modo Simulação com meta de 1.000 pontos.
  4. Abrir `/overlay` no OBS ou navegador (1080×1920).
  5. Testar comentários e presentes via simulador: validar placar, torres subindo, sons tocando.
  6. Disparar presentes até bater a meta: validar vitória, intervalo de 5s e início automático da rodada 2.
  7. Testar pausa: validar descarte de comentários e retenção de presentes como pendências, drenadas na retomada.
  8. Testar conexão com live real pública do TikTok e validar sincronização do catálogo.
  9. Exportar histórico JSON da sessão e validar auditoria completa sem vazamento de credenciais.
- **Critério de Conclusão**: Stack 100% funcional no Docker Compose atendendo a todos os critérios de aceite.

---

## 6. Plano de Verificação

### 6.1. Resumo dos Testes por Camada e Fase
| Tipo de Teste | Fase | Seam / Módulo Testado | Ferramenta |
| :--- | :--- | :--- | :--- |
| **Unitário (TDD)** | Fase 2 | Regras RG-01 a RG-12 do motor A x B | Vitest |
| **Unitário (TDD)** | Fase 2 | Isolamento e registro no `GameRegistry` | Vitest |
| **Integração (TDD)** | Fase 4 | Deduplicação de ingress e chave de idempotência | Vitest + Redis + Postgres |
| **Integração (TDD)** | Fase 4 | Execução serial FIFO conc=1 e transações | Vitest + BullMQ |
| **Integração (TDD)** | Fase 4 | Timers declarativos e intervalos de rodada | Vitest + BullMQ |
| **Carga / Estresse** | Fase 5 | Rajada sintética 200 eventos/s por 60s (CA-11) | Script Node / Vitest |
| **E2E / Visual** | Fase 9 | Fluxo completo Dashboard + Overlay no OBS (CA-01 a CA-15) | Docker Compose |
