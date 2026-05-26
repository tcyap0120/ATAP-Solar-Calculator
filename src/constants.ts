
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

// Solar Constants
export const PANEL_WATTAGE = 640; // Watts per panel (0.64 kWp)
export const PEAK_SUN_HOURS = 3.5; // Average daily peak sun hours in Malaysia
/** Nominal nameplate capacity per battery (marketing / WhatsApp copy). */
export const BATTERY_NOMINAL_KWH = 16;
/** Usable discharge capacity per battery per day (16 kWh nominal × 90% round-trip usability). */
export const BATTERY_CAPACITY_KWH = 14.4;
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
export const BATTERY_COST_CASH = 8200;
export const BATTERY_COST_CC = 8950;

/** Three-phase systems with 12–13 panels: inverter 5 kWac → 8 kWac (+same RM on cash & CC). */
export const THREE_PHASE_12_13_INVERTER_UPGRADE_TO_8KW_RM = 150;

/** April Launching Promo — same total RM discount subtracted from both cash and CC. */
/** With 1+ batteries: system discount on cash & CC. */
export const APRIL_PROMO_SINGLE_SYSTEM_DISCOUNT = 1800;
export const APRIL_PROMO_THREE_PHASE_SYSTEM_DISCOUNT = 3000;
/** With 0 batteries: lower system discount on cash & CC. */
export const APRIL_PROMO_SINGLE_SYSTEM_DISCOUNT_ZERO_BAT = 800;
export const APRIL_PROMO_THREE_PHASE_SYSTEM_DISCOUNT_ZERO_BAT = 1600;
export const APRIL_PROMO_BATTERY_UNIT_DISCOUNT = 800;

/** April promo — optional Auto BackupBox upgrade when 1+ batteries (same RM on cash & CC; system only, not per battery). */
export const APRIL_PROMO_AUTO_BACKUP_BOX_SINGLE_PHASE_RM = 800;
export const APRIL_PROMO_AUTO_BACKUP_BOX_THREE_PHASE_RM = 1500;

