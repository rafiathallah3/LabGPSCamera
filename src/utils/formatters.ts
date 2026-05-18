export const formatCoordinate = (coord: number, isLatitude: boolean) => {
  const absolute = Math.abs(coord);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  const direction = isLatitude 
    ? (coord >= 0 ? 'N' : 'S') 
    : (coord >= 0 ? 'E' : 'W');

  return `${degrees}°${minutes}'${seconds}" ${direction}`;
};

export const formatAltitude = (altitude: number | null) => {
  if (altitude === null) return '---';
  return `${altitude.toFixed(1)}m`;
};

export type TimeFormat = '12h' | '24h';

export const formatDateTime = (timestamp: number, timeFormat: TimeFormat = '24h') => {
  const date = new Date(timestamp);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  let timeStr: string;
  if (timeFormat === '12h') {
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const mins = String(date.getMinutes()).padStart(2, '0');
    timeStr = `${hours}:${mins} ${ampm}`;
  } else {
    const hh = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    timeStr = `${hh}:${mins}`;
  }

  // Get timezone offset as GMT±HH:MM
  const tzOffset = -date.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const tzStr = `GMT ${tzSign}${tzHours}:${tzMins}`;

  return `${dayName}, ${dd}/${mm}/${yyyy} ${timeStr} ${tzStr}`;
};
