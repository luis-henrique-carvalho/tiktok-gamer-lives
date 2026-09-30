#!/usr/bin/env python3
"""
check_shadcn_usage.py — Validador de Uso Predominante de Componentes Shadcn UI

Camadas de detecção:

  Camada 1 — Tags HTML nativas substituíveis:
    <button>, <input>, <textarea>, <select>, <dialog>, <table>, <progress>, <hr>
    ➔ Button, Input, Textarea, Select, Dialog, Table, Progress, Separator
    
    Tipografia Nativa e Headers:
    <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <p>, <blockquote>
    ➔ Typography (import: '@/components/ui/typography')

  Camada 2 — Padrões semânticos: spans/divs coloridos que deveriam ser Badge
    <span className="text-{emerald|green|red|yellow|indigo|orange|destructive}...">
    quando usados como indicadores de status isolados (não em fluxo de texto)

  Camada 3 — Contêineres manuais com bg-muted/rounded que deveriam ser Card/Alert
    <div className="...rounded...border...bg-...p-..."> com conteúdo semântico

  Camada 4 — Auditoria de Arquivos sem imports Shadcn UI
    Arquivos com estrutura JSX substancial (>50 linhas) sem compor o catálogo Shadcn.

Bypass explícito por linha:
    {/* shadcn-ignore: <motivo> */}
    // shadcn-ignore: <motivo>
"""

import re
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# CAMADA 1 — Tags HTML nativas e substituições diretas (Regras /shadcn + Typography)
# ──────────────────────────────────────────────────────────────────────────────

NATIVE_TAG_MAP = {
    # Componentes de Ação / Formulário / Estrutura
    "button":     {"component": "Button",     "import": "@/components/ui/button"},
    "input":      {"component": "Input",      "import": "@/components/ui/input"},
    "textarea":   {"component": "Textarea",   "import": "@/components/ui/textarea"},
    "select":     {"component": "Select",     "import": "@/components/ui/select"},
    "dialog":     {"component": "Dialog",     "import": "@/components/ui/dialog"},
    "table":      {"component": "Table",      "import": "@/components/ui/table"},
    "progress":   {"component": "Progress",   "import": "@/components/ui/progress"},
    "hr":         {"component": "Separator",  "import": "@/components/ui/separator"},

    # Tipografia Padronizada Obrigatória
    "h1":         {"component": "Typography variant='h1'",         "import": "@/components/ui/typography"},
    "h2":         {"component": "Typography variant='h2'",         "import": "@/components/ui/typography"},
    "h3":         {"component": "Typography variant='h3'",         "import": "@/components/ui/typography"},
    "h4":         {"component": "Typography variant='h4'",         "import": "@/components/ui/typography"},
    "h5":         {"component": "Typography variant='h4'",         "import": "@/components/ui/typography"},
    "h6":         {"component": "Typography variant='h4'",         "import": "@/components/ui/typography"},
    "p":          {"component": "Typography variant='p'/'muted'",  "import": "@/components/ui/typography"},
    "blockquote": {"component": "Typography variant='blockquote'", "import": "@/components/ui/typography"},
}

_NATIVE_TAGS_RE = re.compile(
    r"<\s*(" + "|".join(NATIVE_TAG_MAP.keys()) + r")\b"
)

# ──────────────────────────────────────────────────────────────────────────────
# CAMADA 2 — Anti-patterns de Composição e Estilo (da skill /shadcn)
# ──────────────────────────────────────────────────────────────────────────────

_LIVE_DOT_RE = re.compile(
    r"""(?:\bsize-(?:1|1\.5|2|2\.5)\b|\bw-(?:1|1\.5|2)\b\s+\bh-(?:1|1\.5|2)\b).*?\b(?:bg-(?:emerald|green|red|rose|amber|yellow|blue|violet))\b"""
)

def _get_enclosing_tag(lines: list[str], line_idx: int) -> tuple[str | None, int]:
    for i in range(line_idx - 1, max(-1, line_idx - 16), -1):
        line = lines[i]
        matches = list(re.finditer(r"<\s*([A-Za-z0-9_.-]+)\b(?!\s*\/)", line))
        if matches:
            return matches[-1].group(1), i + 1
    return None, line_idx

def _has_shadcn_ignore(lines: list[str], line_idx: int, tag_line_idx: int) -> bool:
    if "shadcn-ignore" in lines[line_idx - 1]:
        return True
    if line_idx > 1 and "shadcn-ignore" in lines[line_idx - 2]:
        return True
    if "shadcn-ignore" in lines[tag_line_idx - 1]:
        return True
    if tag_line_idx > 1 and "shadcn-ignore" in lines[tag_line_idx - 2]:
        return True
    return False

_STATUS_COLOR_RE = re.compile(
    r"""
    <\s*span\b
    [^>]*
    className\s*=\s*[{"']
    [^"'{}]*
    (?:
        text-(?:emerald|green|red|yellow|orange|indigo|violet|blue|rose)-[0-9]+
      | text-destructive
      | text-success
    )
    """,
    re.VERBOSE,
)

