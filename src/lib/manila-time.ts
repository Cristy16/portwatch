// Asia/Manila is a fixed UTC+8 offset with no DST, so all of this is safe as plain arithmetic.

export function manilaEndOfDayToUTC(dateStr: string): string {
  // dateStr = "2026-09-25" (from <input type="date">)
  // 23:59:59 in UTC+8 = 15:59:59 UTC same day
  return `${dateStr}T15:59:59.000Z`;
}

export function manilaLocalToUTC(datetimeLocal: string): string {
  // datetimeLocal = "2026-09-25T14:30" (from <input type="datetime-local">)
  // Treated as Asia/Manila wall-clock time regardless of the admin's browser timezone.
  return new Date(`${datetimeLocal}:00+08:00`).toISOString();
}

export function nowManilaDatetimeLocal(): string {
  const manila = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 16);
}

export function utcToManilaDatetimeLocal(utcIso: string): string {
  const manila = new Date(new Date(utcIso).getTime() + 8 * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 16);
}

export function utcToManilaDateOnly(utcIso: string): string {
  const manila = new Date(new Date(utcIso).getTime() + 8 * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 10);
}

export function sevenDaysAgoISO(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}