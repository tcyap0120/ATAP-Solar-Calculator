
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
export const PANEL_WATTAGE = 650; // Watts per panel (0.65 kWp)
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
/** Cash price per 16 kWh battery unit. The CC price is always derived from cash, never a separate rate. */
export const BATTERY_COST_CASH = 8600;

/**
 * Manual backup box — mandatory as soon as 1+ batteries are fitted. Charged ONCE per system,
 * not per battery. So a battery system is:
 *   no-battery sheet price + manual backup box + (BATTERY_COST_CASH × batteries)
 */
export const MANUAL_BACKUP_BOX_SINGLE_PHASE_RM = 1600;
export const MANUAL_BACKUP_BOX_THREE_PHASE_RM = 2500;

/** Three-phase inverter auto-upgrade costs (added to both cash & CC). */
export const THREE_PHASE_INVERTER_UPGRADE_5_TO_8KW_RM = 500;   // panels 11–14
export const THREE_PHASE_INVERTER_UPGRADE_8_TO_10KW_RM = 300;  // panels 18–21
export const THREE_PHASE_INVERTER_UPGRADE_10_TO_12KW_RM = 600; // panels 22–26
export const THREE_PHASE_INVERTER_UPGRADE_12_TO_15KW_RM = 800; // panels 27–32

/**
 * August Promo. Every discount here comes off the cash price, and the CC price is then derived
 * from the reduced cash, so CC always stays at cash / 0.925. Amounts are the same for single and
 * three phase.
 */
/** With 1+ batteries: system discount. */
export const AUGUST_PROMO_SYSTEM_DISCOUNT = 2200;
/** With 0 batteries: lower system discount. */
export const AUGUST_PROMO_SYSTEM_DISCOUNT_ZERO_BAT = 1000;
/** Per-battery discount. */
export const AUGUST_PROMO_BATTERY_UNIT_DISCOUNT = 1200;

/**
 * Optional Auto BackupBox upgrade, offered as an Add-On on each recommendation card. Only
 * meaningful with 1+ batteries, where the manual backup box is already in the price — so this is
 * the increment from manual to auto, charged once per system, not per battery.
 */
export const AUTO_BACKUP_BOX_UPGRADE_SINGLE_PHASE_RM = 800;
export const AUTO_BACKUP_BOX_UPGRADE_THREE_PHASE_RM = 1500;

/**
 * Highest panel count the single-phase sheet prices (8 kWac single-phase inverter).
 * Above this, only three-phase tier pricing exists.
 */
export const SINGLE_PHASE_MAX_PANELS = 24;

