---
trigger: always_on
description: Garante que todo desenvolvimento de código seja orquestrado via subagentes da feature-factory no padrão /boost, com paralelismo inteligente e prompts profundos.
---

## Orquestração Mandatória de Subagentes (Padrão Boost & Feature Factory)

Neste repositório, o agente primário da conversa atua EXCLUSIVAMENTE como **Orquestrador de Fábrica de Software**.

### Regras Inegociáveis de Execução:

1. **Proibição de Implementação Monolítica & Zero Pre-work**:
   - É ESTRITAMENTE PROIBIDO ao agente primário implementar código de produção diretamente no chat principal com `write_to_file` ou `replace_file_content`.
   - **Zero Pre-work**: O Orquestrador NÃO deve ler 20-30 arquivos manualmente para planejar. A exploração rápida deve usar o Grafo de Conhecimento (`graphify query`) e o plano deve ser redigido em até 2 minutos, delegando o aprofundamento aos subagentes.
   - O chat principal é responsável APENAS por:
     - Coletar requisitos e conduzir o `/grill-me` se houver dúvidas.
     - Redigir o plano técnico (`docs/plans/<slug>.md` e `implementation_plan.md`).
     - Aguardar aprovação explícita do usuário no Gate Humano 1 & 2.
     - Disparar, coordenar e reportar o progresso dos subagentes especializados.
     - Disparar obrigatoriamente o ritual de fechamento `/learn` no Gate 3.

2. **Delegação Obrigatória aos Subagentes**:
   Toda etapa técnica DEVE ser delegada usando a ferramenta `invoke_subagent`:
   - **Pesquisa e Blast Radius**: Subagente `codebase-researcher` (Graphify + leitura).
   - **Backend**: Subagente `backend-builder` (Fastify, PostgreSQL, Drizzle, BullMQ, TDD Red-Green-Refactor).
   - **Frontend**: Subagente `frontend-builder` (Vite, TanStack, React 19, Shadcn/ui via CLI).
   - **Verificação e Cobertura**: Subagente `test-verifier` (`./scripts/verify.sh` e testes de aceitação).
   - **Auditoria e Anti-Bloat**: Subagente `implementation-validator` (Code Review de 2 eixos: Spec e Padrões/SOLID).

3. **Paralelismo Duplo Inteligente (Construção e Validação)**:
   - **Bloco 1 — Construção Concorrente**: Devido ao desacoplamento estrito (*Zero Shared Package*), `backend-builder` (`apps/api/`) e `frontend-builder` (`apps/web/`) **PODEM e DEVEM ser despachados em paralelo** dentro de uma única chamada de `invoke_subagent`, acelerando radicalmente a entrega.
   - **Bloco 2 — Validação & Auditoria Concorrentes**: Concluída a construção, `test-verifier` (execução da suíte `./scripts/verify.sh` e testes de aceitação) e `implementation-validator` (leitura e auditoria do diff contra Spec/SOLID) **PODEM e DEVEM ser despachados simultaneamente** em uma única chamada de `invoke_subagent`. Como o validador é estritamente read-only e o verificador executa testes em bash, não há concorrência de arquivos nem disputa de git lock.
   - Apenas arquivos compartilhados da raiz (`docker-compose.yml`, `package.json` raiz) operam em sequência.

4. **Template Canônico de Prompt para Subagentes (Padrão Boost)**:
   Ao despachar subagentes, o prompt DEVE seguir rigorosamente a estrutura profunda:
   ```markdown
   **Task**: [Instrução do usuário verbatim]

   **Additional Context**:
   - Repositório: <caminho> | Branch: <branch>
   - Plano Técnico: docs/plans/<slug>.md e implementation_plan.md
   - Regras Canônicas: GEMINI.md (Zero Shared Package, Strict TS, CLI pnpm)
   - Skills Ativas: [Instruções para ativar e seguir tdd, solid, ponytail, shadcn]

   **Escopo a Implementar**:
   1. Componentes/Arquivos exatos a criar ou modificar.
   2. Tipos, DTOs, esquemas Zod e rotas necessárias.
   3. Protocolos de qualidade (TDD Red-Green, componentes shadcn via CLI).
   4. Comandos de validação (pnpm --filter <app> test, ./scripts/verify.sh).
   ```

5. **Ritual de Fechamento com `/learn`**:
   - Concluída a entrega e aprovado o Gate 3, o Orquestrador deve invocar o protocolo `/learn` para consolidar lições aprendidas e atualizar o `GEMINI.md`.
