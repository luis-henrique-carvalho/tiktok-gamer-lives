---
name: feature-factory
description: "Orquestrador agnóstico e reutilizável no modelo Fábrica de Software. Executa a cadeia de 7 subagentes potencializada por skills especializadas (graphify, plan, grill-me, tdd, solid, ponytail, shadcn, code-review), com restrição de ferramentas, seleção de modelos e 3 gates de aprovação humana."
---

# Fábrica de Software Global (Feature Factory)

Orquestrador universal para desenvolvimento de software no modelo de **Fábrica de Software**. Totalmente **desacoplado de tecnologia ou linguagem**, adaptando-se a qualquer projeto ao consultar o `GEMINI.md` (ou `AGENTS.md`) local e integrando o catálogo de **skills especializadas** instaladas no sistema.

Organiza o ciclo de vida de qualquer demanda em camadas estritas de **pesquisa**, **especificação**, **construção sequencial** e **validação independente**, intercaladas por pontos de aprovação e alinhamento humano.

---

## 1. Princípios de Governança Universal

1. **Adesão às Regras Locais**: O orquestrador nunca assume tecnologias por conta própria. A stack, padrões de pastas e comandos de teste são extraídos dinamicamente do `GEMINI.md` (ou `AGENTS.md`) do projeto ativo.
2. **Potencialização por Skills Especializadas**: Cada fase da fábrica incorpora playbooks nativos (`graphify`, `/plan`, `/grill-me`, `tdd`, `solid`, `ponytail`, `shadcn`, `code-review`) para garantir excelência técnica em cada etapa.
3. **Resolução Proativa de Decisões (`/grill-me`)**: Nenhuma suposição crítica de design, UX ou regra de negócio é feita sem antes entrevistar o usuário de forma estruturada.
4. **Restrição Estrita de Ferramentas**:
   - Agentes de pesquisa e auditoria têm permissão **exclusiva de leitura** (`view_file`, `grep_search`, `find_by_name`, `list_dir`).
   - Modificações de código são permitidas apenas aos builders.
5. **Seleção de Modelos Otimizada**:
   - `flash` / `flash_lite`: Pesquisa inicial, varredura de código, mapeamento de chamadas e leitura leve.
   - `pro`: Raciocínio arquitetural, elaboração de especificações, implementação de código (TDD) e auditoria de qualidade.
6. **Escrita Estritamente Sequencial**:
   - Builders (`backend-builder` → `frontend-builder` → `test-verifier`) **nunca rodam em paralelo**. Paralelismo é reservado unicamente a tarefas de leitura e auditoria.

---

## 2. A Cadeia de 7 Agentes & Matriz de Skills

| Papel | Tipo / Agente | Modelo | Permissão | Skills Integradas | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. `codebase-researcher`** | `research` | `flash` | Leitura | **`graphify`**, **`research`** | Mapeia o grafo de dependências, pontos de impacto e interfaces afetadas sem alterar código. |
| **2. `story-writer`** | Orquestrador | `pro` | Leitura | **`domain-modeling`**, **`/grill-me`** | Converte a solicitação em User Stories claras. Aciona entrevista interativa para alinhar dúvidas de regras e requisitos. |
| **3. `spec-writer`** | Orquestrador | `pro` | Docs | **`/plan`**, **`codebase-design`**, **`/grill-me`** | Resolve trade-offs técnicos via `/grill-me`, desenha módulos profundos (*deep modules*), costuras (*seams*) de teste e salva em `docs/plans/<slug>.md`. |
| **4. `backend-builder`** | `self` | `pro` | Escrita | **`tdd`**, **`solid`**, **`ponytail`**, **`codebase-design`** | Constrói regras de negócio, dados e APIs com ciclo estrito Red → Green, aplicando SOLID e Clean Architecture balanceados com YAGNI radical. |
| **5. `frontend-builder`** | `self` | `pro` | Escrita | **`shadcn`**, **`frontend-design`**, **`modern-web-guidance`** | Constrói telas e componentes com hierarquia visual intencional, Tailwind e padrões modernos de frontend sem acoplar backend. |
| **6. `test-verifier`** | `self` | `pro` | Escrita / Cmd | **`tdd`**, **`chrome-devtools`**, **`a11y-debugging`** | Executa suítes de teste, adiciona testes de aceitação e verifica acessibilidade/performance onde aplicável. |
| **7. `implementation-validator`** | `code-review` | `pro` | Leitura | **`code-review`**, **`solid`**, **`ponytail-review`**, **`efficient-swe-workflow`** | Audita o diff final em dois eixos (Spec vs. Padrões do `GEMINI.md` e SOLID), caçando code smells e complexidade desnecessária. |

