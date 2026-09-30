#!/usr/bin/env python3
"""
guard_protected_files.py — PreToolUse Hook para o Antigravity

Protege arquivos críticos de configuração (ESLint, Prettier, TypeScript, Vitest, Playwright, scripts de verificação),
forçando confirmação explícita do usuário (force_ask) antes de permitir qualquer modificação pela LLM.
"""
import json
import os
import sys
import re

PROTECTED_PATTERNS = [
    r"eslint\.config\.[cm]?[jt]s$",
    r"\.eslintrc(\.[a-z]+)?$",
    r"\.prettierrc(\.[a-z]+)?$",
    r"tsconfig(\..*)?\.json$",
    r"jsconfig(\..*)?\.json$",
    r"vitest\.config\.[cm]?[jt]s$",
    r"playwright\.config\.[cm]?[jt]s$",
    r"scripts/verify\.sh$",
]

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"decision": "allow"}))
            return

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        args = tool_call.get("args", {})
        
        # Identifica o caminho do arquivo alvo
        target_file = args.get("TargetFile") or args.get("target_file") or args.get("path") or ""
        
        if target_file:
            for pattern in PROTECTED_PATTERNS:
                if re.search(pattern, target_file):
                    # Arquivo protegido: exige confirmação explícita do usuário
                    output = {
                        "decision": "force_ask",
                        "reason": f"Alteração no arquivo protegido '{os.path.basename(target_file)}'. Confirmar alteração de configuração de qualidade/build/lint?"
                    }
                    print(json.dumps(output))
                    return

        # Para todos os demais arquivos, permite a execução normal
        print(json.dumps({"decision": "allow"}))
    except Exception:
        # Fallback seguro
        print(json.dumps({"decision": "allow"}))

if __name__ == "__main__":
    main()
