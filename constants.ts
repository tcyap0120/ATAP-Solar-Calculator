
import { DiscountBlock, PricingTier } from './types';

// Rate Constants
export const RATE_BELOW_1500 = 0.4443; // RM per kWh (Updated)
export const RATE_ABOVE_1500 = 0.5443; // RM per kWh
export const THRESHOLD_RATE_CHANGE = 1500;

export const RETAIL_CHARGE = 10.00; // RM
export const RETAIL_CHARGE_THRESHOLD = 600; // kWh

export const TAX_RATE = 0.08; // 8%
export const TAX_THRESHOLD = 600; // kWh

export const KWTBB_RATE = 0.016; // 1.6%

export const EXPORT_RATE = 0.20; // RM per kWh

// Solar Constants
export const PANEL_WATTAGE = 620; // Watts per panel
export const PEAK_SUN_HOURS = 3.5; // Average daily peak sun hours in Malaysia
export const BATTERY_CAPACITY_KWH = 12.87; // kWh per battery unit
export const SYSTEM_LOSS_FACTOR = 1.0; // Efficiency factor (set to 1.0 as prompt defines specific output)

// EE Incentive Discount Table
export const DISCOUNT_TABLE: DiscountBlock[] = [
  { min: 1, max: 200, discountSen: -25 },
  { min: 201, max: 250, discountSen: -24.5 },
  { min: 251, max: 300, discountSen: -22.5 },
  { min: 301, max: 350, discountSen: -21 },
  { min: 351, max: 400, discountSen: -17 },
  { min: 401, max: 450, discountSen: -14.5 },
  { min: 451, max: 500, discountSen: -12 },
  { min: 501, max: 550, discountSen: -10.5 },
  { min: 551, max: 600, discountSen: -9 },
  { min: 601, max: 650, discountSen: -7.5 },
  { min: 651, max: 700, discountSen: -5.5 },
  { min: 701, max: 750, discountSen: -4.5 },
  { min: 751, max: 800, discountSen: -4 },
  { min: 801, max: 850, discountSen: -2.5 },
  { min: 851, max: 900, discountSen: -1 },
  { min: 901, max: 1000, discountSen: -0.5 },
  // Assuming 0 discount above 1000 as table ends
];

// Battery Pricing
export const BATTERY_COST_CASH = 7400;
export const BATTERY_COST_CC = 8000;

