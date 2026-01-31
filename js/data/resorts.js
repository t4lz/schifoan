/**
 * Static list of ski resorts with coordinates, elevations, and typical season.
 * Used to find resorts within max distance and to fetch mountain weather.
 * Distances are approximate from Munich; for other cities we compute distance from coordinates.
 *
 * Data sources: public maps and resort info. Elevations in m, coordinates WGS84.
 */

/** bergfexSlug: slug for Bergfex ski forecast (https://www.bergfex.com/[slug]/wetter/prognose/). */
/** @type {Array<{ id: string, name: string, lat: number, lon: number, elevationTop: number, elevationBottom: number, distanceFromMunichKm: number, bergfexSlug?: string }>} */
var RESORTS = [
  {
    id: 'spitzingsee',
    name: 'Spitzingsee',
    lat: 47.67,
    lon: 11.88,
    elevationTop: 1600,
    elevationBottom: 1100,
    distanceFromMunichKm: 58,
    bergfexSlug: 'spitzingsee-tegernsee',
  },
  {
    id: 'sudelfeld',
    name: 'Sudelfeld / Bayrischzell',
    lat: 47.67,
    lon: 12.0,
    elevationTop: 1610,
    elevationBottom: 780,
    distanceFromMunichKm: 61,
    bergfexSlug: 'sudelfeld-bayrischzell',
  },
  {
    id: 'lenggries',
    name: 'Lenggries / Brauneck',
    lat: 47.68,
    lon: 11.55,
    elevationTop: 1555,
    elevationBottom: 700,
    distanceFromMunichKm: 50,
    bergfexSlug: 'brauneck-lenggries',
  },
  {
    id: 'garmisch',
    name: 'Garmisch-Partenkirchen / Zugspitze',
    lat: 47.42,
    lon: 10.98,
    elevationTop: 2962,
    elevationBottom: 700,
    distanceFromMunichKm: 90,
    bergfexSlug: 'zugspitze',
  },
  {
    id: 'oberammergau',
    name: 'Oberammergau',
    lat: 47.6,
    lon: 11.07,
    elevationTop: 2050,
    elevationBottom: 830,
    distanceFromMunichKm: 72,
    bergfexSlug: 'laber-oberammergau',
  },
  {
    id: 'mittenwald',
    name: 'Mittenwald / Karwendel',
    lat: 47.45,
    lon: 11.28,
    elevationTop: 2244,
    elevationBottom: 920,
    distanceFromMunichKm: 81,
    bergfexSlug: 'mittenwald-karwendel',
  },
  {
    id: 'wendelstein',
    name: 'Wendelstein',
    lat: 47.7,
    lon: 12.01,
    elevationTop: 1838,
    elevationBottom: 780,
    distanceFromMunichKm: 65,
    bergfexSlug: 'wendelstein',
  },
  {
    id: 'tegernsee',
    name: 'Tegernsee / Wallberg',
    lat: 47.7,
    lon: 11.73,
    elevationTop: 1722,
    elevationBottom: 700,
    distanceFromMunichKm: 55,
    bergfexSlug: 'wallberg-tegernseertal',
  },
  {
    id: 'kitzbuehel',
    name: 'Kitzbühel (AT)',
    lat: 47.45,
    lon: 12.39,
    elevationTop: 2000,
    elevationBottom: 800,
    distanceFromMunichKm: 120,
    bergfexSlug: 'kitzbuehel',
  },
  {
    id: 'zell-am-see',
    name: 'Zell am See / Kaprun (AT)',
    lat: 47.32,
    lon: 12.8,
    elevationTop: 3029,
    elevationBottom: 750,
    distanceFromMunichKm: 150,
    bergfexSlug: 'kitzsteinhorn-kaprun',
  },
];

/**
 * Typical ski season (month-day) for Alpine resorts in this list.
 * Lifts are assumed open when the selected date falls in [seasonStart, seasonEnd].
 * Approximate; real opening depends on snow and operator.
 */
/** @type {{ start: string, end: string }} */
var SEASON = {
  start: '12-01', // December 1
  end: '04-15',   // April 15
};
