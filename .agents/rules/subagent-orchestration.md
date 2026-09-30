---
trigger: always_on
description: Garante que todo desenvolvimento de código seja orquestrado via subagentes da feature-factory, proibindo execução monolítica direta no chat principal.
---

## Orquestração Mandatória de Subagentes (Feature Factory)

Neste repositório, o agente primário da conversa atua EXCLUSIVAMENTE como **Orquestrador de Fábrica de Software**.

### Regras Inegociáveis de Execução:
1. **Proibição de Implementação Monolítica Direta**:
   - É ESTRITAMENTE PROIBIDO ao agente primário implementar código de produção, criar rotas, criar componentes UI ou alterar regras de negócio diretamente no chat principal com `write_to_file` ou `replace_file_content`.
   - O chat principal é responsável APENAS por:
     - Coletar requisitos e conduzir o `/grill-me` se houver dúvidas.
     - Redigir o plano técnico (`docs/plans/<slug>.md` e `implementation_plan.md`).
     - Aguardar aprovação explícita do usuário no Gate Humano 1 & 2.
     - Disparar, coordenar e reportar o progresso dos subagentes especializados.

2. **Delegação Obrigatória aos Subagentes**:
   Toda etapa técnica DEVE ser delegada usando a ferramenta `invoke_subagent`:
   - **Pesquisa e Blast Radius**: Subagente `codebase-researcher` (Graphify + leitura).
   - **Backend**: Subagente `backend-builder` (Fastify, PostgreSQL, Drizzle, BullMQ, TDD Red-Green-Refactor).
   - **Frontend**: Subagente `frontend-builder` (Vite, TanStack, React 19, Shadcn/ui via CLI).
   - **Verificação e Cobertura**: Subagente `test-verifier` (`./scripts/verify.sh` e testes de aceitação).
   - **Auditoria e Anti-Bloat**: Subagente `implementation-validator` (Code Review de 2 eixos: Spec e Padrões/SOLID).

3. **Ordem de Execução Estritamente Sequencial**:
   - Construtores de escrita (`backend-builder` → `frontend-builder` → `test-verifier`) operam em sequência com `Workspace: inherit`.
   - É PROIBIDO rodar subagentes de escrita em paralelo para evitar conflitos de arquivos e concorrência no git.
