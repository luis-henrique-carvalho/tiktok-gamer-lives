# Especificação Técnica de Arquitetura — Plataforma de Lives Interativas

> **Status**: Ativo & Autoritativo  
> **Referência Principal no Repositório**: [AGENTS.md](../../AGENTS.md)

---

## 1. Visão Geral e Filosofia Arquitetural

A plataforma adota **Arquitetura Hexagonal (Ports & Adapters)** estrita, separando com rigor o **Núcleo da Plataforma (Host)** dos **Módulos de Jogo Plugáveis** e dos **Consumidores Externos** (Overlay OBS e Painel do Operador).

```mermaid
flowchart TD
    subgraph Driving_Adapters["Adaptadores Primários (Entrada)"]
        TTC[TikTok LIVE Connector] -->|Eventos Brutos| IQ[ingress-queue]
        SIM[Simulador no Dashboard] -->|HTTP REST| API_CTRL[Fastify Controllers]
        DASH[Dashboard do Operador] -->|HTTP REST: Auth/Sessão| API_CTRL
    end

    subgraph Core_Host["NÚCLEO DO HOST (Agnóstico a Regras de Jogo)"]
        INGRESS_W[Ingress Worker]
        CMD_Q[game-commands-queue: Concorrência 1 / FIFO]
        SESSION_EXEC[Executor Serial da Sessão]
        REGISTRY[GameRegistry]
        TIMERS[Gerenciador de Timers Declarativos]
        DB[(PostgreSQL 17: Snapshots Opacos JSONB)]
        SOCKET_PUB[Socket.IO Gateway]
    end

    subgraph Game_SPI["Contratos SPI da Engine (apps/api)"]
        INPUT_MAPPER[GameInputMapper]
        GAME_ENGINE[GameEngine Puro]
        PROJECTION[GameProjection]
    end

    subgraph Module_AxB["Módulo Plugável: Jogo A x B"]
        AXB_M[AxBInputMapper]
        AXB_E[AxBGameEngine]
        AXB_P[AxBProjection]
    end

    subgraph Driven_Consumers["Consumidores / Apresentação"]
        OVERLAY[Overlay OBS 1080×1920: Browser Source]
        DASH_VIEW[Dashboard do Streamer: Métricas/Controle]
    end

    IQ --> INGRESS_W
    INGRESS_W --> CMD_Q
    CMD_Q --> SESSION_EXEC

    SESSION_EXEC --> REGISTRY
    REGISTRY --> INPUT_MAPPER
    REGISTRY --> GAME_ENGINE
    REGISTRY --> PROJECTION

    INPUT_MAPPER -.-> AXB_M
    GAME_ENGINE -.-> AXB_E
    PROJECTION -.-> AXB_P

    SESSION_EXEC --> DB
    SESSION_EXEC --> TIMERS
    SESSION_EXEC --> SOCKET_PUB

    SOCKET_PUB --> OVERLAY
    SOCKET_PUB --> DASH_VIEW
```

### Invariantes Essenciais da Arquitetura
1. **Host Agnóstico**: A plataforma desconhece regras de jogos (torres, vidas, pontuações ou times). Ela atua apenas como orquestrador genérico de comandos, mensageria serial, concorrência, timers e persistência de snapshots opacos.
2. **Zero Pacote Compartilhado (`packages/shared` Proibido)**: `apps/api` e `apps/web` são completamente isolados. O contrato entre eles é estritamente o protocolo de rede (REST + Socket.IO). O frontend define seus tipos de consumo localmente.
3. **Concorrência Determinística Serial (FIFO 1)**: Todas as transições de estado de uma sessão passam por uma fila BullMQ com `concurrency: 1`, eliminando race conditions sem locks distribuídos pessimistas.
4. **Persistência de Snapshots Opacos em JSONB**: O estado do jogo é persistido no PostgreSQL como `jsonb` sem que o schema relacional precise conhecer as variáveis internas do jogo.

### Organização modular do backend

