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

export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};
