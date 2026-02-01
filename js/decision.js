/**
 * Decision logic: from criteria and weather data, produce one of five outcomes.
 * Lifts/slopes must be "open" (season check) for any answer other than "Nein."
 */

/** Possible outcomes (in order from best to worst). */
var OUTCOMES = Object.freeze([
  'Ja!',
  'Joa',
  'geht',
  'nicht so wirklich',
  'Nein.',
]);

/**
 * Numeric rank for outcome (higher = better). Used for sorting.
 * @param {string} outcome
 * @returns {number}
 */
function outcomeRank(outcome) {
  const i = OUTCOMES.indexOf(outcome);
  return i >= 0 ? OUTCOMES.length - 1 - i : -1;
}

/**
 * Criteria from the user (min/max and optional fresh snow).
 * @typedef {{
 *   maxDistanceKm: number,
 *   minTemp: number,
 *   maxTemp: number,
 *   maxWindKmh: number,
 *   minSnowTopCm: number,
 *   minSnowBottomCm: number,
 *   requireFreshSnow: boolean,
 *   minFreshSnowCm: number
 * }} Criteria
 */

/**
 * Weather and context for the selected resort/date.
 * @typedef {{
 *   tempMin: number,
 *   tempMax: number,
 *   windMax: number,
 *   snowTopCm: number,
 *   snowBottomCm: number,
 *   freshSnowCm: number,
 *   liftsOpen: boolean,
 *   resortInRange: boolean,
 *   resortName?: string,
 *   distanceKm?: number
 * }} WeatherContext
 */

/**
 * Compute the ski-day outcome from criteria and weather context.
 * @param {Criteria} criteria
 * @param {WeatherContext} ctx
 * @returns {{ outcome: string, reason?: string }}
 */
function decide(criteria, ctx) {
  if (!ctx.liftsOpen) {
    return { outcome: 'Nein.', reason: 'Lifte/Pisten sind außerhalb der Saison oder geschlossen.' };
  }
  if (!ctx.resortInRange) {
    return { outcome: 'Nein.', reason: 'Kein Skigebiet in der gewählten maximalen Entfernung.' };
  }

  const tMin = ctx.tempMin;
  const tMax = ctx.tempMax;
  const wind = ctx.windMax;
  const snowTop = ctx.snowTopCm;
  const snowBottom = ctx.snowBottomCm;
  const fresh = ctx.freshSnowCm;

  const tempOk = tMin >= criteria.minTemp && tMax <= criteria.maxTemp;
  const windOk = wind <= criteria.maxWindKmh;
  const snowTopOk = snowTop >= criteria.minSnowTopCm;
  const snowBottomOk = snowBottom >= criteria.minSnowBottomCm;
  const freshOk = !criteria.requireFreshSnow || fresh >= criteria.minFreshSnowCm;

  if (!tempOk) {
    return { outcome: 'Nein.', reason: `Temperatur außerhalb des Bereichs (min ${criteria.minTemp}°C – max ${criteria.maxTemp}°C).` };
  }
  if (!windOk) {
    return { outcome: 'Nein.', reason: `Wind zu stark (max ${criteria.maxWindKmh} km/h).` };
  }
  if (!snowTopOk) {
    return { outcome: 'Nein.', reason: `Zu wenig Schnee oben (min ${criteria.minSnowTopCm} cm).` };
  }
  if (!snowBottomOk) {
    return { outcome: 'Nein.', reason: `Zu wenig Schnee unten (min ${criteria.minSnowBottomCm} cm).` };
  }
  if (!freshOk) {
    return { outcome: 'Nein.', reason: `Zu wenig Neuschnee (min ${criteria.minFreshSnowCm} cm).` };
  }

  // All hard criteria met. Grade quality for the 4 positive outcomes.
  const marginTemp = Math.min(tMax - criteria.minTemp, criteria.maxTemp - tMin);
  const marginWind = criteria.maxWindKmh - wind;  // less wind = higher margin
  const marginSnowTop = snowTop - criteria.minSnowTopCm;
  const marginSnowBottom = snowBottom - criteria.minSnowBottomCm;
  // Fresh snow always boosts the score (not only when required); more fresh = better
  const marginFresh = criteria.requireFreshSnow
    ? Math.max(0, fresh - criteria.minFreshSnowCm)
    : fresh;

  // Simple score: sum of margins (higher = better). Wind weighted so less wind = clearly better; fresh snow counts significantly even when not required.
  const score =
    marginTemp * 2 +
    marginWind +
    marginSnowTop * 0.3 +
    marginSnowBottom * 0.2 +
    marginFresh * 1.2;

  if (score >= 25) return { outcome: 'Ja!', reason: 'Super Bedingungen.' };
  if (score >= 15) return { outcome: 'Joa', reason: 'Gute Bedingungen.' };
  if (score >= 8) return { outcome: 'geht', reason: 'Akzeptable Bedingungen.' };
  return { outcome: 'nicht so wirklich', reason: 'Knapp erfüllt, aber nicht ideal.' };
}
