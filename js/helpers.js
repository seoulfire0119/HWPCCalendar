import { DAY_BLOCK, NIGHT_BLOCK, ENTRY_REGEX } from './constants.js';

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseEntryString(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  const match = raw.match(ENTRY_REGEX);
  if (!match) {
    return null;
  }
  const [, center, name, dutyType, incidentType, timeRange] = match;
  return {
    center,
    name: name.trim(),
    dutyType,
    incidentType,
    timeRange: timeRange ?? '',
  };
}

export function formatEntryString({ center, name, dutyType, incidentType, timeRange }) {
  const cleanName = (name ?? '').trim();
  if (!center || !cleanName || !dutyType || !incidentType) {
    throw new Error('필수 필드가 누락되었습니다.');
  }
  const base = `[${center}]${cleanName}(${dutyType}-${incidentType}`;
  if (timeRange) {
    return `${base};${timeRange})`;
  }
  return `${base})`;
}

export function stringToEntries(content) {
  if (!content) {
    return [];
  }
  return content
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function entriesToString(entries) {
  return entries.join(',');
}

function parseTimeRange(range) {
  if (!range) {
    return null;
  }
  const [start, end] = range.split('~');
  if (!start || !end) {
    return null;
  }
  const startMinutes = toMinutes(start);
  const endMinutesRaw = toMinutes(end);
  if (startMinutes === null || endMinutesRaw === null) {
    return null;
  }
  let endMinutes = endMinutesRaw;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  return { start: startMinutes, end: endMinutes };
}

function toMinutes(time) {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return hour * 60 + minute;
}

function overlaps(range, block) {
  if (!range) {
    return false;
  }
  const blockStart = block.start;
  const blockEnd = block.end;
  const segments = [{ start: range.start, end: range.end }];
  if (range.end > 24 * 60) {
    segments.push({ start: range.start - 24 * 60, end: range.end - 24 * 60 });
  }
  return segments.some(({ start, end }) => start < blockEnd && end > blockStart);
}

function affectsDay(entry) {
  if (entry.dutyType === '주간') {
    return true;
  }
  if (entry.dutyType === '야간') {
    return false;
  }
  if (entry.dutyType === '당번') {
    return true;
  }
  if (entry.dutyType === '기타') {
    const range = parseTimeRange(entry.timeRange);
    return overlaps(range, DAY_BLOCK);
  }
  return false;
}

function affectsNight(entry) {
  if (entry.dutyType === '야간') {
    return true;
  }
  if (entry.dutyType === '주간') {
    return false;
  }
  if (entry.dutyType === '당번') {
    return true;
  }
  if (entry.dutyType === '기타') {
    const range = parseTimeRange(entry.timeRange);
    return overlaps(range, NIGHT_BLOCK);
  }
  return false;
}

export function aggregateCounts(entries) {
  const counts = {
    day: { regular: 0, overtime: 0 },
    night: { regular: 0, overtime: 0 },
  };
  entries.forEach((entryString) => {
    const entry = parseEntryString(entryString);
    if (!entry) {
      return;
    }
    const key = entry.incidentType === '초과근무' ? 'overtime' : 'regular';
    if (affectsDay(entry)) {
      counts.day[key] += 1;
    }
    if (affectsNight(entry)) {
      counts.night[key] += 1;
    }
  });
  return counts;
}

export function formatCountLabel(counts) {
  const day = counts?.day ?? { regular: 0, overtime: 0 };
  const night = counts?.night ?? { regular: 0, overtime: 0 };
  return `주간 ${day.regular}(${day.overtime}) · 야간 ${night.regular}(${night.overtime})`;
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const parsedA = parseEntryString(a);
    const parsedB = parseEntryString(b);
    if (!parsedA || !parsedB) {
      return a.localeCompare(b, 'ko');
    }
    return parsedA.name.localeCompare(parsedB.name, 'ko');
  });
}

export function describeEntry(entryString) {
  const entry = parseEntryString(entryString);
  if (!entry) {
    return {
      centerLabel: '',
      name: entryString,
      meta: '',
      time: '',
    };
  }
  const dutyLabel = entry.dutyType === '기타' ? '기타(시간기반)' : entry.dutyType;
  return {
    centerLabel: `[${entry.center}]`,
    name: entry.name,
    meta: `${dutyLabel} · ${entry.incidentType}`,
    time: entry.timeRange ? `시간: ${entry.timeRange}` : '',
  };
}
