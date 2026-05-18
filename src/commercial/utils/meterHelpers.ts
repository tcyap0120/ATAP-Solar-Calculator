import type { GlobalSettings, MeterType } from '../types';

/** Supported commercial meter row ids — anything else in localStorage is treated as legacy. */
const COMMERCIAL_METER_IDS = new Set(['three_phase', 'single_phase']);

/** True when the saved list is exactly the two supported meters (ids, no duplicates). */
export function isSupportedCommercialMeterList(list: MeterType[]): boolean {
  if (list.length !== 2) return false;
  const ids = list.map((m) => m.id);
  if (new Set(ids).size !== 2) return false;
  return ids.every((id) => COMMERCIAL_METER_IDS.has(id));
}

/** DC/AC oversizing: higher when battery allows more DC on same AC. */
export function getOversizingRatio(settings: GlobalSettings, batteryCount: number): number {
  if (batteryCount > 0) {
    return settings.oversizingRatioWithBattery ?? settings.oversizingRatio ?? 1.75;
  }
  return settings.oversizingRatioWithoutBattery ?? settings.oversizingRatio ?? 1.37;
}

export function maxPanelsForMeter(
  maxInverterKw: number,
  panelRating: number,
  oversizing: number
): number {
  if (maxInverterKw <= 0 || panelRating <= 0) return 0;
  return Math.floor((maxInverterKw * oversizing) / panelRating);
}

/** Default inverter size (kWac) when the meter has no max-inverter cap. */
export const UNLIMITED_MAX_INVERTER_DEFAULT_KW = 110;
