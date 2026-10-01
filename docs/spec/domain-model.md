# Modelo de Domínio e Relacionamento de Entidades

> **Referência Canônica**: [CONTEXT.md](../../CONTEXT.md) | [docs/spec/architecture.md](architecture.md)

Este documento esclarece a divisão dos **Bounded Contexts (Domínios)** e o relacionamento entre as **Entidades** da plataforma de lives interativas, respondendo como uma ação de um espectador no TikTok é transformada em estado de jogo persistido e renderizado no OBS.

---

## 1. Mapa de Contextos Delimitados (Context Map)

A plataforma é dividida em 5 contextos autônomos, mantendo o núcleo (*Host*) 100% agnóstico às regras específicas de cada jogo:

```mermaid
flowchart LR
    subgraph CTX_AUTH["1. Identity & Access"]
        OP["Operator (Streamer)"]
    end

    subgraph CTX_SESSION["2. Session Context"]
        SESS["GameSession\n(Agregado Raiz)"]
    end

    subgraph CTX_INGRESS["3. Ingress Context"]
        INT["Viewer Interaction\n(TikTok / Simulador)"]
    end

    subgraph CTX_CORE["4. Execution & Monotonic Core"]
        CMD["Game Command\n(BullMQ FIFO 1)"]
        SNAP["Game Snapshot\n(Seq Monotônica)"]
    end

    subgraph CTX_GAME["5. Game Domain (SPI)"]
        ENG["Game Module (ex: AxB)\n(Engine Pura)"]
    end

    subgraph CTX_BROADCAST["6. Realtime Broadcasting"]
        SOCK["Socket.IO Room\n(Overlay + Dashboard)"]
    end

    OP -->|Cria e comanda| SESS
    SESS -->|Contexto de execução| INT
    INT -->|Normaliza e valida| CMD
    CMD -->|Aplica via FIFO| ENG
    ENG -->|Gera novo estado| SNAP
    SNAP -->|Publica via throttle| SOCK
```

---

## 2. Diagrama Entidade-Relacionamento do Domínio (`erDiagram`)

Este diagrama ilustra a estrutura relacional e lógica entre os conceitos e tabelas do sistema:

```mermaid
erDiagram
    OPERATOR ||--o{ GAME_SESSION : "gerencia (1:N)"
    GAME_SESSION ||--o{ GAME_INTERACTION : "recebe (1:N)"
    GAME_SESSION ||--o{ GAME_SNAPSHOT : "produz histórico (1:N)"
    GAME_MODULE ||--o{ GAME_SESSION : "define regras de (1:N)"
    
    OPERATOR {
        string id PK "Identificador único do operador"
        string email "E-mail de autenticação"
        string name "Nome do streamer"
        timestamp createdAt "Data de cadastro"
    }

    GAME_SESSION {
        uuid id PK "ID da sessão ativa"
        string gameId FK "ID do módulo de jogo (ex: 'axb')"
        string operatorId FK "ID do operador dono da live"
        enum status "CONFIGURING | RUNNING | PAUSED | ENDED"
        string title "Título da partida ao vivo"
        jsonb config "Configurações imutáveis (times, metas, cores)"
        timestamp startedAt "Início da partida"
        timestamp endedAt "Fim da partida"
    }

    GAME_INTERACTION {
        uuid id PK "ID único da interação"
        uuid sessionId FK "Sessão à qual pertence"
        string idempotencyKey UK "Chave O(1) de deduplicação"
        string type "'comment' | 'gift' | 'like'"
        string source "'TIKTOK_LIVE' | 'SIMULATOR'"
        string userId "Identificador do espectador na live"
        string userName "Apelido do espectador"
        jsonb payload "Dados brutos do evento (presente, texto)"
        enum status "PENDING | PROCESSED | IGNORED | DUPLICATE"
        timestamp createdAt "Momento do recebimento"
    }

    GAME_SNAPSHOT {
        uuid id PK "ID do snapshot"
        uuid sessionId FK "Sessão associada"
        string gameId "Identificador do jogo"
        bigint sequence "Versão monotônica estrita: 0, 1, 2..."
        jsonb state "Estado interno opaco (pontos, vidas, times)"
        jsonb projection "Visão pública derivada para a UI"
        timestamp createdAt "Carimbo de data/hora do snapshot"
    }

    GAME_MODULE {
        string id PK "ex: 'axb'"
        string name "ex: 'Batalha A x B'"
        string version "Versão do contrato SPI"
        GameInputMapper mapper "Mapeia Interaction -> Command"
        GameEngine engine "Calcula State + Command -> NextState"
        GameProjection projection "Projeta State -> UI View"
    }
```

