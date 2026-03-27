export type WorkingHoursDay = { open: string; close: string };
export type WorkingHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', WorkingHoursDay>
>;

// JS getDay() order: 0=Sun, 1=Mon, ..., 6=Sat
const DAY_KEYS: Array<keyof WorkingHours> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const ATHENS_DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Returns the current hour, minute, and day-of-week in Europe/Athens time. */
function getAthensNow(): { hours: number; minutes: number; dayIndex: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Athens',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  const hours = parseInt(get('hour')) % 24; // guard against '24' returned for midnight
  const minutes = parseInt(get('minute'));
  const dayIndex = ATHENS_DAY_MAP[get('weekday')] ?? 0;

  return { hours, minutes, dayIndex };
}

const DAY_LABELS: Record<NonNullable<keyof WorkingHours>, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return (m || 0) === 0
    ? `${hour}${period}`
    : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

export type OpenStatus = {
  isOpen: boolean;
  statusText: string;
};

export function getOpenStatus(working_hours?: WorkingHours | null): OpenStatus | null {
  if (!working_hours) return null;
  const { hours, minutes, dayIndex } = getAthensNow();
  const dayKey = DAY_KEYS[dayIndex];
  const dayHours = working_hours[dayKey];

  if (!dayHours) return { isOpen: false, statusText: 'Closed today' };

  const currentMinutes = hours * 60 + minutes;
  const openMinutes = parseMinutes(dayHours.open);
  const closeMinutes = parseMinutes(dayHours.close);
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    return { isOpen: true, statusText: `Open · Closes ${formatTime(dayHours.close)}` };
  }
  if (currentMinutes < openMinutes) {
    return { isOpen: false, statusText: `Closed · Opens ${formatTime(dayHours.open)}` };
  }
  return { isOpen: false, statusText: `Closed` };
}

export function getAllDays(working_hours: WorkingHours): Array<{
  key: keyof WorkingHours;
  label: string;
  hours: WorkingHoursDay | null;
  isToday: boolean;
}> {
  const { dayIndex: todayIdx } = getAthensNow();
  const orderedKeys: Array<keyof WorkingHours> = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  ];
  return orderedKeys.map(key => ({
    key,
    label: DAY_LABELS[key],
    hours: working_hours[key] ?? null,
    isToday: DAY_KEYS.indexOf(key) === todayIdx,
  }));
}