Esta é a **estrutura alvo** de `apps/api/src/`. As pastas previstas para fases futuras são criadas quando sua implementação começar; a existência nesta árvore não indica funcionalidade concluída. Hoje `common/config`, `common/domain/errors` e o HTTP de health já seguem o padrão. O jogo A x B e o registro ainda estão nos caminhos históricos `games/axb/` e `core/registry/`, respectivamente, até sua migração estrutural.

```text
apps/api/src/
├── index.ts                         # Inicialização do processo
├── app.ts                           # Composição Fastify, erros, CORS e OpenAPI
├── contracts/                      # SPI e tipos genéricos internos da API
│   ├── engine.ts
│   ├── ingress.ts
│   └── session.ts
├── common/                         # Configuração e Host genérico a todos os jogos
│   ├── config/env.ts
│   ├── domain/errors/              # AppError e erros HTTP de aplicação
│   ├── infrastructure/
│   │   ├── http/                   # Handler global, health e documentação
│   │   │   ├── controllers/
│   │   │   ├── dtos/
│   │   │   └── routes/docs/
│   │   ├── database/drizzle/       # Cliente, schema e migrações compartilhados
│   │   ├── queue/                  # Conexão Redis e filas BullMQ
│   │   └── socket/                 # Publicação de snapshots e alertas
│   ├── registry/                   # GameRegistry
│   ├── executor/
│   │   ├── application/
│   │   │   ├── usecases/           # Processamento serial de comandos
│   │   │   └── repositories/       # Interfaces de comandos e snapshots
│   │   └── infrastructure/         # Worker e repositórios Drizzle
│   └── timers/                     # Agendamento de timers declarativos
└── modules/
    ├── games/axb/                 # Engine, mapper, projection e testes puros
    ├── sessions/
    │   ├── domain/                # Estado e regras do ciclo de vida
    │   ├── application/
    │   │   ├── usecases/          # Criar, iniciar, pausar, retomar, encerrar
    │   │   └── repositories/      # Interface SessionRepository
    │   └── infrastructure/
    │       ├── database/drizzle/  # DrizzleSessionRepository
    │       └── http/              # controllers, dtos, routes e routes/docs
    ├── ingress/
    │   ├── application/
    │   │   ├── usecases/          # Processar e deduplicar interações
    │   │   └── repositories/      # Interface InteractionRepository
    │   └── infrastructure/
    │       ├── database/drizzle/  # DrizzleInteractionRepository
    │       ├── queue/             # Ingress Worker
    │       ├── tiktok/            # Captura real
    │       ├── simulator/         # Captura sintética
    │       └── http/              # controllers, dtos, routes e routes/docs
    └── auth/
        └── infrastructure/        # Better Auth e montagem das rotas
```

**Direção das dependências:** um controller Fastify valida DTOs e chama um caso de uso; o caso de uso depende de uma interface em `application/repositories/`; um adaptador em `infrastructure/database/drizzle/` implementa essa interface. O caso de uso não importa Fastify, DTO HTTP ou Drizzle. A composição em `app.ts` e no bootstrap fornece as implementações. O worker de ingresso segue o mesmo contrato de aplicação que a entrada HTTP.

O executor em `common/` coordena fila, transação, snapshots, timers e publicação. Ele acessa o jogo ativo somente pelo `GameModule` do registro e mantém o estado do jogo opaco. O módulo `games/axb` contém regras puras e não ganha repositórios ou endpoints próprios sem necessidade real. Better Auth possui os fluxos padrão de registro, login e sessão; casos de uso próprios são reservados para regras adicionais do produto.

Os adaptadores HTTP de cada módulo usam `infrastructure/http/{controllers,dtos,routes}` e colocam schemas OpenAPI em `routes/docs/`. O handler global em `common/infrastructure/http/` traduz erros de aplicação e validação para respostas HTTP; erros inesperados retornam 500 sem expor detalhes. A documentação da API é servida em `/api/docs/`, e o documento OpenAPI em `/api/docs/json`.

---

## 2. Decisões Arquiteturais Consolidadas