// System Pricing Database
export const SYSTEM_PRICING: PricingTier[] = [
  { panels: 6, kwp: 3.84, inverterSize: "3.6 kWac Single Phase", cashPrice: 15700, ccPrice: 17200, cashPriceWithBattery: 17300, ccPriceWithBattery: 18950, threePhaseCashPrice: 19600, threePhaseCcPrice: 21450, threePhaseCashPriceWithBattery: 22100, threePhaseCcPriceWithBattery: 24200, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 7, kwp: 4.48, inverterSize: "3.6 kWac Single Phase", cashPrice: 16000, ccPrice: 17500, cashPriceWithBattery: 17600, ccPriceWithBattery: 19250, threePhaseCashPrice: 20200, threePhaseCcPrice: 22100, threePhaseCashPriceWithBattery: 22700, threePhaseCcPriceWithBattery: 24850, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 8, kwp: 5.12, inverterSize: "5 kWac Single Phase", cashPrice: 16450, ccPrice: 18000, cashPriceWithBattery: 17900, ccPriceWithBattery: 19600, threePhaseCashPrice: 20800, threePhaseCcPrice: 22750, threePhaseCashPriceWithBattery: 23300, threePhaseCcPriceWithBattery: 25500, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 9, kwp: 5.76, inverterSize: "5 kWac Single Phase", cashPrice: 17840, ccPrice: 19500, cashPriceWithBattery: 19440, ccPriceWithBattery: 21250, threePhaseCashPrice: 21400, threePhaseCcPrice: 23400, threePhaseCashPriceWithBattery: 23900, threePhaseCcPriceWithBattery: 26150, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 10, kwp: 6.4, inverterSize: "5 kWac Single Phase", cashPrice: 18390, ccPrice: 20100, cashPriceWithBattery: 19990, ccPriceWithBattery: 21850, threePhaseCashPrice: 22000, threePhaseCcPrice: 24050, threePhaseCashPriceWithBattery: 24500, threePhaseCcPriceWithBattery: 26800, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 11, kwp: 7.04, inverterSize: "5 kWac Single Phase", cashPrice: 19100, ccPrice: 20900, cashPriceWithBattery: 20700, ccPriceWithBattery: 22650, threePhaseCashPrice: 22600, threePhaseCcPrice: 24700, threePhaseCashPriceWithBattery: 25100, threePhaseCcPriceWithBattery: 27450, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 12, kwp: 7.68, inverterSize: "5 kWac Single Phase", cashPrice: 19650, ccPrice: 21500, cashPriceWithBattery: 21250, ccPriceWithBattery: 23250, threePhaseCashPrice: 23500, threePhaseCcPrice: 25700, threePhaseCashPriceWithBattery: 26000, threePhaseCcPriceWithBattery: 28450, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 13, kwp: 8.32, inverterSize: "5 kWac Single Phase", cashPrice: 20450, ccPrice: 22350, cashPriceWithBattery: 22050, ccPriceWithBattery: 24100, threePhaseCashPrice: 23950, threePhaseCcPrice: 26200, threePhaseCashPriceWithBattery: 26450, threePhaseCcPriceWithBattery: 28950, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 14, kwp: 8.96, inverterSize: "5 kWac Single Phase", cashPrice: 21550, ccPrice: 23600, cashPriceWithBattery: 23150, ccPriceWithBattery: 25350, threePhaseCashPrice: 25050, threePhaseCcPrice: 27400, threePhaseCashPriceWithBattery: 27550, threePhaseCcPriceWithBattery: 30150, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 15, kwp: 9.6, inverterSize: "8 kWac Single Phase", cashPrice: 25000, ccPrice: 27350, cashPriceWithBattery: 26600, ccPriceWithBattery: 29100, threePhaseCashPrice: 26520, threePhaseCcPrice: 29000, threePhaseCashPriceWithBattery: 29020, threePhaseCcPriceWithBattery: 31750, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 16, kwp: 10.24, inverterSize: "8 kWac Single Phase", cashPrice: 25400, ccPrice: 27800, cashPriceWithBattery: 27000, ccPriceWithBattery: 29550, threePhaseCashPrice: 27620, threePhaseCcPrice: 30200, threePhaseCashPriceWithBattery: 30120, threePhaseCcPriceWithBattery: 32950, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 17, kwp: 10.88, inverterSize: "8 kWac Single Phase", cashPrice: 25800, ccPrice: 28200, cashPriceWithBattery: 27400, ccPriceWithBattery: 29950, threePhaseCashPrice: 28720, threePhaseCcPrice: 31400, threePhaseCashPriceWithBattery: 31220, threePhaseCcPriceWithBattery: 34150, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 18, kwp: 11.52, inverterSize: "8 kWac Single Phase", cashPrice: 26030, ccPrice: 28450, cashPriceWithBattery: 27630, ccPriceWithBattery: 30200, threePhaseCashPrice: 29450, threePhaseCcPrice: 32200, threePhaseCashPriceWithBattery: 31950, threePhaseCcPriceWithBattery: 34950, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 19, kwp: 12.16, inverterSize: "8 kWac Single Phase", cashPrice: 26380, ccPrice: 28850, cashPriceWithBattery: 27980, ccPriceWithBattery: 30600, threePhaseCashPrice: 30200, threePhaseCcPrice: 33050, threePhaseCashPriceWithBattery: 32700, threePhaseCcPriceWithBattery: 35750, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 20, kwp: 12.8, inverterSize: "8 kWac Single Phase", cashPrice: 26730, ccPrice: 29250, cashPriceWithBattery: 28330, ccPriceWithBattery: 31000, threePhaseCashPrice: 30950, threePhaseCcPrice: 33850, threePhaseCashPriceWithBattery: 33450, threePhaseCcPriceWithBattery: 36600, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 21, kwp: 13.44, inverterSize: "8 kWac Single Phase", cashPrice: 27080, ccPrice: 29600, cashPriceWithBattery: 28680, ccPriceWithBattery: 31350, threePhaseCashPrice: 31825, threePhaseCcPrice: 34800, threePhaseCashPriceWithBattery: 34325, threePhaseCcPriceWithBattery: 37550, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 22, kwp: 14.08, inverterSize: "10 kWac Three Phase", cashPrice: 34800, ccPrice: 38050, threePhaseCashPrice: 32700, threePhaseCcPrice: 35750, threePhaseCashPriceWithBattery: 35200, threePhaseCcPriceWithBattery: 38500, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 23, kwp: 14.72, inverterSize: "10 kWac Three Phase", cashPrice: 35700, ccPrice: 39050, threePhaseCashPrice: 33550, threePhaseCcPrice: 36700, threePhaseCashPriceWithBattery: 36050, threePhaseCcPriceWithBattery: 39400, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 24, kwp: 15.36, inverterSize: "10 kWac Three Phase", cashPrice: 36600, ccPrice: 40000, threePhaseCashPrice: 34400, threePhaseCcPrice: 37600, threePhaseCashPriceWithBattery: 36900, threePhaseCcPriceWithBattery: 40350, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 25, kwp: 16.0, inverterSize: "10 kWac Three Phase", cashPrice: 37500, ccPrice: 41000, threePhaseCashPrice: 35250, threePhaseCcPrice: 38550, threePhaseCashPriceWithBattery: 37750, threePhaseCcPriceWithBattery: 41300, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 26, kwp: 16.64, inverterSize: "10 kWac Three Phase", cashPrice: 38400, ccPrice: 42000, threePhaseCashPrice: 36100, threePhaseCcPrice: 39500, threePhaseCashPriceWithBattery: 38600, threePhaseCcPriceWithBattery: 42200, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 27, kwp: 17.28, inverterSize: "12 kWac Three Phase", cashPrice: 39100, ccPrice: 42750, threePhaseCashPrice: 37000, threePhaseCcPrice: 40450, threePhaseCashPriceWithBattery: 39500, threePhaseCcPriceWithBattery: 43200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 28, kwp: 17.92, inverterSize: "12 kWac Three Phase", cashPrice: 39800, ccPrice: 43500, threePhaseCashPrice: 37920, threePhaseCcPrice: 41450, threePhaseCashPriceWithBattery: 40420, threePhaseCcPriceWithBattery: 44200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 29, kwp: 18.56, inverterSize: "12 kWac Three Phase", cashPrice: 40500, ccPrice: 44300, threePhaseCashPrice: 38840, threePhaseCcPrice: 42450, threePhaseCashPriceWithBattery: 41340, threePhaseCcPriceWithBattery: 45200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 30, kwp: 19.2, inverterSize: "12 kWac Three Phase", cashPrice: 41200, ccPrice: 45050, threePhaseCashPrice: 39760, threePhaseCcPrice: 43500, threePhaseCashPriceWithBattery: 42260, threePhaseCcPriceWithBattery: 46200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 31, kwp: 19.84, inverterSize: "12 kWac Three Phase", cashPrice: 41900, ccPrice: 45800, threePhaseCashPrice: 40680, threePhaseCcPrice: 44500, threePhaseCashPriceWithBattery: 43180, threePhaseCcPriceWithBattery: 47200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 32, kwp: 20.48, inverterSize: "12 kWac Three Phase", cashPrice: 42600, ccPrice: 46600, threePhaseCashPrice: 41600, threePhaseCcPrice: 45500, threePhaseCashPriceWithBattery: 44100, threePhaseCcPriceWithBattery: 48200, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 33, kwp: 21.12, inverterSize: "15 kWac Three Phase", cashPrice: 45200, ccPrice: 49400, threePhaseCashPrice: 42360, threePhaseCcPrice: 46300, threePhaseCashPriceWithBattery: 44860, threePhaseCcPriceWithBattery: 49050, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 34, kwp: 21.76, inverterSize: "15 kWac Three Phase", cashPrice: 45900, ccPrice: 50200, threePhaseCashPrice: 43140, threePhaseCcPrice: 47150, threePhaseCashPriceWithBattery: 45640, threePhaseCcPriceWithBattery: 49900, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 35, kwp: 22.4, inverterSize: "15 kWac Three Phase", cashPrice: 46600, ccPrice: 50950, threePhaseCashPrice: 43920, threePhaseCcPrice: 48000, threePhaseCashPriceWithBattery: 46420, threePhaseCcPriceWithBattery: 50750, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 36, kwp: 23.04, inverterSize: "15 kWac Three Phase", cashPrice: 47300, ccPrice: 51700, threePhaseCashPrice: 44700, threePhaseCcPrice: 48900, threePhaseCashPriceWithBattery: 47200, threePhaseCcPriceWithBattery: 51600, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 37, kwp: 23.68, inverterSize: "15 kWac Three Phase", cashPrice: 48000, ccPrice: 52500, threePhaseCashPrice: 45550, threePhaseCcPrice: 49800, threePhaseCashPriceWithBattery: 48050, threePhaseCcPriceWithBattery: 52550, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 38, kwp: 24.32, inverterSize: "15 kWac Three Phase", cashPrice: 48700, ccPrice: 53250, threePhaseCashPrice: 46300, threePhaseCcPrice: 50650, threePhaseCashPriceWithBattery: 48800, threePhaseCcPriceWithBattery: 53350, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 39, kwp: 24.96, inverterSize: "15 kWac Three Phase", cashPrice: 49400, ccPrice: 54000, threePhaseCashPrice: 47050, threePhaseCcPrice: 51450, threePhaseCashPriceWithBattery: 49550, threePhaseCcPriceWithBattery: 54200, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 40, kwp: 25.6, inverterSize: "15 kWac Three Phase", cashPrice: 50100, ccPrice: 54800, threePhaseCashPrice: 47800, threePhaseCcPrice: 52250, threePhaseCashPriceWithBattery: 50300, threePhaseCcPriceWithBattery: 55000, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 41, kwp: 26.24, inverterSize: "20 kWac Three Phase", cashPrice: 49300, ccPrice: 53900 },
  { panels: 42, kwp: 26.88, inverterSize: "20 kWac Three Phase", cashPrice: 50200, ccPrice: 54900 },
  { panels: 43, kwp: 27.52, inverterSize: "20 kWac Three Phase", cashPrice: 51100, ccPrice: 55900 },
  { panels: 44, kwp: 28.16, inverterSize: "20 kWac Three Phase", cashPrice: 52000, ccPrice: 56900 },
  { panels: 45, kwp: 28.8, inverterSize: "20 kWac Three Phase", cashPrice: 52900, ccPrice: 57900 },
  { panels: 46, kwp: 29.44, inverterSize: "20 kWac Three Phase", cashPrice: 53800, ccPrice: 58800 },
  { panels: 47, kwp: 30.08, inverterSize: "20 kWac Three Phase", cashPrice: 54700, ccPrice: 59800 },
  { panels: 48, kwp: 30.72, inverterSize: "20 kWac Three Phase", cashPrice: 55500, ccPrice: 60700 },
  { panels: 49, kwp: 31.36, inverterSize: "20 kWac Three Phase", cashPrice: 56300, ccPrice: 61600 },
  { panels: 50, kwp: 32.0, inverterSize: "20 kWac Three Phase", cashPrice: 57100, ccPrice: 62500 },
  { panels: 51, kwp: 32.64, inverterSize: "20 kWac Three Phase", cashPrice: 57900, ccPrice: 63300 },
  { panels: 52, kwp: 33.28, inverterSize: "20 kWac Three Phase", cashPrice: 58700, ccPrice: 64200 },
  { panels: 53, kwp: 33.92, inverterSize: "20 kWac Three Phase", cashPrice: 59500, ccPrice: 65100 },
  { panels: 54, kwp: 34.56, inverterSize: "20 kWac Three Phase", cashPrice: 60000, ccPrice: 65600 },
  { panels: 55, kwp: 35.2, inverterSize: "20 kWac Three Phase", cashPrice: 60200, ccPrice: 65800 },
  { panels: 56, kwp: 35.84, inverterSize: "20 kWac Three Phase", cashPrice: 60400, ccPrice: 66100 },
];