_BADGE_FALSE_POSITIVE_PATTERNS = [
    re.compile(r"^\s*<(Typography|li|td|th)\b"),
    re.compile(r"className.*size-\d"),
    re.compile(r"animate-spin"),
    re.compile(r"\(\{[^}]+\}"),
    re.compile(r"className.*(?:label|caption|helper|hint|description)"),
    re.compile(r"text-(?:sm|base|lg|xl|2xl|3xl)\s+font-(?:bold|semibold)"),
    re.compile(r"<(pre|code)\b"),
]

def _is_badge_false_positive(line: str, lines: list[str], line_idx: int) -> bool:
    for pat in _BADGE_FALSE_POSITIVE_PATTERNS:
        if pat.search(line):
            return True
    if line_idx >= 2:
        prev = lines[line_idx - 2]
        if re.search(r"<(pre|code)\b", prev):
            return True
    return False

# ──────────────────────────────────────────────────────────────────────────────
# CAMADA 3 — Contêineres manuais (Card-like / Alert-like / ScrollArea-like)
# ──────────────────────────────────────────────────────────────────────────────

_MANUAL_SCROLL_RE = re.compile(
    r"""<\s*div\b[^>]*className\s*=\s*[{"'][^"'{}]*\b(?:overflow-y-(?:auto|scroll)|max-h-\d+|scrollbar-\w+)\b""",
    re.VERBOSE,
)

_MANUAL_CARD_RE = re.compile(
    r"""
    <\s*div\b
    [^>]*className\s*=\s*[{"']
    (?=.*\brounded(?:-\w+)?\b)
    (?=.*\bborder(?:-\w+)?\b)
    (?=.*\bbg-(?:card|muted|background|white|black)(?:/\d+)?\b)
    """,
    re.VERBOSE,
)

_CARD_FALSE_POSITIVE_PATTERNS = [
    re.compile(r"group\b"),
    re.compile(r"aspect-"),
    re.compile(r"relative\b.*absolute\b"),
    re.compile(r"rounded-full"),
    re.compile(r"backdrop-blur"),
    re.compile(r"border-dashed"),
    re.compile(r"<(pre|code)\b"),
]

def _is_card_false_positive(line: str) -> bool:
    for pat in _CARD_FALSE_POSITIVE_PATTERNS:
        if pat.search(line):
            return True
    return False

EXCLUDED_DIRS = [
    "components/ui",
    "test-utils",
    "tests",
]

def is_excluded(file_path: Path, web_src: Path) -> bool:
    rel = file_path.relative_to(web_src).as_posix()
    if any(rel.startswith(exc) for exc in EXCLUDED_DIRS):
        return True
    if file_path.name.endswith((".test.tsx", ".spec.tsx", ".test.ts", ".spec.ts")):
        return True
    return False

def scan_file(file_path: Path, web_src: Path) -> list[dict]:
    violations: list[dict] = []
    try:
        lines = file_path.read_text(encoding="utf-8").splitlines()
    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}", file=sys.stderr)
        return violations

    rel = file_path.relative_to(web_src.parent.parent).as_posix()

    for line_idx, line in enumerate(lines, start=1):
        if "shadcn-ignore" in line:
            continue
        if line_idx > 1 and "shadcn-ignore" in lines[line_idx - 2]:
            continue

        m = _NATIVE_TAGS_RE.search(line)
        if m:
            tag = m.group(1).lower()
            if tag == "input" and 'type="hidden"' in line.lower():
                pass
            else:
                repl = NATIVE_TAG_MAP[tag]
                violations.append({
                    "layer": 1,
                    "severity": "error",
                    "file": rel,
                    "line": line_idx,
                    "content": line.strip(),
                    "message": (
                        f"PROIBIDO USO DE <{tag}> NATIVO/CUSTOMIZADO. "
                        f"Substitua obrigatoriamente por <{repl['component']}> (import: '{repl['import']}'). "
                        "Caso haja justificativa técnica excepcional onde Shadcn não atenda, adicione "
                        "'// shadcn-ignore: <motivo detalhado>' na linha anterior."
                    ),
                })
                continue

        if "animate-pulse" in line:
            tag, tag_line = _get_enclosing_tag(lines, line_idx)
            if not _has_shadcn_ignore(lines, line_idx, tag_line):
                if tag and tag[0].islower():
                    if not _LIVE_DOT_RE.search(line):
                        violations.append({
                            "layer": 2,
                            "severity": "error",
                            "file": rel,
                            "line": line_idx,
                            "content": line.strip(),
                            "message": (
                                f"PROIBIDO USO DE SKELETON MANUAL (<{tag} animate-pulse>). "
                                "Use <Skeleton> de '@/components/ui/skeleton'."
                            ),
                        })
                        continue

        if _STATUS_COLOR_RE.search(line):
            if not _is_badge_false_positive(line, lines, line_idx):
                violations.append({
                    "layer": 2,
                    "severity": "error",
                    "file": rel,
                    "line": line_idx,
                    "content": line.strip(),
                    "message": (
                        "Indicador de status com cor hardcoded — use <Badge> de "
                        "'@/components/ui/badge' com variant='outline'/'destructive'/'secondary'. "
                        "Se a cor é decorativa (ícone, texto inline), use '// shadcn-ignore: decorativo'."
                    ),
                })

        if _MANUAL_SCROLL_RE.search(line) and not _is_card_false_positive(line):
            violations.append({
                "layer": 3,
                "severity": "warning",
                "file": rel,
                "line": line_idx,
                "content": line.strip(),
                "message": (
                    "<div> com scroll manual (overflow-y / max-h / scrollbar) — "
                    "considere usar <ScrollArea> de '@/components/ui/scroll-area'. "
                    "Se for controle nativo estrito, use '// shadcn-ignore: scroll'."
                ),
            })

        if _MANUAL_CARD_RE.search(line):
            if not _is_card_false_positive(line):
                violations.append({
                    "layer": 3,
                    "severity": "warning",
                    "file": rel,
                    "line": line_idx,
                    "content": line.strip(),
                    "message": (
                        "<div> com rounded+border+bg parece um Card/Alert manual — "
                        "considere <Card>/<CardContent> ou <Alert> de '@/components/ui/'. "
                        "Se for layout estrutural, use '// shadcn-ignore: layout'."
                    ),
                })

    return violations

