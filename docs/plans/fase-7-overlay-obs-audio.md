# Fase 7 — Frontend: Overlay OBS (`/overlay`) & Áudio

Entrega o Browser Source transparente de 1080×1920 para o OBS. Ele consome o snapshot coalescido e o `contribution_alert` da sala `session:${sessionId}`. O overlay possui estrutura comum (transparência, conexão, simulação e pausa), renderizadores registrados por `gameId` com os temas Neon e Minimal, e um motor de áudio procedural com limitador de polifonia. O escopo cobre só o **frontend**: nenhuma mudança em `apps/api`.

## Decisões do Gate 0 (aprovadas)

| # | Decisão |
|---|---|
| 1 | Sessão via `/overlay?sessionId=...`. Novo card **Link do Overlay** no dashboard gera e copia a URL. `join` e `GET /api/sessions/:id` já são públicos. |
| 2 | Distintivo de simulação via `?mode=simulation\|live`. Valor padrão `simulation`, o mais seguro. |
| 3 | Áudio via `?volume=0..1&muted=0\|1`. Para mudar, o operador atualiza o Browser Source. |
| 4 | Registro de renderizadores por `gameId` (`axb`). Tema escolhido por `?theme=neon\|minimal`, padrão `neon`. |

## Autoplay e Transparência
- **Autoplay**: No OBS (CEF) o áudio toca sem intervenção manual. Em navegadores padrão (fora do OBS), o AudioContext é desbloqueado com o banner/botão flutuante "Clique para ativar áudio".
- **Transparência**: Regra CSS `html.overlay-transparent, html.overlay-transparent body { background: transparent !important; }` aplicada dinamicamente ao montar a rota `/overlay`.

## Arquivos Entregues (kebab-case)
1. **Utilitário Compartilhado**:
   - `apps/web/src/lib/overlay-url.ts`
   - `apps/web/src/lib/__tests__/overlay-url.test.ts`
2. **Motor de Áudio Procedural**:
   - `apps/web/src/features/overlay/audio/audio-effect-engine.ts`
   - `apps/web/src/features/overlay/audio/__tests__/audio-effect-engine.test.ts`
3. **Zustand Store de Overlay**:
   - `apps/web/src/features/overlay/stores/use-overlay-store.ts`
   - `apps/web/src/features/overlay/stores/__tests__/use-overlay-store.test.ts`
4. **Hook de Sessão do Overlay**:
   - `apps/web/src/features/overlay/hooks/use-overlay-session.ts`
   - `apps/web/src/features/overlay/hooks/__tests__/use-overlay-session.test.tsx`
5. **Componentes e Temas do Overlay**:
   - `apps/web/src/features/overlay/components/overlay-status-badges.tsx`
   - `apps/web/src/features/overlay/components/contribution-alert-badge.tsx`
   - `apps/web/src/features/overlay/components/round-celebration-banner.tsx`
   - `apps/web/src/features/overlay/components/audio-effect-player.tsx`
   - `apps/web/src/features/overlay/components/__tests__/audio-effect-player.test.tsx`
   - `apps/web/src/features/overlay/themes/neon-tower.tsx`
   - `apps/web/src/features/overlay/themes/neon-arena-theme.tsx`
   - `apps/web/src/features/overlay/themes/minimal-theme.tsx`
   - `apps/web/src/features/overlay/themes/__tests__/neon-arena-theme.test.tsx`
   - `apps/web/src/features/overlay/themes/__tests__/minimal-theme.test.tsx`
   - `apps/web/src/features/overlay/renderers/unsupported-game-fallback.tsx`
   - `apps/web/src/features/overlay/renderers/overlay-renderer-registry.tsx`
   - `apps/web/src/features/overlay/renderers/__tests__/overlay-renderer-registry.test.tsx`
   - `apps/web/src/features/overlay/views/overlay-view.tsx`
   - `apps/web/src/features/overlay/views/__tests__/overlay-view.test.tsx`
6. **Rota do Overlay**:
   - `apps/web/src/routes/overlay.tsx`
   - `apps/web/src/routes/__tests__/overlay.test.tsx`
7. **CSS e Estilos**:
   - `apps/web/src/styles/index.css`
8. **Dashboard Integration**:
   - `apps/web/src/features/dashboard/components/overlay-volume-controls.tsx`
   - `apps/web/src/features/dashboard/components/overlay-link-card.tsx`
   - `apps/web/src/features/dashboard/components/__tests__/overlay-link-card.test.tsx`
   - `apps/web/src/features/dashboard/views/dashboard-view.tsx`
   - `apps/web/src/features/dashboard/__tests__/dashboard-view.test.tsx`
