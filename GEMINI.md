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
6. **Estratégia Git, Worktrees & Paralelismo Inteligente**: Novas fases e funcionalidades são desenvolvidas em branches dedicadas (`feat/<nome>`). Subagentes usam modo `inherit` no fluxo de construção e `branch` (Git Worktree isolado) para spikes. O monorepo adota paralelismo duplo via `invoke_subagent`: (1) **Construção Concorrente**: graças ao Zero Shared Package, `backend-builder` (`apps/api/`) e `frontend-builder` (`apps/web/`) rodam em paralelo; (2) **Validação Concorrente**: na etapa de qualidade, `test-verifier` (execução da suíte `./scripts/verify.sh`) e `implementation-validator` (leitura e auditoria do diff contra Spec/SOLID) rodam simultaneamente, reduzindo o tempo de entrega pela metade.
7. **Graphify First & Manutenção de Grafo**: Toda pesquisa sobre arquitetura, relações entre módulos e fluxo de execução deve consultar o grafo de conhecimento em `graphify-out/` (`graphify query`, `graphify explain`, `graphify path`) antes de qualquer varredura genérica com grep/find. O grafo é sincronizado automaticamente a cada início de turno (`graphify update .`).
8. **Instalação Canônica via CLI**: Proibido editar `package.json` manualmente para adicionar ou remover pacotes. Toda dependência DEVE ser instalada via CLI pnpm com filtro explícito de workspace (`pnpm --filter <app> add [-D] <pacote>`), garantindo integridade do `pnpm-lock.yaml` e validação imediata de peer dependencies.
9. **Topologia Hierárquica de Subagentes & Subagente Orquestrador (Padrão Boost)**: O agente primário do chat atua como User Bridge (interface com o usuário, entrevista de alinhamento Gate 0 via `ask_question`, aprovação de gates). A execução da esteira técnica é delegada ao subagente `feature-orchestrator` (`Role: "Feature Factory Orchestrator"`), que comanda os builders e validadores. Proibida a implementação monolítica e a coordenação plana direta no chat.
10. **Gate 0 Mandatório (/grill-me) & Zero Pre-work**: Antes de redigir qualquer especificação ou plano técnico, o agente do chatcanvas DEVE conduzir o alinhamento de premissas com o usuário via ferramenta `ask_question` (2 a 3 perguntas de múltipla escolha sobre regras de negócio, casos de borda e expectativas de DX). O planejamento técnico é feito em até 2 minutos via Grafo de Conhecimento (`graphify query`), delegando aprofundamentos à fábrica.
11. **Passo 0 Mandatório de Ativação de Skills (Progressive Disclosure)**: Conforme a arquitetura oficial do Antigravity, agentes e subagentes DEVEM obrigatoriamente invocar `view_file` nos arquivos `SKILL.md` de seus playbooks como seu primeiríssimo tool call antes de qualquer execução técnica, garantindo carregamento do conhecimento e telemetria correta na UI.
12. **Ritual Obrigatório de Fechamento (/learn)**: Ao término do Gate 3 e homologação bem-sucedida de qualquer fase/feature, o agente DEVE disparar o protocolo `/learn` para consolidar novas regras e aprendizados perpétuos no `GEMINI.md`.

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
9. **NUNCA iniciar planejamento sem conduzir o Gate 0 (/grill-me)**: É mandatório formular perguntas de alinhamento com `ask_question` para sanar dúvidas e regras de negócio antes do plano.
10. **NUNCA disparar agentes ou subagentes sem o Passo 0 de Skills**: É obrigatório invocar `view_file` nos arquivos `SKILL.md` para ativar os playbooks técnicos no motor do Antigravity.

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