| Camada / Dimensão | Tecnologia / Padrão | Justificativa / Papel Arquitetural |
| :--- | :--- | :--- |
| **Estrutura do Repositório** | **Monorepo pnpm — 2 apps, 0 packages** | `apps/api` (backend) e `apps/web` (frontend) desacoplados. Sem `packages/shared`. Comunicação exclusivamente via HTTP REST e Socket.IO. |
| **Backend & Comunicação** | **Fastify (Node.js + TypeScript) + Socket.IO** | Roteamento REST de alta performance, validação com Zod e Socket.IO para streaming em tempo real de snapshots para OBS e painel. |
| **Arquitetura da Engine** | **Host Agnóstico + Contratos SPI** | O Host orquestra timers e filas. O jogo implementa os contratos SPI (`GameInputMapper`, `GameEngine`, `GameProjection`). **A x B** é o primeiro jogo registrado. |
| **Camada Assíncrona & Filas** | **Redis 7 + BullMQ** | `ingress-queue` para eventos brutos, `game-commands-queue` com concorrência estrita 1 para serialização FIFO, e delayed jobs para timers declarativos. |
| **Banco de Dados & ORM** | **PostgreSQL 17 + Drizzle ORM** | Persistência relacional para usuários, sessões, rodadas e logs de interação. Snapshots de jogos gravados em coluna `JSONB` opaca para a plataforma. |
| **Frontend Framework** | **TanStack Start (`@tanstack/react-start`) + Vite + React 19** | SSR/SPA unificado com TypeScript ponta a ponta, Vite HMR ultrarrápido, TanStack Router e TanStack Query integrados. |
| **Arquitetura Frontend** | **Feature-Driven (Padrão `viralforge/web`)** | Módulos em `features/<feature>/{views,components,hooks,services,stores}`, rotas em `routes/`, primitivos shadcn/ui em `components/ui` e Tailwind CSS v4. |
| **Overlay OBS** | **Browser Source Transparente (1080×1920)** | Renderizado em resolução nativa vertical, consumindo projeções públicas via Socket.IO, com áudio procedural e efeitos visuais leves. |
| **Autenticação** | **Better Auth** | Autenticação moderna com email/senha integrada ao PostgreSQL via Drizzle adapter, isolando o `/dashboard` do streamer. |
| **Adaptador de Captura** | **Hexagonal `LiveCaptureAdapter`** | Implementação real com `tiktok-live-connector` e implementação de desenvolvimento/testes com `SimulatorCaptureAdapter`. |

---

## 3. Diagramas de Arquitetura Detalhados

### 3.1. Arquitetura da Game Engine (Host vs. Módulos Plugáveis)

```mermaid
flowchart TD
    subgraph Plataforma_Core["NÚCLEO DO HOST (Agnóstico a Jogos)"]
        INGRESS[Captura & Ingress Worker]
        CMD_QUEUE[BullMQ: game-commands-queue]
        EXECUTOR[Executor Serial da Sessão]
        REGISTRY[GameRegistry]
        TIMER_SVC[Gerenciador de Timers Declarativos]
        DB[(PostgreSQL: Snapshots Opacos JSONB)]
        PUB[Socket.IO Publisher]
    end

    subgraph Contratos_SPI["Contratos Genéricos do Jogo (SPI) — Interno a apps/api"]
        IM[GameInputMapper]
        GE[GameEngine Puro]
        GP[GameProjection]
    end

    subgraph Modulo_AxB["Módulo de Jogo: A x B (Primeira Implementação)"]
        AXB_MAPPER[AxBInputMapper: Chat A/B e Tabela de Presentes]
        AXB_ENGINE[AxBGameEngine: Cooldown, Pontos, Vitória e Intervalo]
        AXB_PROJ[AxBProjection: Placar Torres, Times e Rodadas]
    end

    subgraph Modulo_Futuro["Exemplo de Módulo Futuro (Zero impacto no Host)"]
        COMM_ENGINE[CooperativeGoalGameEngine: Barra Coletiva]
    end

    INGRESS -->|Interação Normalizada| CMD_QUEUE
    CMD_QUEUE --> EXECUTOR
    EXECUTOR --> REGISTRY
    REGISTRY --> IM
    REGISTRY --> GE
    REGISTRY --> GP

    IM -.->|Implementado por| AXB_MAPPER
    GE -.->|Implementado por| AXB_ENGINE
    GP -.->|Implementado por| AXB_PROJ

    GE -.->|Pode ser implementado por| COMM_ENGINE

    EXECUTOR -->|Persiste Estado Opaco| DB
    EXECUTOR -->|Executa Timers Declarativos| TIMER_SVC
    EXECUTOR -->|Envia Projeção Formatada| PUB
```