// System Pricing Database
export const SYSTEM_PRICING: PricingTier[] = [
  { panels: 4, kwp: 2.60, inverterSize: "5 kWac Single Phase", cashPrice: 13890, ccPrice: 15020, threePhaseCashPrice: 18240, threePhaseCcPrice: 19720, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 5, kwp: 3.25, inverterSize: "5 kWac Single Phase", cashPrice: 14700, ccPrice: 15900, threePhaseCashPrice: 18990, threePhaseCcPrice: 20530, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 6, kwp: 3.90, inverterSize: "5 kWac Single Phase", cashPrice: 15500, ccPrice: 16760, threePhaseCashPrice: 19730, threePhaseCcPrice: 21330, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 7, kwp: 4.55, inverterSize: "5 kWac Single Phase", cashPrice: 16550, ccPrice: 17900, threePhaseCashPrice: 20460, threePhaseCcPrice: 22120, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 8, kwp: 5.20, inverterSize: "5 kWac Single Phase", cashPrice: 17370, ccPrice: 18780, threePhaseCashPrice: 21210, threePhaseCcPrice: 22930, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 9, kwp: 5.85, inverterSize: "5 kWac Single Phase", cashPrice: 18200, ccPrice: 19680, threePhaseCashPrice: 21970, threePhaseCcPrice: 23760, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 10, kwp: 6.50, inverterSize: "5 kWac Single Phase", cashPrice: 19070, ccPrice: 20620, threePhaseCashPrice: 22800, threePhaseCcPrice: 24650, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 11, kwp: 7.15, inverterSize: "5 kWac Single Phase", cashPrice: 19920, ccPrice: 21540, threePhaseCashPrice: 23590, threePhaseCcPrice: 25510, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 12, kwp: 7.80, inverterSize: "5 kWac Single Phase", cashPrice: 20750, ccPrice: 22440, threePhaseCashPrice: 24360, threePhaseCcPrice: 26340, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 13, kwp: 8.45, inverterSize: "5 kWac Single Phase", cashPrice: 21510, ccPrice: 23260, threePhaseCashPrice: 25120, threePhaseCcPrice: 27160, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 14, kwp: 9.10, inverterSize: "6 kWac Single Phase", cashPrice: 22340, ccPrice: 24160, threePhaseCashPrice: 26280, threePhaseCcPrice: 28420, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 15, kwp: 9.75, inverterSize: "8 kWac Single Phase", cashPrice: 24360, ccPrice: 26340, threePhaseCashPrice: 27050, threePhaseCcPrice: 29250, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 16, kwp: 10.40, inverterSize: "8 kWac Single Phase", cashPrice: 25260, ccPrice: 27310, threePhaseCashPrice: 28010, threePhaseCcPrice: 30290, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 17, kwp: 11.05, inverterSize: "8 kWac Single Phase", cashPrice: 25950, ccPrice: 28060, threePhaseCashPrice: 28780, threePhaseCcPrice: 31120, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 18, kwp: 11.70, inverterSize: "8 kWac Single Phase", cashPrice: 26590, ccPrice: 28750, threePhaseCashPrice: 29500, threePhaseCcPrice: 31900, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 19, kwp: 12.35, inverterSize: "8 kWac Single Phase", cashPrice: 27310, ccPrice: 29530, threePhaseCashPrice: 30300, threePhaseCcPrice: 32760, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 20, kwp: 13.00, inverterSize: "8 kWac Single Phase", cashPrice: 27970, ccPrice: 30240, threePhaseCashPrice: 31030, threePhaseCcPrice: 33550, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 21, kwp: 13.65, inverterSize: "8 kWac Single Phase", cashPrice: 28620, ccPrice: 30950, threePhaseCashPrice: 31720, threePhaseCcPrice: 34300, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 22, kwp: 14.30, inverterSize: "8 kWac Single Phase", cashPrice: 29340, ccPrice: 31720, threePhaseCashPrice: 32730, threePhaseCcPrice: 35390, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 23, kwp: 14.95, inverterSize: "8 kWac Single Phase", cashPrice: 29980, ccPrice: 32420, threePhaseCashPrice: 33400, threePhaseCcPrice: 36110, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 24, kwp: 15.60, inverterSize: "8 kWac Single Phase", cashPrice: 30650, ccPrice: 33140, threePhaseCashPrice: 34100, threePhaseCcPrice: 36870, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 25, kwp: 16.25, inverterSize: "10 kWac Three Phase", cashPrice: 37500, ccPrice: 40550, threePhaseCashPrice: 34780, threePhaseCcPrice: 37600, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 26, kwp: 16.90, inverterSize: "10 kWac Three Phase", cashPrice: 38400, ccPrice: 41520, threePhaseCashPrice: 35460, threePhaseCcPrice: 38340, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 27, kwp: 17.55, inverterSize: "12 kWac Three Phase", cashPrice: 39100, ccPrice: 42280, threePhaseCashPrice: 36890, threePhaseCcPrice: 39890, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 28, kwp: 18.20, inverterSize: "12 kWac Three Phase", cashPrice: 39800, ccPrice: 43030, threePhaseCashPrice: 37610, threePhaseCcPrice: 40660, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 29, kwp: 18.85, inverterSize: "12 kWac Three Phase", cashPrice: 40500, ccPrice: 43790, threePhaseCashPrice: 38250, threePhaseCcPrice: 41360, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 30, kwp: 19.50, inverterSize: "12 kWac Three Phase", cashPrice: 41200, ccPrice: 44550, threePhaseCashPrice: 38880, threePhaseCcPrice: 42040, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 31, kwp: 20.15, inverterSize: "12 kWac Three Phase", cashPrice: 41900, ccPrice: 45300, threePhaseCashPrice: 39510, threePhaseCcPrice: 42720, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 32, kwp: 20.80, inverterSize: "12 kWac Three Phase", cashPrice: 42600, ccPrice: 46060, threePhaseCashPrice: 40170, threePhaseCcPrice: 43430, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 33, kwp: 21.45, inverterSize: "15 kWac Three Phase", cashPrice: 45200, ccPrice: 48870, threePhaseCashPrice: 41570, threePhaseCcPrice: 44950, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 34, kwp: 22.10, inverterSize: "15 kWac Three Phase", cashPrice: 45900, ccPrice: 49630, threePhaseCashPrice: 42210, threePhaseCcPrice: 45640, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 35, kwp: 22.75, inverterSize: "15 kWac Three Phase", cashPrice: 46600, ccPrice: 50380, threePhaseCashPrice: 42860, threePhaseCcPrice: 46340, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 36, kwp: 23.40, inverterSize: "15 kWac Three Phase", cashPrice: 47300, ccPrice: 51140, threePhaseCashPrice: 43520, threePhaseCcPrice: 47050, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 37, kwp: 24.05, inverterSize: "15 kWac Three Phase", cashPrice: 48000, ccPrice: 51900, threePhaseCashPrice: 44170, threePhaseCcPrice: 47760, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 38, kwp: 24.70, inverterSize: "15 kWac Three Phase", cashPrice: 48700, ccPrice: 52650, threePhaseCashPrice: 44810, threePhaseCcPrice: 48450, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 39, kwp: 25.35, inverterSize: "15 kWac Three Phase", cashPrice: 49400, ccPrice: 53410, threePhaseCashPrice: 45530, threePhaseCcPrice: 49230, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 40, kwp: 26.00, inverterSize: "15 kWac Three Phase", cashPrice: 50100, ccPrice: 54170, threePhaseCashPrice: 46150, threePhaseCcPrice: 49900, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 41, kwp: 26.65, inverterSize: "20 kWac Three Phase", cashPrice: 49300, ccPrice: 53300 },
  { panels: 42, kwp: 27.30, inverterSize: "20 kWac Three Phase", cashPrice: 50200, ccPrice: 54280 },
  { panels: 43, kwp: 27.95, inverterSize: "20 kWac Three Phase", cashPrice: 51100, ccPrice: 55250 },
  { panels: 44, kwp: 28.60, inverterSize: "20 kWac Three Phase", cashPrice: 52000, ccPrice: 56220 },
  { panels: 45, kwp: 29.25, inverterSize: "20 kWac Three Phase", cashPrice: 52900, ccPrice: 57190 },
  { panels: 46, kwp: 29.90, inverterSize: "20 kWac Three Phase", cashPrice: 53800, ccPrice: 58170 },
  { panels: 47, kwp: 30.55, inverterSize: "20 kWac Three Phase", cashPrice: 54700, ccPrice: 59140 },
  { panels: 48, kwp: 31.20, inverterSize: "20 kWac Three Phase", cashPrice: 55500, ccPrice: 60000 },
  { panels: 49, kwp: 31.85, inverterSize: "20 kWac Three Phase", cashPrice: 56300, ccPrice: 60870 },
  { panels: 50, kwp: 32.50, inverterSize: "20 kWac Three Phase", cashPrice: 57100, ccPrice: 61730 },
  { panels: 51, kwp: 33.15, inverterSize: "20 kWac Three Phase", cashPrice: 57900, ccPrice: 62600 },
  { panels: 52, kwp: 33.80, inverterSize: "20 kWac Three Phase", cashPrice: 58700, ccPrice: 63460 },
  { panels: 53, kwp: 34.45, inverterSize: "20 kWac Three Phase", cashPrice: 59500, ccPrice: 64330 },
  { panels: 54, kwp: 35.10, inverterSize: "20 kWac Three Phase", cashPrice: 60000, ccPrice: 64870 },
  { panels: 55, kwp: 35.75, inverterSize: "20 kWac Three Phase", cashPrice: 60200, ccPrice: 65090 },
  { panels: 56, kwp: 36.40, inverterSize: "20 kWac Three Phase", cashPrice: 60400, ccPrice: 65300 },
];
