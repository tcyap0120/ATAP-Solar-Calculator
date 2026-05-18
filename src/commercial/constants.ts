import { InverterBrand, MeterType, GlobalSettings, CalculatorSession, ReferencePrice } from './types';
import { SYSTEM_PRICING } from '../constants';

/** Bump when saved GlobalSettings need a one-time migration (e.g. brand automation defaults). */
export const COMMERCIAL_SETTINGS_SCHEMA_VERSION = 5;

/** Bump when default meter caps (e.g. max inverter per type) should replace saved meters. */
export const COMMERCIAL_METERS_SCHEMA_VERSION = 1;

/** Ref Rates table: residential three-phase “with battery” system tier cash + 36m CC per panel count (6–40). */
export function commercialReferencePricesFromResidential(): ReferencePrice[] {
  return SYSTEM_PRICING.filter((t) => t.panels >= 6 && t.panels <= 40).map((t) => ({
    panels: t.panels,
    price:
      t.threePhaseCashPriceWithBattery ??
      t.threePhaseCashPrice ??
      t.cashPrice,
    priceCC36:
      t.threePhaseCcPriceWithBattery ??
      t.threePhaseCcPrice ??
      t.ccPrice
  }));
}

export const DEFAULT_SESSION: CalculatorSession = {
  selectedMeterId: 'three_phase',
  selectedBrandId: '',
  kwpValue: '',
  panelsValue: '',
  inverterSize: '0',
  selectedTariffGroupId: '',
  billAmount: '3000',
  targetKwh: '',
  roofLimit: '',
  noLoadDays: '0',
  opStartHour: 9,
  opEndHour: 18,
  activeStrategy: 'custom',
  proposedPlans: null,
  showBillDetails: false,
  showSavingsDetails: false,
  hasDefaultedMeter: false,
  batteryCount: 0,
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  panelRating: 0.64,
  sunHours: 3.4,
  tariffRate: 0.5068,
  kwtbb: 0.016,
  taxRate: 0.24,
  resiBasePrice: 20000,
  exportRate: 0.20,
  solarStartHour: 10,
  solarEndHour: 17,
  oversizingRatioWithoutBattery: 1.37,
  oversizingRatioWithBattery: 1.75,
  /** [Ref Rates] GoodWe under 26 kWp: same cash / 36m CC as residential SYSTEM_PRICING three-phase with-battery tier, panels 6–40 only. */
  referencePrices: commercialReferencePricesFromResidential(),
  brandRules: [
    { minKwp: 0, maxKwp: 9999, brandId: 'goodwe' }
  ],
  tariffGroups: [
    { 
      id: 'tariff_b_vr', 
      name: 'Tariff B - Low Voltage (Commercial)', 
      rate: 0.5068, 
      kwtbbPct: 1.6,
      description: 'Standard commercial tariff'
    }
  ],
  // Table: "Maintenance Price (RM / Year)" — cashflow frequency is applied in CalculatorPage:
  // systems < 96 kWp pay the tier amount once every 3 years (first in year 3); ≥ 96 kWp pay annually.
  maintenanceTiers: [
    { minKwp: 0, maxKwp: 6.82, cost: 1800, frequencyYears: 1 },
    { minKwp: 6.82, maxKwp: 10.55, cost: 2300, frequencyYears: 1 },
    { minKwp: 10.55, maxKwp: 21, cost: 2600, frequencyYears: 1 },
    { minKwp: 21, maxKwp: 41, cost: 3500, frequencyYears: 1 },
    { minKwp: 41, maxKwp: 61, cost: 4500, frequencyYears: 1 },
    { minKwp: 61, maxKwp: 81, cost: 4500, frequencyYears: 1 },
    { minKwp: 81, maxKwp: 101, cost: 4500, frequencyYears: 1 },
    { minKwp: 101, maxKwp: 301, cost: 5000, frequencyYears: 1 },
    { minKwp: 301, maxKwp: 601, cost: 7500, frequencyYears: 1 },
    { minKwp: 601, maxKwp: 1001, cost: 11000, frequencyYears: 1 },
    { minKwp: 1001, maxKwp: 99999, cost: 11000, frequencyYears: 1 },
  ],
  otherCosts: {
    gitaFee: 5000,
    gitaFeeThreshold: 0, // Apply if < 60kWp
    gitaIncentiveThreshold: 60, // Apply GITA Incentive if >= 60kWp
    stLicenseRate: 1.65,
    stLicenseThreshold: 100, // Apply if >= 100kWp
    chargemanCost: 700, // Monthly
    chargemanThreshold: 100, // Apply if >= 100kWp
    visitingEngineerCost: 300, // Monthly
    visitingEngineerThreshold: 100, // Apply if >= 100kWp
  },
  battery: {
    capacityKwh: 16,
    usableRatio: 0.9,
    pricePerUnit: 8200,
    maxCount: 4
  },
  financing: {
    interestRate: 5,
    tenureYears: 7
  },
  _settingsSchemaVersion: COMMERCIAL_SETTINGS_SCHEMA_VERSION,
};

