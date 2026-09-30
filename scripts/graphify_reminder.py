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
        ws = workspace_paths[0] if workspace_paths else os.getcwd()

        import shutil
        import subprocess

        graphify_bin = shutil.which("graphify")
        if not graphify_bin:
            print(json.dumps({}))
            return

        graphify_dir = os.path.join(ws, "graphify-out")
        graph_json = os.path.join(graphify_dir, "graph.json")

        # 1. Se o grafo não existir, gera do zero automaticamente
        if not os.path.exists(graph_json):
            try:
                subprocess.run(
                    [graphify_bin, "extract", ".", "--code-only"],
                    cwd=ws,
                    capture_output=True,
                    timeout=20,
                )
                subprocess.run(
                    [graphify_bin, "cluster-only", "."],
                    cwd=ws,
                    capture_output=True,
                    timeout=20,
                )
            except Exception:
                pass
        else:
            # 2. Se já existir, sincroniza incrementalmente (AST rápida, ~0.4s)
            try:
                subprocess.run(
                    [graphify_bin, "update", "."],
                    cwd=ws,
                    capture_output=True,
                    timeout=10,
                )
            except Exception:
                pass

        message = (
            "🔍 GRAPHIFY FIRST — O grafo de conhecimento em `graphify-out/` foi sincronizado automaticamente. "
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
