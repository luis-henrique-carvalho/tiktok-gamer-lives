# TikTok Gamer Lives — Domain Context

Plataforma interativa que transforma eventos de transmissões ao vivo em comandos determinísticos para jogos em tempo real com overlay no OBS.

## Identity & Access

**Operator**:
A pessoa autenticada responsável por criar, parametrizar e controlar partidas ao vivo na plataforma.
_Avoid_: Admin, player, streamer, user, gamer

**Session Token**:
A credencial temporária criptográfica concedida a um Operador após autenticação para operar partidas.
_Avoid_: JWT, API key, auth cookie

## Session Management

**Game Session**:
A instância delimitada no tempo de uma partida interativa associada a um Operador e a um Módulo de Jogo.
_Avoid_: Match, room, game, transmission, stream

**Session Status**:
A fase do ciclo de vida em que uma Sessão se encontra (`CONFIGURING`, `RUNNING`, `PAUSED` ou `ENDED`).
_Avoid_: Game state, room phase, status code

**Session Configuration**:
O conjunto imutável de parâmetros e regras de negócio definidos pelo Operador para a execução de uma Sessão específica.
_Avoid_: Settings, preferences, payload, options

## Ingress & Interactivity

**Viewer Interaction**:
Qualquer manifestação individual de um espectador da live (presente, like ou comentário) recebida por um conector externo.
_Avoid_: Event, action, message, raw input

**Idempotency Key**:
O identificador unívoco determinístico de uma Interação que assegura processamento exatamente uma vez pelo sistema.
_Avoid_: Hash, uuid, request id

**Gift Contribution**:
A quantidade delta positiva de presentes reconhecida e creditada a partir de contagens acumuladas do conector.
_Avoid_: Donation, tip, payment, coin

## Execution & Monotonic State

**Game Command**:
A instrução imperativa formal gerada a partir de uma Interação válida para mutação sequencial do jogo.
_Avoid_: Trigger, operation, task, job

**Game Snapshot**:
O registro histórico imutável e monotônico (`sequence: 0, 1, 2...`) do estado opaco do jogo e de sua projeção em um instante.
_Avoid_: Savegame, state dump, backup, cache

**Decision Result**:
O conjunto síncrono de saídas retornado pela Engine contendo o próximo estado, eventos de domínio e pedidos de timers.
_Avoid_: Response, execution result, output

## Game Mechanics (SPI)

**Game Module**:
O pacote independente que contém as regras de um jogo específico, separando mapeamento, motor de decisão e projeção.
_Avoid_: Game, plugin, engine, package

**Game State**:
O estado interno profundo e opaco de um jogo (placar, inventário, posições), desconhecido pelo Host da plataforma.
_Avoid_: Session state, snapshot, database state

**Game Projection**:
A visão pública e resumida do estado de jogo formatada para renderização no Overlay OBS e no Dashboard.
_Avoid_: View model, UI state, screen data

## Realtime Broadcasting

**Contribution Alert**:
O sinal imediato transmitido em tempo real anunciando publicamente o autor e impacto de um presente relevante.
_Avoid_: Push notification, toast, banner

**Coalesced Snapshot**:
A versão mais recente da projeção do jogo enviada periodicamente sob janela de amortecimento para exibição fluida.
_Avoid_: Polling response, broadcast chunk