export const DEFAULT_METERS: MeterType[] = [
  /** AC limit "no limit" in UI; maxInverterKw 0 = uncapped in calculator logic */
  { id: 'three_phase', name: 'Normal (three phase)', limitKwac: 99999, maxInverterKw: 0 },
  { id: 'single_phase', name: 'Single Phase', limitKwac: 18.84, maxInverterKw: 5 },
];

export const DEFAULT_BRANDS: InverterBrand[] = [
  {
    id: 'goodwe',
    name: 'GoodWe (Hybrid)',
    pricingTiers: [
      { minKw: 0, maxKw: 26, pricePerKw: 0, baseFee: 0, deductionPerKw: 0, useSmartLogic: true, description: '< 26 kWp Logic' },
      { minKw: 26, maxKw: 30, pricePerKw: 1975, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '26-30 kWp' },
      { minKw: 30, maxKw: 100, pricePerKw: 1800, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '< 100 kWp' },
      /** GoodWe commercial / Resi-Calc: flat RM 1,800/kWp from 100 kWp up (was 1,750; migrate old saved brands in sanitize). */
      { minKw: 100, maxKw: 9999, pricePerKw: 1800, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '> 100 kWp' },
    ],
  },
];

/** GoodWe (Hybrid) 0–26 kWp: Ref Rates (smart logic), base add RM 0 — align saved brands to defaults for that tier. */
export function sanitizeGoodWeHybridRefRateTier(brands: InverterBrand[]): InverterBrand[] {
  const defGoodwe = DEFAULT_BRANDS.find((b) => b.id === 'goodwe');
  if (!defGoodwe) return brands;
  const defTier = defGoodwe.pricingTiers.find((t) => t.minKw === 0 && t.maxKw === 26);
  if (!defTier) return brands;

  const defOver100 = defGoodwe.pricingTiers.find((t) => t.minKw === 100 && t.maxKw === 9999);

  return brands.map((b) => {
    if (b.id !== 'goodwe') return b;
    return {
      ...b,
      pricingTiers: b.pricingTiers.map((t) => {
        if (t.minKw === 0 && t.maxKw === 26) {
          return {
            ...t,
            pricePerKw: defTier.pricePerKw,
            baseFee: defTier.baseFee,
            deductionPerKw: defTier.deductionPerKw ?? 0,
            useSmartLogic: true,
            description: defTier.description,
          };
        }
        // One-time align: old default was RM 1,750/kWp for ≥100 kWp; GoodWe pricing is now RM 1,800/kWp.
        if (
          defOver100 &&
          t.minKw === 100 &&
          t.maxKw === 9999 &&
          t.pricePerKw === 1750 &&
          !t.useSmartLogic
        ) {
          return { ...t, pricePerKw: defOver100.pricePerKw };
        }
        return t;
      }),
    };
  });
}

/** Ref Rates: keep panels 6–40 only; strip 41+ and legacy 42 / 43 rows from saved settings. */
export function sanitizeCommercialReferencePrices(settings: GlobalSettings): GlobalSettings {
  if (!settings.referencePrices?.length) return settings;
  const rp = settings.referencePrices.filter((r) => r.panels >= 6 && r.panels <= 40);
  if (rp.length === settings.referencePrices.length) return settings;
  return { ...settings, referencePrices: rp };
}
