// "Add to calendar" helpers: a downloadable .ics file (Apple / Outlook / Google import)
// and a one-click Google Calendar link. Times are treated as Philippine local time.

const pad = (n) => String(n).padStart(2, '0');
const compact = (dateStr) => dateStr.replace(/-/g, '');                       // 2026-10-20 -> 20261020
const icsEscape = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// 24h "HH:MM" + minutes -> "HHMM00"
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor((total / 60) % 24))}${pad(total % 60)}00`;
}

// event: { title, date: 'YYYY-MM-DD', time?: 'HH:MM', location?, description? }
function toTimes(event) {
  if (event.time && /^\d{2}:\d{2}$/.test(event.time)) {
    const start = `${compact(event.date)}T${event.time.replace(':', '')}00`;
    const end = `${compact(event.date)}T${addMinutes(event.time, 60)}`;
    return { start, end, allDay: false };
  }
  return { start: compact(event.date), end: nextDay(event.date), allDay: true };
}

export function googleCalendarUrl(event) {
  const { start, end } = toTimes(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || '',
    location: event.location || '',
    ctz: 'Asia/Manila'
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(event) {
  const { start, end, allDay } = toTimes(event);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const dt = (v) => (allDay ? `;VALUE=DATE:${v}` : `;TZID=Asia/Manila:${v}`);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PetCare//Reminders//EN',
    'BEGIN:VEVENT',
    `UID:${stamp}-${Math.random().toString(36).slice(2)}@petcare`,
    `DTSTAMP:${stamp}`,
    `DTSTART${dt(start)}`,
    `DTEND${dt(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    event.location ? `LOCATION:${icsEscape(event.location)}` : null,
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^\w]+/g, '-').slice(0, 40) || 'petcare-event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
