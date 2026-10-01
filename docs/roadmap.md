# Roadmap Estratégico — Plataforma de Lives Interativas

> **Metodologia**: Baseado no framework *Now / Next / Later* (Dean Peters & *Product Roadmaps Relaunched*).  
> **Status**: Ativo & Evolutivo  
> **Referências**: [AGENTS.md](../AGENTS.md) | [docs/spec/architecture.md](spec/architecture.md) | [docs/plans/mvp-walking-skeleton.md](plans/mvp-walking-skeleton.md)

---

## 1. Contexto Estratégico & Objetivos de Produto

- **Visão de Produto**: Uma plataforma local, autônoma e de alto desempenho para transmissões interativas (TikTok LIVE), transformando comentários e presentes em mecânicas de jogo em tempo real no OBS.
- **Resultados-Chave (OKRs do MVP)**:
  1. **Latência Sub-segundo**: Projeção de pontuações e animações refletidas no OBS em menos de 100ms após a captura.
  2. **Concorrência e Resiliência**: Zero *race conditions* ou duplicação de pontos em rajadas de 50+ presentes/segundo (garantia FIFO via BullMQ com `concurrency: 1`).
  3. **Zero Fricção de Setup**: O streamer inicia a transmissão localmente com um único comando (`docker compose up` ou `pnpm dev`).
  4. **Qualidade Contínua**: 90% de cobertura no backend e 85% no frontend fiscalizados pelo `./scripts/verify.sh`.

---

## 2. Visão do Roadmap (Now / Next / Later)

```mermaid
flowchart LR
    subgraph NOW["🟢 NOW: MVP Walking Skeleton"]
        direction TB
        N1["1. Fundação & Docker: Postgres, Redis, Fastify, Web ✅"]
        N2["2. Motor A x B Determinístico: TDD Puro ✅"]
        N3["3. Persistência & Better Auth: Drizzle ORM ✅"]
        N4["4. Ingress & Fila Serial FIFO: BullMQ conc=1 ✅"]
        N5["5. Adaptadores, Socket.IO & Rotas Fastify 🎯"]
        N6["6. Frontend: Dashboard, Overlay OBS & Áudio"]
        N1 --> N2 --> N3 --> N4 --> N5 --> N6
    end

    subgraph NEXT["🟡 NEXT: Operação Real & Refinamento"]
        direction TB
        X1["Conector TikTok LIVE Oficial"]
        X2["Temas Plugáveis do Overlay"]
        X3["Leaderboard de Apoiadores da Live"]
        X4["Gestão Dinâmica de Metas e Presentes"]
        X1 --> X2 --> X3 --> X4
    end

    subgraph LATER["🔵 LATER: Novos Jogos & Escala"]
        direction TB
        L1["Novos Jogos SPI: Boss Coletivo, 4 Times"]
        L2["Narração Dinâmica por Voz e TTS com IA"]
        L3["Multi-Canal e Suporte Multi-Streamer"]
        L1 --> L2 --> L3
    end

    NOW ==> NEXT ==> LATER
```

---

## 3. Detalhamento das Iniciativas

### 🟢 NOW: MVP Walking Skeleton (Compromisso Ativo)
*Foco: Entrega de ponta a ponta da primeira experiência jogável de A x B com simulação total e OBS.*

| Iniciativa | Hipótese / Objetivo de Negócio | Métrica de Sucesso | Status |
| :--- | :--- | :--- | :--- |
| **1. Fundação & Docker** | Garantir ambiente reproduzível e isolado com live-reload. | 4 serviços saudáveis no compose; `GET /health` 200; 100% de cobertura. | ✅ Concluída |
| **2. Motor A x B com TDD** | Lógica determinística e pura (`RG-01` a `RG-12`), contratos SPI e Game Registry. | 100% dos testes unitários passando em <15ms (72 testes na API); zero bugs de combo. | ✅ Concluída |
| **3. Persistência & Better Auth** | Camada de dados relacional com Drizzle ORM (PostgreSQL 17), contratos de repositório e autenticação. | Migrações Drizzle aplicadas com sucesso; sessão Better Auth validada no Postgres; 96.23% cobertura. | ✅ Concluída |
| **4. Ingress & Fila Serial** | Ingestão resiliente, deduplicação por chave de idempotência e execução FIFO concorrência 1 via BullMQ. | 100 eventos processados sem perda ou race condition; snapshots gerados monotonicamente; 97.57% cobertura. | ✅ Concluída |
| **5. Adaptadores, Socket.IO & Rotas** | Watchdog de heartbeat TikTok, tráfego sintético do simulador e broadcast com coalescência. | Latência <100ms; rajada sintética CA-11 sustentada a 200 ev/s por 60s. | 🎯 Próxima (Em Andamento) |
| **6. Frontend: Dashboard & Simulador** | Permitir que o operador configure regras, opere a live e injete tráfego sintético. | Login seguro, controles de sessão e injeção de rajadas com 1 clique no painel. | 📋 Na Fila |
| **7. Frontend: Overlay OBS & Áudio** | Projeção visual 1080×1920 a 60 FPS com batching `requestAnimationFrame` e síntese de áudio procedural com limitador de polifonia. | Torres proporcionais no OBS sem travamentos; zero clipping com áudio procedural. | 📋 Na Fila |
| **8. Homologação E2E Integrada** | Validação ponta a ponta no Docker Compose atendendo a todos os critérios de aceite. | CA-01 a CA-15 satisfeitos com relatório de auditoria completo. | 📋 Na Fila |

