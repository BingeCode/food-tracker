/**
 * Format a nutrition value as a compact string like "1347/2700".
 */
export function formatCompact(consumed: number, goal: number): string {
  return `${Math.round(consumed)}/${Math.round(goal)}`;
}
