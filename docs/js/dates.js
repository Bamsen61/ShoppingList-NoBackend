const osloDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function getOsloDate(now = new Date()) {
  const parts = Object.fromEntries(osloDateFormatter.formatToParts(now).map(part => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function calendarDay(dateText) {
  if (typeof dateText !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
  const date = new Date(dateText + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) return null;
  return date.getTime() / 86400000;
}

export function wasBoughtWithinDays(item, days, now = new Date()) {
  if (!Array.isArray(item.BoughtDate)) return false;
  const cutoff = calendarDay(getOsloDate(now)) - days;
  return item.BoughtDate.some(dateText => {
    const day = calendarDay(dateText);
    return day !== null && day >= cutoff;
  });
}