---

## 3. Fluxo de Execução Passo a Passo

```mermaid
flowchart TD
    START([Demanda da Feature]) --> FASE0[0. Leitura do GEMINI.md do Projeto Ativo]
    FASE0 --> FASE1[1. Codebase Researcher: Modelo Flash + graphify]
    FASE1 --> DECISAO_CHECK{Há ambiguidades ou trade-offs de design?}
    
    DECISAO_CHECK -- "Sim" --> GRILL_ME[Protocolo /grill-me: Entrevista Interativa via ask_question]
    DECISAO_CHECK -- "Não" --> FASE2[2. Story & Spec Writer: /plan + codebase-design]
    GRILL_ME --> FASE2
    
    FASE2 --> GATE1{Gate Humano 1 & 2: Aprovação do Plano?}
    GATE1 -- "Ajustes Solicitados" --> FASE2
    GATE1 -- "Aprovado" --> FASE3_BE[3.1. Backend Builder: tdd + ponytail]
    
    FASE3_BE --> FASE3_FE[3.2. Frontend Builder: shadcn + frontend-design]
    FASE3_FE --> FASE3_TEST[3.3. Test Verifier: tdd + validação de suites]
    
    FASE3_TEST --> FASE4[4. Implementation Validator: code-review 2 eixos + ponytail-review]
    FASE4 --> CHECK_FAIL{Divergência Crítica?}
    CHECK_FAIL -- "Sim" --> FASE3_BE
    CHECK_FAIL -- "Não" --> GATE3{Gate Humano 3: Homologação Final}
    GATE3 -- "Aprovado" --> COMMIT([Conclusão / Commit Seguro])
```

---

### Fase 0: Inicialização de Contexto
Antes de disparar qualquer subagente:
1. Localize e leia o arquivo `GEMINI.md` ou `AGENTS.md` na raiz do projeto.
2. Identifique a stack, os comandos oficiais de teste/build e os links para `docs/spec/`.

---

### Fase 1: Mapeamento e Pesquisa (`codebase-researcher`)
- **Skills Ativas**: `graphify`, `research`.
- **Procedimento**:
  - Dispare o subagente com modelo leve (`flash`) e ferramentas restritas a leitura.
  - Utilize o **`graphify`** para mapear pontos de entrada afetados, interfaces que restringem a mudança e testes existentes que comprovam o resultado.
  - Não realize nenhuma alteração de arquivos.

---

### 🎙️ Protocolo de Entrevista Interativa (`/grill-me`)
Se durante a pesquisa ou levantamento surgirem requisitos ambíguos, bifurcações arquiteturais, trade-offs técnicos ou dúvidas sobre UX/comportamento:
- **Ative o `/grill-me`**:
  1. Conduza uma entrevista interativa com o usuário utilizando a ferramenta `ask_question`.
  2. Faça **uma pergunta por vez**, caminhando de forma metódica pelos ramos da árvore de decisão.
  3. Para cada pergunta, apresente alternativas objetivas prefixando a melhor opção técnica com **`(Recommended)`**.
  4. Se uma dúvida puder ser respondida inspecionando o código ou os testes existentes, pesquise o código em vez de perguntar ao usuário.
  5. Prossiga para a redação da especificação somente após todas as decisões estarem alinhadas.

---