### 3.2. Fluxo Hexagonal de Processamento de Eventos e Controle

```mermaid
flowchart TD
    subgraph Driving_Adapters["Adaptadores Primários / Entrada"]
        T[TikTok LIVE Connector] -->|Eventos brutos| IQ[BullMQ: ingress-queue]
        SIM_UI[Simulador no Dashboard] -->|HTTP: Injeção de eventos| API[Fastify Controller]
        OPER[Dashboard do Operador] -->|HTTP REST: Ações de Sessão e Auth| API
    end

    subgraph Fastify_Dispatch["Despacho do Fastify Controller"]
        API -->|Comandos de Sessão: Pausar / Retomar / Encerrar| GQ[BullMQ: game-commands-queue]
        API -->|Eventos sintéticos do simulador| IQ
        API -->|Comando Conectar / Desconectar| T
        API -->|Consulta e Exportação JSON| PG[(PostgreSQL + Drizzle)]
    end

    subgraph Core_Hexagon["NÚCLEO DO HOST"]
        IQ --> IW[Worker de Ingresso: Deduplicação e Reconhecimento]
        IW -->|Comando de jogo enfileirado| GQ
        GQ --> EW[Worker do Executor Serial]
        EW -->|Delega para o módulo registrado| GE[GameEngine Determinístico do Jogo Ativo]
        GE -->|Novo Estado + Vitória + Timers| EW
        EW -->|Vitória: agenda timer de 5s| TQ[BullMQ: Delayed Job Timer]
        TQ -.->|Vencimento do timer| GQ
    end

    subgraph Driven_Adapters["Adaptadores Secundários / Saída"]
        EW -->|Transação Atômica: Snapshot + Histórico| PG
        EW -->|Publicação pós-commit| SIO[Socket.IO Server]
        SIO -->|Streaming Real-time| WEB_DASH[TanStack Start: /dashboard]
        SIO -->|Streaming Real-time| WEB_OVER[TanStack Start: /overlay via OBS]
    end
```

### 3.3. Sequência Detalhada: Do Evento Bruto à Projeção no Overlay

```mermaid
sequenceDiagram
    autonumber
    actor User as Espectador / Simulador
    participant Ingress as Ingress Worker
    participant DB as PostgreSQL (Drizzle)
    participant CommandQueue as BullMQ (game-commands)
    participant Executor as Serial Game Executor
    participant Registry as Game Registry
    participant Engine as AxB Game Engine (Puro)
    participant Publisher as Socket.IO Server
    participant Overlay as TanStack Start Overlay (OBS)

    User->>Ingress: Evento bruto (comentário ou presente)
    Ingress->>DB: Verifica duplicata / cursor de combo e persiste interação
    Ingress->>CommandQueue: Enfileira GameCommand (FIFO)
    CommandQueue->>Executor: Consome comando (concorrência = 1)
    Executor->>Registry: getGameModule(session.gameId)
    Registry-->>Executor: AxB Module (mapper, engine, projection)
    Executor->>Engine: applyCommand(currentState, command, timestampContext)
    Engine-->>Executor: DecisionResult (novo estado, pontos, vitória?, timerRequests)
    Executor->>DB: Salva Snapshot Opaco + Status do Comando + Rodada
    opt Se houver timerRequests (ex: vitória -> intervalo 5s)
        Executor->>CommandQueue: Agenda delayed job de 5s
    end
    Executor->>Registry: project(nextState, config)
    Registry-->>Executor: projectionPayload (dados do overlay)
    Executor->>Publisher: emitSnapshot(projectionPayload, alertEvent)
    Publisher-->>Overlay: Atualiza barras das torres + Toca áudio procedural
```

### 3.4. Desacoplamento Monorepo: Zero Pacote Compartilhado

