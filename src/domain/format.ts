export const number = (n: number | null) => n === null ? 'N/D' : Math.round(n).toLocaleString('fr-FR');
export const compact = (n: number) => Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const percent = (n: number | null) => n === null ? 'N/D' : `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
export const dateLabel = (iso: string, full = false) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: full ? 'long' : 'short', ...(full ? { year: 'numeric' } : {}), timeZone: 'UTC' });
