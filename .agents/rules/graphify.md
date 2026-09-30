---
trigger: always_on
description: Use o grafo Graphify para orientar perguntas sobre arquitetura e relações do codebase quando estiver disponível.
---

## Graphify

Para perguntas sobre o codebase, arquitetura ou relações entre módulos, consulte primeiro `graphify-out/` com `graphify query`, `graphify path` ou `graphify explain` quando o grafo e o CLI estiverem disponíveis. Use as ferramentas equivalentes do ambiente se houver integração MCP. Confirme no código os fatos relevantes antes de editar.

Se o grafo estiver ausente, desatualizado, insuficiente ou o comando não estiver disponível, use busca e leitura direta dos arquivos. O relatório e a wiki do grafo ajudam em revisões amplas, mas não substituem a verificação do código.

Após mudanças de código, atualize o grafo com `graphify update .` quando o comando estiver disponível e a atualização for pertinente à tarefa.
