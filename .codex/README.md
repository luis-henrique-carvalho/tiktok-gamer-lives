# Agentes do Codex

O `AGENTS.md` da raiz é a regra compartilhada entre Codex e Antigravity. Os papéis do Antigravity continuam em `.agents/agents/`; os arquivos TOML deste diretório registram os papéis correspondentes no Codex. A skill compartilhada `feature-factory` aponta para [a rota completa do Codex](../.agents/skills/feature-factory/references/codex.md) e preserva o fluxo Antigravity nas seções seguintes.

| Codex | Playbook compartilhado com Antigravity |
| --- | --- |
| `codebase_researcher` | `.agents/agents/codebase-researcher.md` |
| `backend_builder` | `.agents/agents/backend-builder.md` |
| `frontend_builder` | `.agents/agents/frontend-builder.md` |
| `test_verifier` | `.agents/agents/test-verifier.md` |
| `implementation_validator` | `.agents/agents/implementation-validator.md` |
| `feature_orchestrator` | `.agents/agents/feature-orchestrator.md` |

Peça explicitamente a delegação quando quiser usar esses papéis, por exemplo: “Use `backend_builder` e `frontend_builder` em paralelo em arquivos separados; depois peça validação a `test_verifier` e revisão a `implementation_validator`.” O limite de `.codex/config.toml` permite três subagentes simultâneos, além do agente principal. A configuração da sessão ou do aplicativo pode impor um limite menor.
