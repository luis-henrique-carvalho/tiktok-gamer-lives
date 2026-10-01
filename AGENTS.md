# Diretrizes do projeto — Plataforma de Lives Interativas

Este arquivo é a fonte única de regras do repositório para agentes no Codex e no Gemini. O `GEMINI.md` da raiz encaminha o Gemini para estas mesmas regras. Aplique as regras do projeto independentemente do nome das ferramentas oferecidas pelo ambiente; use apenas ferramentas realmente disponíveis na sessão.

## Referências do projeto

- [Arquitetura](docs/spec/architecture.md): fonte autoritativa para arquitetura hexagonal, contratos SPI da engine, concorrência, persistência e separação entre apps.
- [Stack e cobertura](docs/spec/stack.md): bibliotecas, versões e metas de cobertura.
- [PRD](docs/prd-mvp-live-interativa.md): regras de negócio e critérios de aceite do MVP.
- [Roadmap](docs/roadmap.md): prioridades e dependências entre iniciativas.
- [Plano ativo do MVP](docs/plans/mvp-walking-skeleton.md): sequência de implementação.
- [Grafo do codebase](graphify-out/GRAPH_REPORT.md): mapa de módulos e relações, quando disponível e atualizado.

## Invariantes de arquitetura e qualidade

1. Siga [docs/spec/architecture.md](docs/spec/architecture.md) em decisões de design, portas, adaptadores, concorrência e contratos.
2. Preserve o isolamento entre `apps/api` e `apps/web`. O contrato entre eles é a rede (REST e Socket.IO). Não crie `packages/shared` nem importe código do backend no frontend.
3. Deixe no Host apenas infraestrutura, mensageria serial e timers. Regras de jogo pertencem a `apps/api/src/modules/games/<game>/`.
4. Use TDD (Red → Green → Refactor) no motor de jogo e nos workers seriais. Mantenha os limites de cobertura configurados: 90% no backend e 85% no frontend.
5. Mantenha TypeScript em modo strict e não use `any`.
6. Adicione ou remova dependências pelo CLI do pnpm com filtro explícito do workspace; não edite `package.json` manualmente para isso.
7. Não registre segredos ou credenciais no Git. Trate `.env`, `.pem`, `.key` e `secrets.json` como arquivos sensíveis.
8. Antes de alterar `tsconfig.json`, `eslint.config.js` ou `vitest.config.ts`, obtenha a autorização exigida pela governança do repositório.
9. Desenvolva novas fases e funcionalidades em uma branch dedicada, seguindo a convenção do ambiente e qualquer nome solicitado pelo usuário.
10. Mantenha configurações globais da API em `apps/api/src/common/config/` e os erros de aplicação em `apps/api/src/common/domain/errors/`, com tratamento HTTP global.
11. Organize o HTTP de cada módulo em `infrastructure/http/`, separando `controllers/`, `dtos/` e `routes/`; documente as rotas em `routes/docs/` com schemas OpenAPI registrados no Fastify.
12. Em módulos com lógica de aplicação e persistência, coloque casos de uso em `application/usecases/`, interfaces de repositório em `application/repositories/` e implementações Drizzle em `infrastructure/database/drizzle/`. Casos de uso não importam Fastify, DTO HTTP ou Drizzle; não crie essas camadas vazias para jogos puros nem duplique os fluxos padrão do Better Auth.
13. No módulo de autenticação (`apps/api/src/modules/auth`), utilize o Better Auth com adaptador Drizzle e exponha endpoints via rota catch-all `/api/auth/*` convertendo objetos Fastify para Web Standard `Request`/`Response`. Mantenha migrações Drizzle versionadas em `apps/api/drizzle/` e executáveis programaticamente via runner nativo.
14. Na camada de mensageria assíncrona (`apps/api/src/common/infrastructure/queue/`), configure conexões do IORedis obrigatoriamente com `maxRetriesPerRequest: null`. O processador de comandos de jogo (`command.worker.ts`) DEVE operar estritamente com `concurrency: 1`, garantindo processamento serial FIFO e versionamento monotônico (`sequence`) de snapshots sem *race conditions*.
15. No módulo de Ingress (`apps/api/src/modules/ingress/`), deduplique eventos de forma híbrida (Redis `SET NX EX 300` para corte na borda em O(1) e `UNIQUE(idempotency_key)` na tabela `game_interactions`). Motores de jogo puros não disparam timers assíncronos diretamente; emitem `timerRequests` no `DecisionResult`, que são orquestrados como delayed jobs no BullMQ.

## Fluxo de trabalho para qualquer agente

1. Leia apenas as referências e os arquivos relevantes à tarefa. Para perguntas sobre arquitetura, relações entre módulos ou fluxo de execução, consulte primeiro o grafo com `graphify query`, `graphify explain` ou `graphify path`, se o comando e o grafo estiverem disponíveis. Confirme no código os fatos relevantes antes de editar. Se o grafo estiver ausente, desatualizado ou insuficiente, use busca e leitura direta dos arquivos.
2. Alinhe com o usuário decisões de produto ou design que impeçam uma implementação correta. Faça perguntas objetivas quando houver ambiguidade real; tarefas claras podem seguir diretamente.
3. Faça a menor mudança que satisfaça a tarefa. Preserve alterações preexistentes do usuário. Não execute agentes de escrita simultâneos sobre os mesmos arquivos, especialmente arquivos da raiz.
4. Use skills e playbooks relevantes quando estiverem disponíveis. Leia o `SKILL.md` correspondente pelo mecanismo de leitura do ambiente. Nomes de ferramentas, comandos de barra e recursos de UI de um ambiente não são pré-requisitos para trabalhar no outro.
5. Para funcionalidades grandes que envolvam API e web, considere os papéis em `.agents/agents/` (Antigravity) ou `.codex/agents/` (Codex) e o fluxo `feature-factory` se o ambiente oferecer delegação. Paralelize apenas trabalhos independentes em arquivos separados. Se não houver subagentes, execute o trabalho diretamente, em sequência, mantendo os mesmos critérios de qualidade. Não invoque ferramentas inexistentes.
6. Valide a mudança com os testes e verificações aplicáveis. Use `./scripts/verify.sh` para a validação completa quando o escopo justificar; para mudanças localizadas, use `--api`, `--web` ou `--quick` conforme necessário. Depois de mudanças de código, atualize o grafo com `graphify update .` se o comando estiver disponível e a atualização for pertinente.
7. Ao concluir uma fase ou funcionalidade, registre em documentação persistente apenas decisões e aprendizados relevantes para trabalhos futuros. Atualize este arquivo quando uma nova regra do projeto for estabelecida; não dependa de um comando `/learn` específico.

## Comandos do repositório

```bash
# Validação
./scripts/verify.sh
./scripts/verify.sh --api
./scripts/verify.sh --web
./scripts/verify.sh --quick

# Dependências
pnpm --filter api add <pacote>
pnpm --filter api add -D <pacote>
pnpm --filter web add <pacote>
pnpm --filter web add -D <pacote>

# Grafo de conhecimento (quando o CLI estiver disponível)
graphify query "<pergunta ou conceito>"
graphify explain "<símbolo ou módulo>"
graphify path "<Módulo A>" "<Módulo B>"
graphify update .

# Instalação e desenvolvimento
pnpm install
pnpm dev
pnpm --filter api dev
pnpm --filter api test:coverage
pnpm --filter api db:migrate
pnpm --filter web dev
pnpm --filter web test:coverage
pnpm --filter web build
```
