export type DateInput = Date | string | number | null | undefined;
export type CalendarMode = 'deadline' | 'scheduled';

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTimePart(value: number): string {
  return value.toString().padStart(2, '0');
}

export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${formatTimePart(h)}:${formatTimePart(m)}`);
    }
  }
  return slots;
}