def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    web_src = repo_root / "apps" / "web" / "src"
    if not web_src.exists():
        web_src = repo_root / "web" / "src"

    if not web_src.exists():
        print(f"\033[1;33m[Shadcn Linter] Diretório de frontend não encontrado ainda ({web_src}). Ignorando validação.\033[0m")
        sys.exit(0)

    all_violations: list[dict] = []
    tsx_files = list(web_src.rglob("*.tsx"))

    for tsx_file in tsx_files:
        if is_excluded(tsx_file, web_src):
            continue
        try:
            content = tsx_file.read_text(encoding="utf-8")
            loc = len(content.splitlines())
            has_shadcn = bool(re.search(r'from\s+["\']@/components/ui/', content))
            has_bypass = "shadcn-ignore" in content
            
            if loc >= 50 and not has_shadcn and not has_bypass:
                rel = tsx_file.relative_to(web_src.parent.parent).as_posix()
                all_violations.append({
                    "layer": 4,
                    "severity": "warning",
                    "file": rel,
                    "line": 1,
                    "content": f"Arquivo possui {loc} linhas de UI sem nenhum import de '@/components/ui/*'",
                    "message": (
                        "COMPONENTE SEM USO DE SHADCN UI. "
                        "Este arquivo possui estrutura de interface considerável mas não compõe nenhum componente "
                        "do catálogo Shadcn (ex: Card, Badge, Button, AspectRatio, Skeleton, Alert, Separator, Typography, etc.). "
                        "Refatore para compor o catálogo Shadcn ou adicione '// shadcn-ignore: <motivo>' se for um componente puramente customizado."
                    ),
                })
        except Exception:
            pass

    for tsx_file in tsx_files:
        if is_excluded(tsx_file, web_src):
            continue
        all_violations.extend(scan_file(tsx_file, web_src))

    errors   = [v for v in all_violations if v["severity"] == "error"]
    warnings = [v for v in all_violations if v["severity"] == "warning"]

    if not all_violations:
        print("\033[1;32m✓ Shadcn UI Linter: Todos os componentes utilizam o catálogo Shadcn e Typography corretamente.\033[0m")
        sys.exit(0)

    if errors:
        print("\033[1;31m=====================================================\033[0m")
        print("\033[1;31m  ✗ VIOLAÇÕES DA REGRA SHADCN UI / TYPOGRAPHY (erros)\033[0m")
        print("\033[1;31m=====================================================\033[0m\n")
        for v in errors:
            layer_tag = f"[Camada {v['layer']}]"
            print(f"  \033[1;33m{v['file']}:{v['line']}\033[0m  \033[0;90m{layer_tag}\033[0m")
            print(f"    Linha: \033[0;37m{v['content']}\033[0m")
            print(f"    \033[1;31m{v['message']}\033[0m\n")
        print(f"\033[1;31m{len(errors)} erro(s) encontrado(s).\033[0m\n")

    if warnings:
        print("\033[1;33m=====================================================\033[0m")
        print("\033[1;33m  ⚠ AVISOS SHADCN UI (candidatos a refatoração)      \033[0m")
        print("\033[1;33m=====================================================\033[0m\n")
        for v in warnings:
            print(f"  \033[1;33m{v['file']}:{v['line']}\033[0m  \033[0;90m[Camada {v['layer']}]\033[0m")
            print(f"    Linha: \033[0;37m{v['content']}\033[0m")
            print(f"    \033[0;33m{v['message']}\033[0m\n")
        print(f"\033[1;33m{len(warnings)} aviso(s) encontrado(s).\033[0m\n")

    if errors:
        sys.exit(1)
    else:
        print("\033[1;32m✓ Sem erros críticos de Shadcn. Verifique os avisos acima.\033[0m")
        sys.exit(0)

if __name__ == "__main__":
    main()
