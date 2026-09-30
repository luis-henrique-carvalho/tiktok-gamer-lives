---
name: feature
description: Inicia o ciclo de desenvolvimento de uma nova feature ou fase seguindo a esteira de subagentes da feature-factory
---

# Workflow: Feature Factory

Quando o usuário solicitar o desenvolvimento de uma feature, fase ou refatoração:

1. **Fase 1 (Pesquisa)**: Invoque o subagente `codebase-researcher` para mapear dependências e blast radius usando `graphify`.
2. **Entrevista (/grill-me)**: Se existirem ambiguidades técnicas ou de UX, conduza a entrevista interativa usando `ask_question`.
3. **Fase 2 (Planejamento)**: Redija a especificação em `docs/plans/<slug>.md` e no artefato `implementation_plan.md`.
4. **Gate Humano 1 & 2**: PARE e aguarde aprovação explícita do usuário.
5. **Fase 3 (Construção Sequencial)**:
   - Invoque `backend-builder` com `Workspace: inherit` (se envolver backend).
   - Invoque `frontend-builder` com `Workspace: inherit` (se envolver frontend).
   - Invoque `test-verifier` com `Workspace: inherit` para validar testes e `./scripts/verify.sh`.
6. **Fase 4 (Validação Independente)**: Invoque `implementation-validator` para auditar o git diff contra a Spec e os padrões do `GEMINI.md`.
7. **Gate Humano 3 & Learn**: Apresente o `walkthrough.md`, colete aprovação do usuário e execute o ritual `/learn`.
