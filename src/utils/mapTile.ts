/**
 * Generates a MapTiler satellite tile URL from latitude/longitude.
 * Uses the free-tier satellite-v2 tiles API.
 *
 * Also returns the fractional position within the tile so the
 * marker pin can be placed at the user's exact location.
 */

const ZOOM = 17;
const MAPTILER_API_KEY = 'Cx9C7z0NzIrgFRqCyAWR';

export interface MapTileResult {
  url: string;
  /** Fractional x position within the tile (0 = left edge, 1 = right edge) */
  xFraction: number;
  /** Fractional y position within the tile (0 = top edge, 1 = bottom edge) */
  yFraction: number;
}

export function getMapTile(lat: number, lng: number): MapTileResult {
  const n = Math.pow(2, ZOOM);
  const xExact = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yExact =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const x = Math.floor(xExact);
  const y = Math.floor(yExact);

  // Fractional position of the user within this tile (0..1)
  const xFraction = xExact - x;
  const yFraction = yExact - y;

  const url = `https://api.maptiler.com/tiles/satellite-v2/${ZOOM}/${x}/${y}.jpg?key=${MAPTILER_API_KEY}`;

  return { url, xFraction, yFraction };
}
