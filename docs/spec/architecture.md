# Especificação Técnica de Arquitetura — Plataforma de Lives Interativas

> **Status**: Ativo  
> **Referência Principal**: [GEMINI.md](../../GEMINI.md)

---

## 1. Visão Geral da Arquitetura

A plataforma adota **Arquitetura Hexagonal (Ports & Adapters)** estrita, separando o **Núcleo da Plataforma (Host)** dos **Módulos de Jogo Plugáveis**.

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
        DB[(PostgreSQL: Snapshots Opacos JSONB)]
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

---

## 2. Componentes e Invariantes da Arquitetura

### 2.1. Host Agnóstico
- O Host **não possui conhecimento** sobre regras de jogos, times, vidas, pontuações ou torres.
- O Host é estritamente responsável por:
  1. Capturar e enfileirar interações na `ingress-queue`.
  2. Normalizar e deduplicar eventos (por `interactionId` e janela temporal).
  3. Garantir ordem serial e estrita de execução via BullMQ com `concurrency: 1`.
  4. Executar transações de persistência de estado opaco (`JSONB`) no PostgreSQL.
  5. Agendar e disparar timers declarativos (ex: intervalo de 5s entre rodadas).
  6. Transmitir projeções calculadas pelo jogo para os clientes Socket.IO.

### 2.2. Contratos da Game Engine (SPI)
Cada jogo registrado no `GameRegistry` implementa 3 contratos puros:
1. **`GameInputMapper`**: Transforma interações normalizadas da live em comandos tipados do jogo específico.
2. **`GameEngine`**: Função pura e determinística:
   $$\text{GameEngine}(S_t, C) \rightarrow (S_{t+1}, \text{SideEffects})$$
   Onde $S$ é o estado interno do jogo, $C$ é o comando e $\text{SideEffects}$ são ações solicitadas ao Host (ex: agendar timer).
3. **`GameProjection`**: Mapeia o estado interno do jogo em uma representação pública otimizada para o Overlay OBS e Painel do Operador.

### 2.3. Desacoplamento Monorepo: Zero Pacote Compartilhado
- O repositório contém exatamente **dois apps**: `apps/api` (Backend) e `apps/web` (Frontend).
- **Sem `packages/shared`**: A fronteira entre backend e frontend é exclusivamente a rede (protocolos HTTP REST e eventos Socket.IO).
- `apps/web` declara suas próprias tipagens de consumo localmente, mantendo total independência de build e evolução.
