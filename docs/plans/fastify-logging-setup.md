# Plano de Implementação: Configuração de Logging do Fastify

Configurar o sistema de logging estruturado do Fastify em `apps/api` seguindo as melhores práticas oficiais da documentação do Fastify e Pino.

## Contexto & Decisões Alinhadas (Gate 0)
1. **Formatação por Ambiente**:
   - **Desenvolvimento (`development`)**: logs coloridos e legíveis via `pino-pretty` (com timestamp formatado e remoção de ruídos de PID/hostname).
   - **Produção (`production`)**: JSON estruturado de alto desempenho com Pino nativo.
   - **Testes (`test`)**: logger desativado (`false`) ou `silent` por padrão para não poluir a saída dos testes.
2. **Nível de Log Configurável**:
   - Inclusão da variável `LOG_LEVEL` (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`) no esquema Zod `apps/api/src/common/config/env.ts`.
3. **Segurança e Redação de Dados Sensíveis (Redact)**:
   - Configuração de `redact: ['req.headers.authorization', 'req.headers.cookie']` para prevenir vazamento de credenciais e tokens em logs de requisição.

---

## Modificações Propostas

### 1. Dependências do Backend (`apps/api`)
- Instalar `pino-pretty` como dependência de desenvolvimento via `pnpm --filter api add -D pino-pretty`.

### 2. Configuração do Ambiente (`apps/api/src/common/config/env.ts`)
- Adicionar campo opcional `LOG_LEVEL` com validação de enum Pino (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`).
- Atualizar testes de ambiente em `apps/api/src/common/config/__tests__/env.test.ts`.

### 3. Configuração Modular de Logger (`apps/api/src/common/config/logger.ts`)
- Criar `getLoggerConfig(env: Env): FastifyServerOptions['logger']` encapsulando as regras de ambiente, `pino-pretty`, redaction e log level.
- Criar suíte de testes unitários para o builder de logger em `apps/api/src/common/config/__tests__/logger.test.ts`.

### 4. Integração no Server (`apps/api/src/app.ts` & `apps/api/src/index.ts`)
- Integrar `getLoggerConfig` como configuração padrão em `buildApp` e no bootstrap `index.ts`.
- Garantir que testes continuem limpos sem logs indesejados.

---

## Plano de Verificação

### Testes Automatizados
- `pnpm --filter api test` (Vitest)
- `pnpm --filter api test:coverage` (Garantir cobertura >= 90% no backend)
- `./scripts/verify.sh --api` (Validação completa de lint, typecheck e testes)
