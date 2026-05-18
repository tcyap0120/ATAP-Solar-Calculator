
import { InverterBrand, MeterType, GlobalSettings, CalculatorSession } from './types';

export const DEFAULT_SESSION: CalculatorSession = {
  selectedMeterId: '',
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
  oversizingRatio: 1.35,
  referencePrices: [
    { panels: 6, price: 18200, priceCC36: 19900 },
    { panels: 7, price: 18600, priceCC36: 20330 },
    { panels: 8, price: 19000, priceCC36: 20770 },
    { panels: 9, price: 19400, priceCC36: 21210 },
    { panels: 10, price: 19800, priceCC36: 21640 },
    { panels: 11, price: 20500, priceCC36: 22410 },
    { panels: 12, price: 21200, priceCC36: 23170 },
    { panels: 13, price: 21950, priceCC36: 24000 },
    { panels: 14, price: 22650, priceCC36: 24760 },
    { panels: 15, price: 28400, priceCC36: 31040 },
    { panels: 16, price: 29300, priceCC36: 32030 },
    { panels: 17, price: 30200, priceCC36: 33010 },
    { panels: 18, price: 31100, priceCC36: 33990 },
    { panels: 19, price: 32000, priceCC36: 34980 },
    { panels: 20, price: 32800, priceCC36: 35850 },
    { panels: 21, price: 33700, priceCC36: 36840 },
    { panels: 22, price: 34600, priceCC36: 37820 },
    { panels: 23, price: 37200, priceCC36: 40700 },
    { panels: 24, price: 38100, priceCC36: 41640 },
    { panels: 25, price: 39000, priceCC36: 42630 },
    { panels: 26, price: 39900, priceCC36: 43610 },
    { panels: 27, price: 41500, priceCC36: 45360 },
    { panels: 28, price: 41900, priceCC36: 45800 },
    { panels: 29, price: 42300, priceCC36: 46230 },
    { panels: 30, price: 42700, priceCC36: 46670 },
    { panels: 31, price: 43100, priceCC36: 47110 },
    { panels: 32, price: 43500, priceCC36: 47550 },
    { panels: 33, price: 44800, priceCC36: 48970 },
    { panels: 34, price: 45400, priceCC36: 49620 },
    { panels: 35, price: 46000, priceCC36: 50280 },
    { panels: 36, price: 46600, priceCC36: 50930 },
    { panels: 37, price: 47200, priceCC36: 51590 },
    { panels: 38, price: 47800, priceCC36: 52240 },
    { panels: 39, price: 48400, priceCC36: 52900 },
    { panels: 40, price: 49000, priceCC36: 53560 },
    { panels: 41, price: 51300, priceCC36: 56070 },
  ],
  brandRules: [
    { minKwp: 0, maxKwp: 80, brandId: 'solis' },
    { minKwp: 80, maxKwp: 9999, brandId: 'huawei' }
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
  maintenanceTiers: [
    { minKwp: 0, maxKwp: 40, cost: 3500, frequencyYears: 3 }, // Cost per 3 years
    { minKwp: 40, maxKwp: 100, cost: 4500, frequencyYears: 3 }, // Cost per 3 years
    { minKwp: 100, maxKwp: 300, cost: 5000, frequencyYears: 1 },
    { minKwp: 300, maxKwp: 600, cost: 7500, frequencyYears: 1 },
    { minKwp: 600, maxKwp: 1000, cost: 11000, frequencyYears: 1 },
    { minKwp: 1000, maxKwp: 99999, cost: 0, frequencyYears: 1 }, // Case by case
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
    pricePerKwh: 800,
    maxCount: 4
  },
  financing: {
    interestRate: 5,
    tenureYears: 7
  }
};

export const DEFAULT_METERS: MeterType[] = [
  { id: 'tbc', name: 'TBC / Unsure', limitKwac: 99999, maxInverterKw: 99999 }, // No restriction option
  { id: 'fuse32', name: 'Fuse 32A', limitKwac: 18.84, maxInverterKw: 10 },
  { id: 'fuse63', name: 'Fuse 63A', limitKwac: 37.1, maxInverterKw: 30 },
  { id: 'ct100', name: 'CT 100/5', limitKwac: 50.0, maxInverterKw: 50 },
  { id: 'ct150', name: 'CT 150/5', limitKwac: 88.33, maxInverterKw: 80 },
  { id: 'ct200', name: 'CT 200/5', limitKwac: 117.8, maxInverterKw: 110 },
  { id: 'ct300', name: 'CT 300/5', limitKwac: 176.7, maxInverterKw: 170 },
  { id: 'ct400', name: 'CT 400/5', limitKwac: 235.6, maxInverterKw: 230 },
  { id: 'ct500', name: 'CT 500/5', limitKwac: 294.5, maxInverterKw: 290 },
  { id: 'ct600', name: 'CT 600/5', limitKwac: 353.3, maxInverterKw: 350 },
  { id: 'ct800', name: 'CT 800/5', limitKwac: 471.1, maxInverterKw: 470 },
  { id: 'ct1000', name: 'CT 1000/5', limitKwac: 588.9, maxInverterKw: 580 },
  { id: 'ct1200', name: 'CT 1200/5', limitKwac: 706.7, maxInverterKw: 700 },
  { id: 'ct1600', name: 'CT 1600/5', limitKwac: 942.2, maxInverterKw: 940 },
];

export const DEFAULT_BRANDS: InverterBrand[] = [
  {
    id: 'solis',
    name: 'Solis (String)',
    pricingTiers: [
      // BaseFee 3000, Deduction 50 per kW, Use Smart Logic (Ref Price)
      { minKw: 0, maxKw: 26, pricePerKw: 0, baseFee: 3000, deductionPerKw: 50, useSmartLogic: true, description: '< 26 kWp Logic' }, 
      { minKw: 26, maxKw: 30, pricePerKw: 1925, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '26-30 kWp' },
      { minKw: 30, maxKw: 100, pricePerKw: 1750, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '< 100 kWp' },
      { minKw: 100, maxKw: 9999, pricePerKw: 1700, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '> 100 kWp' },
    ],
  },
  {
    id: 'goodwe',
    name: 'GoodWe (Hybrid)',
    pricingTiers: [
      // BaseFee 3000, Deduction 0, Use Smart Logic
      { minKw: 0, maxKw: 26, pricePerKw: 0, baseFee: 3000, deductionPerKw: 0, useSmartLogic: true, description: '< 26 kWp Logic' }, 
      { minKw: 26, maxKw: 30, pricePerKw: 1975, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '26-30 kWp' },
      { minKw: 30, maxKw: 100, pricePerKw: 1800, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '< 100 kWp' },
      { minKw: 100, maxKw: 9999, pricePerKw: 1750, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '> 100 kWp' },
    ],
  },
  {
    id: 'huawei',
    name: 'Huawei (String)',
    pricingTiers: [
      { minKw: 100, maxKw: 400, pricePerKw: 1800, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '> 100 kWp' },
      { minKw: 400, maxKw: 9999, pricePerKw: 1700, baseFee: 0, deductionPerKw: 0, useSmartLogic: false, description: '< 400 kWp (Bulk)' },
    ],
  },
];
