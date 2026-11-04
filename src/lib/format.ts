/** "★ 8.4 · 12 calificaciones" o "Sin calificaciones" */
export function formatRating(avg: number | null, count: number) {
  if (avg === null || count === 0) return 'Sin calificaciones';
  return `★ ${avg.toFixed(1)} · ${count} ${count === 1 ? 'calificación' : 'calificaciones'}`;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}
