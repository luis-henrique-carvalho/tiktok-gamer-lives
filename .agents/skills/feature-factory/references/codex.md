# Feature Factory no Codex

Use esta rota para uma funcionalidade ou fase grande. O `AGENTS.md` da raiz continua sendo a regra do repositório. Execute somente as etapas relevantes ao pedido e use apenas ferramentas e skills disponíveis na sessão.

## Papéis

| Etapa | Responsável no Codex | Resultado esperado |
| --- | --- | --- |
| Pesquisa | `codebase_researcher`, se o impacto exigir delegação | Entradas, contratos, dependências e testes relevantes |
| História | Agente principal | Critérios de aceite e decisões de produto pendentes |
| Especificação | Agente principal | Plano curto em `docs/plans/` quando o escopo justificar |
| Backend | `backend_builder`, se houver trabalho em `apps/api/` | Código e testes no backend |
| Frontend | `frontend_builder`, se houver trabalho em `apps/web/` | Código e testes no frontend |
| Verificação | `test_verifier`, se a validação justificar delegação | Comandos executados, resultados e falhas |
| Revisão | `implementation_validator` | Achados acionáveis no diff ou ausência deles |

O agente principal pode coordenar diretamente. Use `feature_orchestrator` quando uma subdelegação própria trouxer benefício real; ele consome uma das vagas de subagente. Se a ferramenta permitir selecionar um agente personalizado, escolha o nome da tabela. Caso não permita, crie um subagente geral com tarefa explícita e peça que leia o TOML correspondente em `.codex/agents/`. Não trate `invoke_subagent`, `view_file`, `ask_question`, `Workspace:`, comandos de barra ou caminhos `.gemini/` como ferramentas do Codex.

## Sequência

1. Leia o `AGENTS.md` e as referências necessárias. Consulte `graphify` primeiro se o comando e o grafo estiverem disponíveis; confirme fatos importantes nos arquivos reais. Levante critérios de aceite e pergunte somente por decisões de produto ou design que impeçam a implementação correta.
2. Delimite arquivos, contratos entre API e web e comandos de validação. Para nova fase ou funcionalidade, use uma branch dedicada conforme o `AGENTS.md`. Registre um plano em `docs/plans/` quando ele ajudar a coordenar o trabalho; não imponha um artefato extra para mudanças simples.
3. Delegue backend e frontend em paralelo somente se ambos puderem editar arquivos separados. Acorde antes os contratos de rede. Arquivos compartilhados da raiz e mudanças de dependências ficam com um único responsável por vez. Para motor de jogo e workers seriais, exija TDD Red → Green → Refactor.
4. Após a construção, execute os testes e verificações aplicáveis (`./scripts/verify.sh --api`, `--web`, `--quick` ou completo, conforme o escopo). A revisão independente pode ocorrer em paralelo com a verificação apenas quando o verificador não estiver escrevendo arquivos; caso haja novos testes ou correções, revise o diff estável depois dessas alterações.
5. Corrija falhas confirmadas com o responsável pelo arquivo, repita as verificações afetadas e consolide o resultado. Registre somente decisões duradouras na documentação. Entregue ao usuário o que mudou, os testes, os achados da revisão e as limitações restantes.

Para cada delegação, informe a tarefa, o escopo de arquivos, as referências essenciais, o resultado esperado e se o agente pode escrever. Aguarde os resultados antes de iniciar etapas dependentes. Respeite aprovações exigidas pelo `AGENTS.md` ou pelo pedido do usuário; não crie gates adicionais para trabalho já autorizado.