---

## 3. O Ciclo de Vida: Do Presente na Live ao Placar na Tela

Para entender claramente a fronteira entre os domínios, acompanhe a jornada de um evento:

```mermaid
sequenceDiagram
    autonumber
    actor Espectador as Espectador da Live (TikTok)
    participant Ingress as Ingress Adapter & UseCase
    participant Redis as Redis (Idempotência O(1))
    participant DB as PostgreSQL (game_interactions)
    participant BullMQ as Fila Serial (concurrency: 1)
    participant Engine as AxB Game Engine (Domínio Puro)
    participant Snapshots as PostgreSQL (game_snapshots)
    participant Socket as Socket.IO (Throttle 50ms)
    actor OBS as Overlay OBS / Dashboard

    Espectador->>Ingress: Envia presente "Rosa" para o Time A
    Note over Ingress: 1. Ingress Context
    Ingress->>Redis: SET NX EX (idempotencyKey)
    Ingress->>DB: Salva GameInteraction (status: PENDING)
    Ingress->>BullMQ: Enfileira comando serial de jogo

    Note over BullMQ,Engine: 2. Core Executor & Game Domain
    BullMQ->>Engine: InputMapper transforma Interaction em AddPointsCommand
    Engine->>Engine: applyCommand(currentState, command)
    Note over Engine: Valida se sessão está ativa e soma pontos ao Time A
    Engine-->>BullMQ: DecisionResult (nextState, projection, alert)

    Note over Snapshots: 3. Persistência Monotônica
    BullMQ->>Snapshots: Grava GameSnapshot (sequence: N+1, state, projection)
    BullMQ->>DB: Atualiza GameInteraction (status: PROCESSED)

    Note over Socket,OBS: 4. Realtime Broadcast Context
    BullMQ->>Socket: Emite alerta imediato (contribution_alert)
    BullMQ->>Socket: Enfileira snapshot para janela de 50ms (latest-wins)
    Socket-->>OBS: Disparo imediato do alerta visual ("Gamer99 enviou Rosa!")
    Socket-->>OBS: Flush suave a 60fps do placar atualizado (Time A +1 pt)
```

---

## 4. Matriz de Responsabilidades por Contexto

| Contexto | O que É / Responsabilidade | O que NÃO faz (Anti-Responsabilidade) | Onde vive no código |
|---|---|---|---|
| **Identity & Auth** | Autenticação do operador (login, cookies, tokens). | Não sabe o que é uma partida, pontos ou TikTok. | `apps/api/src/modules/auth/` |
| **Sessions** | Controla o ciclo de vida (`CONFIGURING`, `RUNNING`, `PAUSED`, `ENDED`) e guarda as regras escolhidas. | Não calcula regras de pontuação nem sabe quem é Time A ou Time B. | `apps/api/src/modules/sessions/` |
| **Ingress** | Captura eventos do TikTok e Simulador, garantindo deduplicação determinística em $O(1)$. | Não decide o impacto do evento no jogo nem altera o placar. | `apps/api/src/modules/ingress/` |
| **Execution Core** | Garante execução estritamente sequencial (FIFO 1) sem concorrência e gera snapshots monotônicos. | Não conhece lógica de vitórias ou presentes. | `apps/api/src/common/executor/` |
| **Game Module (SPI)** | Contém a regra de negócio pura (quem ganha, cálculo de pontos, meta atingida). | Não acessa banco de dados, Redis, Fastify ou rede. É uma função pura. | `apps/api/src/modules/games/<game>/` |
| **Broadcasting** | Distribui snapshots via Socket.IO com controle de taxa (*latest-wins*) para não travar o OBS. | Não altera estado nem valida permissões de regras. | `apps/api/src/common/infrastructure/socket/` |

---

## 5. Como o Frontend se Conecta a Tudo Isso (`apps/web`)

Conforme a regra arquitetural **Zero Shared Package**:
- O frontend **não importa** classes ou entidades do backend.
- O frontend define **tipos locais de consumo** (`apps/web/src/api/types.ts`) que espelham apenas os contratos de rede (REST DTOs e eventos Socket.IO).
- O `useDashboardStore` é um repositório reativo no navegador que apenas reflete o último `GameSnapshot` e o status da `GameSession` entregues pela API.