```mermaid
flowchart LR
    subgraph API["apps/api (Autoridade do Domínio)"]
        CONTRACTS["contracts/<br/>engine.ts, ingress.ts, session.ts"]
        GAMES["modules/games/axb/<br/>engine, mapper, projection"]
        ROUTES["modules/*/infrastructure/http/routes/<br/>REST endpoints"]
        SOCKET_SERVER["Socket.IO Server<br/>emite snapshots"]
    end

    subgraph WEB["apps/web (Consumidor da API Pública)"]
        API_TYPES["api/types.ts<br/>Tipagem local dos payloads"]
        API_CLIENT["api/client.ts<br/>Funções fetch tipadas"]
        SOCKET_CLIENT["lib/socket-client.ts<br/>Consome eventos Socket.IO"]
        FEATURES["features/<br/>dashboard, overlay, auth"]
    end

    ROUTES -->|HTTP JSON responses| API_CLIENT
    SOCKET_SERVER -->|Socket.IO events| SOCKET_CLIENT
    API_CLIENT -->|tipos locais| API_TYPES
    SOCKET_CLIENT -->|tipos locais| API_TYPES
    API_TYPES -->|alimenta| FEATURES

    style CONTRACTS fill:#1a1a2e,stroke:#e94560,color:#fff
    style API_TYPES fill:#1a1a2e,stroke:#0f3460,color:#fff
```

> **Regra de Isolamento**: Não existe `packages/shared`. A fronteira entre backend e frontend é exclusivamente a rede. O frontend declara seus próprios tipos locais para payloads de rede. Se o backend alterar um contrato, o frontend ajusta suas interfaces de consumo sem dependências binárias ou compilações acopladas no monorepo.

---

## 4. Contratos SPI da Game Engine (apps/api)

Os contratos vigentes estão em `apps/api/src/contracts/engine.ts` e `apps/api/src/contracts/ingress.ts`. O código TypeScript é a fonte para assinaturas exatas; este quadro descreve as responsabilidades estáveis:

| Contrato | Responsabilidade |
| :--- | :--- |
| `GameInputMapper<TConfig, TCommand>` | Converter uma `NormalizedInteraction` em comando do jogo ou ignorá-la. |
| `GameEngine<TState, TConfig, TCommand>` | Criar estado inicial e aplicar comandos de forma pura, recebendo `ExecutionContext` explícito. |
| `DecisionResult<TState>` | Devolver próximo estado, status, eventos e pedidos declarativos de timer; não executa I/O. |
| `GameProjection<TState, TConfig, TProjection>` | Produzir os dados públicos do overlay a partir do estado e de `ProjectionMeta`. |
| `GameModule<TState, TConfig, TProjection, TCommand>` | Reunir identidade, versão, mapper, engine, projection e validação opcional de configuração. |

`NormalizedInteraction` é definido em `contracts/ingress.ts`, com variantes de comentário e presente. A migração física do A x B para `modules/games/axb/` não altera essas interfaces nem as regras do jogo.

---

## 5. Persistência de Estado e Concorrência

1. **Snapshots Opacos em JSONB**:
   - O PostgreSQL armazena a sessão, as rodadas e os snapshots em `game_rounds` e `game_snapshots`.
   - O campo `state_snapshot` é tipado como `jsonb`. O Host grava e lê esse campo sem inspecionar propriedades internas.
2. **Garantia de Ordem Serial (FIFO)**:
   - A fila BullMQ `game-commands-queue` é processada com `concurrency: 1` por worker.
   - Isso garante que dois presentes recebidos no mesmo milissegundo sejam aplicados um após o outro, produzindo transições de estado $S_0 \rightarrow S_1 \rightarrow S_2$ completamente determinísticas.
3. **Timers Declarativos**:
   - Quando o jogo atinge condição de vitória, a `GameEngine` retorna um `timerRequest` solicitando um intervalo (ex: 5000ms).
   - O Host agenda um *delayed job* no BullMQ. Ao disparar, o job envia o comando `RESET_ROUND` para a fila de comandos, reiniciando o ciclo de forma transparente.
