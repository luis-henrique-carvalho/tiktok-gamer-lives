---
trigger: always_on
description: Organiza tarefas grandes com os recursos de delegação disponíveis no ambiente, sem impor ferramentas específicas.
---

## Orquestração Mandatória de Subagentes (Padrão Boost & Feature Factory)

Neste repositório, o agente primário da conversa atua como **User Bridge** e a execução técnica é delegada ao subagente **`feature-orchestrator`**.

### Regras Inegociáveis de Execução:

1. **Topologia Hierárquica em 2 Níveis**:
   - **Nível 1 — Chat Canvas (Root / User Bridge)**:
     - Realiza o **Gate 0 Mandatório (/grill-me)**: formula de 2 a 3 perguntas interativas via `ask_question` para sanar dúvidas de regras, casos de borda e decisões técnicas.
     - Redige o plano técnico (`docs/plans/<slug>.md` e `implementation_plan.md`) via Grafo de Conhecimento (`graphify query`) em até 2 minutos (Zero Pre-work), **incluindo obrigatoriamente diagramas Mermaid estruturais** (Topologia `flowchart TD`, Ciclo de Vida `stateDiagram-v2` e/ou Sequência `sequenceDiagram`).
     - Aguarda aprovação explícita do usuário no Gate Humano 1 & 2.
     - Invoca o subagente `feature-orchestrator` (`Role: "Feature Factory Orchestrator"`) com o plano aprovado.
     - Apresenta o resultado final no Gate 3 e dispara o fechamento `/learn`.
   - **Nível 2 — Subagente Orquestrador (`feature-orchestrator`)**:
     - Ativa suas skills no Passo 0.
     - Comanda a esteira técnica e gerencia os blocos de execução paralela.
     - Conduz o loop de auto-correção iterativo caso haja quebras de teste ou code smells.
     - Reporta o resultado consolidado ao Chat Canvas.

2. **Passo 0 Mandatório de Ativação de Skills (Progressive Disclosure)**:
   - Todo agente e subagente DEVE iniciar sua execução lendo os arquivos `SKILL.md` de seus respectivos playbooks através da ferramenta `view_file`. Sem isso, o Antigravity não ativa as skills e os badges de telemetria não são registrados na UI.

3. **Paralelismo Duplo Inteligente (Construção e Validação)**:
   - **Bloco 1 — Construção Concorrente**: Devido ao desacoplamento estrito (*Zero Shared Package*), `backend-builder` (`apps/api/`) e `frontend-builder` (`apps/web/`) **PODEM e DEVEM ser despachados em paralelo** dentro de uma única chamada de `invoke_subagent`.
   - **Bloco 2 — Validação & Auditoria Concorrentes**: Concluída a construção, `test-verifier` (execução da suíte `./scripts/verify.sh` e testes de aceitação) e `implementation-validator` (leitura e auditoria do diff contra Spec/SOLID) **PODEM e DEVEM ser despachados simultaneamente** em uma única chamada de `invoke_subagent`. Como o validador é estritamente read-only e o verificador executa testes em bash, não há concorrência de arquivos nem disputa de git lock.
   - Apenas arquivos compartilhados da raiz (`docker-compose.yml`, `package.json` raiz) operam em sequência.
   - **Identificadores Canônicos (`TypeName`)**:
     Ao invocar workers via `invoke_subagent`, utilize SEMPRE os identificadores únicos definidos em `.agents/agents/<name>.md`:
     - `backend-builder` para o backend (`apps/api/`).
     - `frontend-builder` para o frontend (`apps/web/`).
     - `test-verifier` para a suíte de testes.
     - `implementation-validator` para a auditoria de código.
     **NUNCA use `TypeName: "self"`** em despachos a partir do orquestrador (`self` é restrito ao agente raiz e sua invocação a partir de um subagente é bloqueada pelo runtime com erro fatal).

4. **Template Canônico de Prompt para Subagentes (Padrão Boost)**:
   Ao despachar subagentes, o prompt DEVE seguir rigorosamente a estrutura profunda:
   ```markdown
   **Task**: [Instrução do usuário verbatim]

   **Passo 0: Ativação Obrigatória de Skills (MANDATÓRIO)**:
   Antes de executar qualquer comando ou criar/modificar arquivos, você DEVE carregar seus playbooks invocando `view_file` nos caminhos canônicos:
   - file:///home/luis/.../SKILL.md
   - file:///home/luis/.../SKILL.md

   **Additional Context**:
   - Repositório: <caminho> | Branch: <branch>
   - Plano Técnico: docs/plans/<slug>.md e implementation_plan.md
   - Regras Canônicas: GEMINI.md (Zero Shared Package, Strict TS, CLI pnpm)

   **Escopo a Implementar**:
   1. Componentes/Arquivos exatos a criar ou modificar.
   2. Tipos, DTOs, esquemas Zod e rotas necessárias.
   3. Protocolos de qualidade (TDD Red-Green, componentes shadcn via CLI).
   4. Comandos de validação (pnpm --filter <app> test, ./scripts/verify.sh).
   ```

5. **Ritual de Fechamento com `/learn`**:
   - Concluída a entrega e aprovado o Gate 3, o Chat Canvas deve invocar o protocolo `/learn` para consolidar lições aprendidas e atualizar o `GEMINI.md`.