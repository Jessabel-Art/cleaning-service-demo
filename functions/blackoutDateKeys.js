function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function parseLocalDateKey(dateKey) {
  if (!isDateKey(dateKey)) return null;
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addLocalDays(dateKey, days) {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

function getFullDayEndDateKeyExclusive(blackout) {
  if (isDateKey(blackout?.endDateKey)) {
    if (blackout.endDateKey === blackout.startDateKey) {
      return addLocalDays(blackout.endDateKey, 1);
    }
    return blackout.endDateKey;
  }
  if (isDateKey(blackout?.dateKey)) return addLocalDays(blackout.dateKey, 1);
  return null;
}

function isFullDayBlackoutDateBlocked(blackout, dateKey) {
  if (!blackout?.allDay || !isDateKey(dateKey)) return false;
  const startDateKey = isDateKey(blackout.startDateKey)
    ? blackout.startDateKey
    : isDateKey(blackout.dateKey)
    ? blackout.dateKey
    : null;
  const endDateKey = getFullDayEndDateKeyExclusive({ ...blackout, startDateKey });
  if (!startDateKey || !endDateKey) return false;
  return dateKey >= startDateKey && dateKey < endDateKey;
}

function getOccupiedEndDateKeyExclusive(endDate) {
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const endDateKey = toLocalDateKey(end);
  const isMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getMilliseconds() === 0;
  return isMidnight ? endDateKey : addLocalDays(endDateKey, 1);
}

function fullDayBlackoutOverlapsRange(blackout, rangeStart, rangeEnd) {
  if (!blackout?.allDay) return false;
  const rangeStartKey = toLocalDateKey(rangeStart);
  const rangeEndKey = getOccupiedEndDateKeyExclusive(rangeEnd);
  const blackoutStartKey = isDateKey(blackout.startDateKey)
    ? blackout.startDateKey
    : isDateKey(blackout.dateKey)
    ? blackout.dateKey
    : null;
  const blackoutEndKey = getFullDayEndDateKeyExclusive({
    ...blackout,
    startDateKey: blackoutStartKey,
  });
  if (!rangeStartKey || !rangeEndKey || !blackoutStartKey || !blackoutEndKey) return false;
  return rangeStartKey < blackoutEndKey && rangeEndKey > blackoutStartKey;
}

function blockedDateKeysForFullDayBlackout(blackout) {
  const keys = [];
  const startDateKey = isDateKey(blackout?.startDateKey)
    ? blackout.startDateKey
    : isDateKey(blackout?.dateKey)
    ? blackout.dateKey
    : null;
  const endDateKey = getFullDayEndDateKeyExclusive({ ...blackout, startDateKey });
  if (!blackout?.allDay || !startDateKey || !endDateKey) return keys;

  let current = startDateKey;
  while (current && current < endDateKey) {
    keys.push(current);
    current = addLocalDays(current, 1);
  }
  return keys;
}

module.exports = {
  addLocalDays,
  blockedDateKeysForFullDayBlackout,
  fullDayBlackoutOverlapsRange,
  getFullDayEndDateKeyExclusive,
  isDateKey,
  isFullDayBlackoutDateBlocked,
  parseLocalDateKey,
  toLocalDateKey,
};