// System Pricing Database
export const SYSTEM_PRICING: PricingTier[] = [
  { panels: 6, kwp: 3.72, inverterSize: "5 kWac Single Phase", cashPrice: 18200, ccPrice: 20040 },
  { panels: 7, kwp: 4.34, inverterSize: "5 kWac Single Phase", cashPrice: 18600, ccPrice: 20440 },
  { panels: 8, kwp: 4.96, inverterSize: "5 kWac Single Phase", cashPrice: 19000, ccPrice: 20840 },
  { panels: 9, kwp: 5.58, inverterSize: "5 kWac Single Phase", cashPrice: 19400, ccPrice: 21240 },
  { panels: 10, kwp: 6.2, inverterSize: "5 kWac Single Phase", cashPrice: 19800, ccPrice: 21640 },
  { panels: 11, kwp: 6.82, inverterSize: "5 kWac Single Phase", cashPrice: 20500, ccPrice: 22410 },
  { panels: 12, kwp: 7.44, inverterSize: "5 kWac Single Phase", cashPrice: 21200, ccPrice: 23170 },
  { panels: 13, kwp: 8.06, inverterSize: "5 kWac Single Phase", cashPrice: 21950, ccPrice: 24000 },
  { panels: 14, kwp: 8.68, inverterSize: "5 kWac Single Phase", cashPrice: 22650, ccPrice: 24760 },
  { panels: 15, kwp: 9.3, inverterSize: "8 kWac Single Phase", cashPrice: 26800, ccPrice: 29290 },
  { panels: 16, kwp: 9.92, inverterSize: "8 kWac Single Phase", cashPrice: 27700, ccPrice: 30280 },
  { panels: 17, kwp: 10.54, inverterSize: "8 kWac Single Phase", cashPrice: 28600, ccPrice: 31260 },
  { panels: 18, kwp: 11.16, inverterSize: "8 kWac Single Phase", cashPrice: 29500, ccPrice: 32250 },
  { panels: 19, kwp: 11.78, inverterSize: "8 kWac Single Phase", cashPrice: 30400, ccPrice: 33230 },
  { panels: 20, kwp: 12.4, inverterSize: "8 kWac Single Phase", cashPrice: 31200, ccPrice: 34100 },
  { panels: 21, kwp: 13.02, inverterSize: "8 kWac Single Phase", cashPrice: 32100, ccPrice: 35100 },
  { panels: 22, kwp: 13.64, inverterSize: "Single Phase 8 kWac", cashPrice: 33000, ccPrice: 36100 },
  { panels: 23, kwp: 14.26, inverterSize: "10 kWac Three Phase", cashPrice: 37200, ccPrice: 40700 },
  { panels: 24, kwp: 14.88, inverterSize: "10 kWac Three Phase", cashPrice: 38100, ccPrice: 41640 },
  { panels: 25, kwp: 15.5, inverterSize: "10 kWac Three Phase", cashPrice: 39000, ccPrice: 42630 },
  { panels: 26, kwp: 16.12, inverterSize: "10 kWac Three Phase", cashPrice: 39900, ccPrice: 43610 },
  { panels: 27, kwp: 16.74, inverterSize: "12 kWac Three Phase", cashPrice: 41500, ccPrice: 45360 },
  { panels: 28, kwp: 17.36, inverterSize: "12 kWac Three Phase", cashPrice: 41900, ccPrice: 45800 },
  { panels: 29, kwp: 17.98, inverterSize: "12 kWac Three Phase", cashPrice: 42300, ccPrice: 46230 },
  { panels: 30, kwp: 18.6, inverterSize: "12 kWac Three Phase", cashPrice: 42700, ccPrice: 46670 },
  { panels: 31, kwp: 19.22, inverterSize: "12 kWac Three Phase", cashPrice: 43100, ccPrice: 47110 },
  { panels: 32, kwp: 19.84, inverterSize: "12 kWac Three Phase", cashPrice: 43500, ccPrice: 47550 },
  { panels: 33, kwp: 20.46, inverterSize: "15 kWac Three Phase", cashPrice: 44800, ccPrice: 48850 },
  { panels: 34, kwp: 21.08, inverterSize: "15 kWac Three Phase", cashPrice: 45400, ccPrice: 49450 },
  { panels: 35, kwp: 21.7, inverterSize: "15 kWac Three Phase", cashPrice: 46000, ccPrice: 50050 },
  { panels: 36, kwp: 22.32, inverterSize: "15 kWac Three Phase", cashPrice: 46600, ccPrice: 50650 },
  { panels: 37, kwp: 22.94, inverterSize: "15 kWac Three Phase", cashPrice: 47200, ccPrice: 51250 },
  { panels: 38, kwp: 23.56, inverterSize: "15 kWac Three Phase", cashPrice: 47800, ccPrice: 51850 },
  { panels: 39, kwp: 24.18, inverterSize: "15 kWac Three Phase", cashPrice: 48400, ccPrice: 52450 },
  { panels: 40, kwp: 24.8, inverterSize: "15 kWac Three Phase", cashPrice: 49000, ccPrice: 53050 },
  { panels: 41, kwp: 25.42, inverterSize: "20 kWac Three Phase", cashPrice: 51300, ccPrice: 55350 },
  { panels: 42, kwp: 26.04, inverterSize: "20 kWac Three Phase", cashPrice: 52200, ccPrice: 56250 },
  { panels: 43, kwp: 26.66, inverterSize: "20 kWac Three Phase", cashPrice: 53100, ccPrice: 57150 },
  { panels: 44, kwp: 27.28, inverterSize: "20 kWac Three Phase", cashPrice: 54000, ccPrice: 58050 },
  { panels: 45, kwp: 27.9, inverterSize: "20 kWac Three Phase", cashPrice: 54900, ccPrice: 58950 },
  { panels: 46, kwp: 28.52, inverterSize: "20 kWac Three Phase", cashPrice: 55800, ccPrice: 59850 },
  { panels: 47, kwp: 29.14, inverterSize: "20 kWac Three Phase", cashPrice: 56700, ccPrice: 60750 },
  { panels: 48, kwp: 29.76, inverterSize: "20 kWac Three Phase", cashPrice: 57500, ccPrice: 61550 },
  { panels: 49, kwp: 30.38, inverterSize: "20 kWac Three Phase", cashPrice: 58300, ccPrice: 62350 },
  { panels: 50, kwp: 31, inverterSize: "20 kWac Three Phase", cashPrice: 59100, ccPrice: 63150 },
  { panels: 51, kwp: 31.62, inverterSize: "20 kWac Three Phase", cashPrice: 59900, ccPrice: 63950 },
  { panels: 52, kwp: 32.24, inverterSize: "20 kWac Three Phase", cashPrice: 60700, ccPrice: 64750 },
  { panels: 53, kwp: 32.86, inverterSize: "20 kWac Three Phase", cashPrice: 61500, ccPrice: 65550 },
  { panels: 54, kwp: 33.48, inverterSize: "20 kWac Three Phase", cashPrice: 62000, ccPrice: 67400 },
  { panels: 55, kwp: 34.10, inverterSize: "20 kWac Three Phase", cashPrice: 62200, ccPrice: 67600 },
  { panels: 56, kwp: 34.72, inverterSize: "20 kWac Three Phase", cashPrice: 62400, ccPrice: 67800 },
];
