/**
 * Formata pontuações para exibição amigável no overlay do OBS.
 */
export function formatScore(score: number): string {
  if (score >= 1_000_000) {
    return `${(score / 1_000_000).toFixed(1)}M`;
  }
  if (score >= 1_000) {
    return `${(score / 1_000).toFixed(1)}k`;
  }
  return score.toString();
}

export function calculatePercentage(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}
