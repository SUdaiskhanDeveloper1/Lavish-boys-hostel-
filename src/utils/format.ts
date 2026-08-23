import dayjs from 'dayjs';
import { CURRENCY, DATE_FORMAT } from '@/constants';

/** Format a number as the configured hostel currency. */
export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format an ISO date/timestamp for display. */
export function formatDate(value: dayjs.ConfigType): string {
  if (!value) return '—';
  return dayjs(value).format(DATE_FORMAT);
}

export function formatDateTime(value: dayjs.ConfigType): string {
  if (!value) return '—';
  return dayjs(value).format(`${DATE_FORMAT} HH:mm`);
}

/** First day of the given month (used for fee_month). */
export function monthStart(value: dayjs.ConfigType): string {
  return dayjs(value).startOf('month').format('YYYY-MM-DD');
}

export function monthLabel(value: dayjs.ConfigType): string {
  if (!value) return '—';
  return dayjs(value).format('MMMM YYYY');
}

/** Human initials for avatars. */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