### Fase 2: Elaboração da História & Especificação (`story-writer` & `spec-writer`)
- **Skills Ativas**: `/plan`, `domain-modeling`, `codebase-design`, `/grill-me` (opcional `prototype`).
- **Procedimento**:
  - Utilize o **`domain-modeling`** para assegurar que entidades, estados e nomes respeitem o modelo do domínio.
  - Utilize o **`codebase-design`** para planejar módulos profundos (*deep modules*) e definir explicitamente as costuras (*seams*) públicas onde os testes serão conectados.
  - Utilize o **`/plan`** para formalizar o documento técnico consolidando as decisões do `/grill-me`, incluir diagramas Mermaid de fluxo e persistir em `docs/plans/<feature-slug>.md`.
  - Sincronize com o artefato de planejamento interativo do Antigravity (`implementation_plan.md`).

---

### 🛑 Gate Humano 1 & 2: Alinhamento de Requisitos e Arquitetura
- **PARE**. Apresente a especificação detalhada ao usuário.
- Não inicie nenhuma codificação até receber aprovação explícita ou solicitação de ajustes.

---

### Fase 3: Construção Sequencial (Builders)
Execute os builders **estritamente em sequência**:

#### 3.1. `backend-builder` (Modelo: `pro`)
- **Skills Ativas**: `tdd`, `solid`, `ponytail`, `codebase-design`.
- **Diretrizes**:
  - **`tdd`**: Escreva testes apenas nas costuras pré-acordadas. Siga o ciclo *Red → Green*: um teste que falha por vez, seguido da menor implementação que passa.
  - **`solid`**: Aplique inversão de dependência (DIP/Hexagonal Ports & SPIs), responsabilidade única (SRP) e segregação de interfaces (ISP). Valide entradas com Zod nas bordas e utilize tipagem estrita sem vazamento de infraestrutura para o domínio.
  - **`ponytail`**: Aplique o princípio da menor solução viável (YAGNI). Prefira recursos padrão da linguagem antes de bibliotecas externas; evite classes de suporte especulativas e abstrações prematuras.

#### 3.2. `frontend-builder` (Modelo: `pro`)
- **Skills Ativas**: `shadcn`, `frontend-design`, `modern-web-guidance`.
- **Diretrizes**:
  - **`shadcn`**: Reutilize primitivos acessíveis e componentes existentes.
  - **`frontend-design`**: Aplique estética visual e tipografia distintas e intencionais.
  - **`modern-web-guidance`**: Siga boas práticas de performance, CSS moderno e preserve o isolamento total dos tipos do backend (contratos de consumo locais).

#### 3.3. `test-verifier` (Modelo: `pro`)
- **Skills Ativas**: `tdd`, `chrome-devtools`, `a11y-debugging`.
- **Diretrizes**:
  - Execute a suite oficial de testes (`pnpm test` ou equivalente).
  - Adicione testes de aceitação ponta a ponta cobrindo a User Story.
  - Realize validação de acessibilidade e ausência de regressões.

---

### Fase 4: Validação Independente (`implementation-validator`)
- **Skills Ativas**: `code-review`, `solid`, `ponytail-review`, `efficient-swe-workflow`.
- **Procedimento**:
  - Dispare o subagente independente de revisão (apenas leitura, modelo `pro`):
    - **Eixo 1 (Spec)**: Avalia se os critérios de aceite foram cumpridos à risca e se houve *scope creep*.
    - **Eixo 2 (Standards & SOLID)**: Avalia se o código respeita o `GEMINI.md`, tipagem estrita, princípios SOLID e o catálogo de code smells (Bloaters, Couplers, Primitive Obsession).
    - **Auditoria de Complexidade (`ponytail-review`)**: Identifica abstrações mortas, duplicações e flexibilidade especulativa no diff.
  - Caso existam defeitos críticos, o orquestrador devolve a demanda ao builder correspondente para correção.

---

### 🛑 Gate Humano 3: Homologação Final
- Apresente o resumo das alterações, status dos testes e o relatório de validação no `walkthrough.md`.
- Aguarde o aval do usuário para finalizar e commitar a alteração.
