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
- 🕸️ **[Grafo de Conhecimento do Codebase](graphify-out/GRAPH_REPORT.md)**: Grafo topológico e análise de comunidades (192 nós, 214 arestas) gerado em `graphify-out/graph.json` e visualizável interativamente em `graphify-out/graph.html`.

---

## 2. Invariantes de Governança e Qualidade

1. **Autoridade Arquitetural Única**: Toda decisão de design, portas, adaptadores, concorrência e contratos deve obedecer estritamente a [docs/spec/architecture.md](docs/spec/architecture.md).
2. **Zero Pacote Compartilhado**: `apps/api` (autoridade do domínio) e `apps/web` (consumidor independente) são completamente isolados. O contrato entre eles é exclusivamente a rede (REST + Socket.IO). Proibido criar `packages/shared` ou importar código do backend no frontend.
3. **Host Agnóstico**: O Host gerencia apenas infraestrutura, mensageria serial e timers. Regras de jogo residem unicamente em `apps/api/src/modules/games/<game>/`.
4. **TDD Rigoroso & Cobertura**: Ciclo Red → Green → Refactor obrigatório no motor de jogo e workers seriais. Mínimo inegociável de **90% no backend** e **85% no frontend**.
5. **Modo Strict Total**: Proibido uso de `any` em todo o monorepo.
6. **Estratégia Git, Worktrees & Paralelismo Inteligente**: Novas fases e funcionalidades são desenvolvidas em branches dedicadas (`feat/<nome>`). Subagentes usam modo `inherit` no fluxo de construção e `branch` (Git Worktree isolado) para spikes. Como o monorepo adota Zero Shared Package, `backend-builder` (`apps/api/`) e `frontend-builder` (`apps/web/`) PODEM e DEVEM rodar em paralelo no mesmo chamado de `invoke_subagent` quando atuam em seus diretórios isolados, reduzindo o tempo de entrega pela metade.
7. **Graphify First & Manutenção de Grafo**: Toda pesquisa sobre arquitetura, relações entre módulos e fluxo de execução deve consultar o grafo de conhecimento em `graphify-out/` (`graphify query`, `graphify explain`, `graphify path`) antes de qualquer varredura genérica com grep/find. O grafo é sincronizado automaticamente a cada início de turno (`graphify update .`).
8. **Instalação Canônica via CLI**: Proibido editar `package.json` manualmente para adicionar ou remover pacotes. Toda dependência DEVE ser instalada via CLI pnpm com filtro explícito de workspace (`pnpm --filter <app> add [-D] <pacote>`), garantindo integridade do `pnpm-lock.yaml` e validação imediata de peer dependencies.
9. **Orquestração Mandatória de Subagentes (Padrão Boost)**: O agente primário do chat atua EXCLUSIVAMENTE como Orquestrador. Toda implementação técnica, criação de código e testes DEVE ser delegada aos subagentes especializados (`codebase-researcher`, `backend-builder`, `frontend-builder`, `test-verifier`, `implementation-validator`) via ferramenta `invoke_subagent`. Proibida a implementação monolítica direta no chat principal.
10. **Zero Pre-work & Planejamento Ágil**: O Orquestrador planeja usando o Grafo de Conhecimento (`graphify query`) e redige a especificação técnica em até 2 minutos, sem varrer dezenas de arquivos manualmente antes da delegação.
11. **Ritual Obrigatório de Fechamento (/learn)**: Ao término do Gate 3 e homologação bem-sucedida de qualquer fase/feature, o agente DEVE disparar o protocolo `/learn` para consolidar novas regras e aprendizados perpétuos no `GEMINI.md`.

---

## 3. Restrições e Segurança ("O que NÃO fazer")

1. **NUNCA commitar segredos**: `.env`, `.pem`, `.key`, `secrets.json` ou credenciais de banco (fiscalizado pelo pre-commit hook).
2. **NUNCA alterar configurações de qualidade sem permissão**: `tsconfig.json`, `eslint.config.js` e `vitest.config.ts` são protegidos pelo hook `guard_protected_files.py`.
3. **NUNCA rodar agentes de escrita concorrentes em arquivos compartilhados**: arquivos da raiz (`docker-compose.yml`, `package.json` raiz) são editados sequencialmente. O paralelismo é exclusivo para workspaces isolados (`apps/api` vs `apps/web`).
4. **NUNCA misturar lógica de jogo no Host**: novas regras pertencem a `apps/api/src/modules/games/<game>/`, nunca a rotas Fastify ou executors genéricos.
5. **NUNCA usar `any`**: TypeScript em modo strict em todos os arquivos.
6. **NUNCA fazer varredura manual cega**: Proibido ler dezenas de arquivos com `list_dir` e `view_file` para mapear dependências quando `graphify query` fornece os caminhos de forma instantânea e cirúrgica.
7. **NUNCA editar `package.json` manualmente para instalar dependências**: Sempre usar o comando de CLI `pnpm --filter <app> add ...`.
8. **NUNCA implementar código diretamente no chat principal**: Toda escrita de código DEVE ser delegada ao subagente correspondente (`backend-builder` ou `frontend-builder`) via `invoke_subagent`.
9. **NUNCA realizar pré-leitura exaustiva de arquivos no planejamento**: O Orquestrador deve delegar o aprofundamento aos subagentes.

---

## 4. Comandos Canônicos

```bash
# Validação completa de qualidade e cobertura
./scripts/verify.sh

# Gerenciamento de Dependências via CLI (Obrigatório)
pnpm --filter api add <pacote>               # Adicionar dependência em apps/api
pnpm --filter api add -D <pacote>            # Adicionar dependência de dev em apps/api
pnpm --filter web add <pacote>               # Adicionar dependência em apps/web
pnpm --filter web add -D <pacote>            # Adicionar dependência de dev em apps/web

# Grafo de Conhecimento do Codebase (Graphify)
graphify query "<pergunta ou conceito>"      # Consulta semântica e topológica no grafo
graphify explain "<símbolo ou módulo>"       # Explicar nós, conexões e blast radius
graphify path "<Módulo A>" "<Módulo B>"     # Menor caminho de dependência entre dois nós
graphify update .                            # Atualização incremental do grafo após editar código

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
