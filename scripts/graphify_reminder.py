#!/usr/bin/env python3
"""
graphify_reminder.py — PreInvocation Hook para o Antigravity

Injeta um lembrete efêmero no primeiro turno de interação (invocationNum == 0)
se existir a pasta graphify-out/, instruindo o modelo a consultar o grafo
antes de realizar varreduras manuais com grep/find.
"""
import json
import os
import sys

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({}))
            return

        payload = json.loads(raw_input)
        invocation_num = payload.get("invocationNum", 0)

        # Dispara apenas na primeira chamada de modelo
        if invocation_num != 0:
            print(json.dumps({}))
            return

        workspace_paths = payload.get("workspacePaths", [])
        graphify_exists = any(
            os.path.isdir(os.path.join(p, "graphify-out")) for p in workspace_paths
        )

        if not graphify_exists:
            print(json.dumps({}))
            return

        message = (
            "🔍 GRAPHIFY FIRST — Este projeto possui um grafo de conhecimento em `graphify-out/`. "
            "ANTES de usar grep, find, view_file ou list_dir para explorar o codebase, "
            "você DEVE executar:\n"
            "  • `graphify query \"<termo>\"` — para buscas conceituais/arquiteturais\n"
            "  • `graphify explain \"<módulo>\"` — para entender um componente específico\n"
            "  • `graphify path \"<A>\" \"<B>\"` — para mapear dependências entre módulos\n"
            "Somente recorra a grep/find/view_file quando graphify não retornar informação suficiente."
        )

        result = {"injectSteps": [{"ephemeralMessage": message}]}
        print(json.dumps(result))
    except Exception:
        print(json.dumps({}))

if __name__ == "__main__":
    main()