---

### 🟡 NEXT: Operação Real & Refinamento (Alta Confiança)
*Foco: Transição para lives reais no TikTok e ferramentas avançadas para o streamer.*

| Iniciativa | Hipótese / Objetivo de Negócio | Métrica de Sucesso | Dependência |
| :--- | :--- | :--- | :--- |
| **Conector TikTok LIVE Oficial** | Capturar tráfego real com `tiktok-live-connector`. | Reconexão transparente em <3s após instabilidade de rede. | Conclusão do MVP |
| **Temas Plugáveis de Overlay** | Streamers com identidades visuais distintas precisam de overlays personalizados. | 3 templates visuais com troca em tempo real pelo painel. | Overlay MVP |
| **Leaderboard da Live** | Reconhecer maiores apoiadores estimula mais doações e presentes. | Top 5 doadores exibidos no overlay e painel. | Ingress Worker |
| **Configuração Dinâmica de Metas** | Ajustar dificuldade (vidas das torres, cooldown) sem parar a transmissão. | Mudança de parâmetros aplicada na próxima rodada automaticamente. | Fastify API |

---

### 🔵 LATER: Novos Jogos & Escala da Plataforma (Visão Futura)
*Foco: Alavancar a arquitetura Hexagonal e os contratos SPI para novos formatos.*

| Iniciativa | Hipótese / Objetivo de Negócio | Métrica de Sucesso | Dependência |
| :--- | :--- | :--- | :--- |
| **Novos Módulos de Jogos (SPI)** | Provar a extensibilidade do Host com jogos cooperativos (*Boss Battle*) e 4 times. | Novo jogo plugado criando apenas 3 arquivos no backend, sem alterar o Host. | GameRegistry SPI |
| **TTS Dinâmico & Efeitos com IA** | Comentários destacados lidos por vozes neurais aumentam interação. | Narração automática em tempo real com Edge-TTS / ElevenLabs. | Fastify Worker |
| **Multi-Canal / Plataformas Cruzadas** | Suportar YouTube Live e Twitch com a mesma infraestrutura de engine. | Adaptadores de entrada intercambiáveis mantendo a mesma engine. | LiveCaptureAdapter |

---

## 4. Grafo de Dependências Técnicas (Caminho Crítico)

```mermaid
flowchart TD
    DOCKER["1. Docker Compose & Monorepo ✅"] --> ENGINE["2. Motor A x B Determinístico TDD ✅"]
    ENGINE --> PERSIST["3. Persistência Drizzle & Better Auth ✅"]
    PERSIST --> INGRESS["4. Ingress Worker & Fila Serial FIFO 🎯"]
    INGRESS --> FASTIFY["5. Adaptadores, Socket.IO & Rotas Fastify"]
    FASTIFY --> FRONTEND["6. Frontend: Dashboard, Overlay OBS & Áudio"]
    FRONTEND --> MVP_DONE([Walking Skeleton Completo e Homologado])
    
    MVP_DONE --> TIKTOK_LIVE[7. Conector TikTok LIVE Real]
    MVP_DONE --> THEMES[8. Sistema de Temas do Overlay]
    MVP_DONE --> NEW_GAMES[9. Novos Jogos SPI: Boss Battle / 4 Times]
```

---

## 5. Rituais de Atualização do Roadmap

- **Frequência**: O roadmap é revisado ao final de cada fase da [**`feature-factory`**](plans/mvp-walking-skeleton.md), durante o ritual do **`/learn`**.
- **Regra de Transição**: Nenhuma iniciativa move de *NEXT* para *NOW* antes que os critérios de aceite e thresholds de cobertura da iniciativa atual sejam homologados no Gate 3.
