
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
 * August Promo — the system discount comes off cash, and so flows into CC via the /0.925
 * derivation. Unlike the earlier promo, these amounts are the same for single and three phase.
 */
/** With 1+ batteries: system discount on cash & CC. */
export const AUGUST_PROMO_SYSTEM_DISCOUNT = 2200;
/** With 0 batteries: lower system discount on cash & CC. */
export const AUGUST_PROMO_SYSTEM_DISCOUNT_ZERO_BAT = 1000;
/** Per-battery discount — CASH PRICE ONLY. Deliberately excluded from the CC price. */
export const AUGUST_PROMO_BATTERY_UNIT_DISCOUNT = 1200;

/** August Promo — optional Auto BackupBox upgrade when 1+ batteries (same RM on cash & CC; system only, not per battery). */
export const AUGUST_PROMO_AUTO_BACKUP_BOX_SINGLE_PHASE_RM = 800;
export const AUGUST_PROMO_AUTO_BACKUP_BOX_THREE_PHASE_RM = 1500;

// System Pricing Database
export const SYSTEM_PRICING: PricingTier[] = [
  { panels: 4, kwp: 2.60, inverterSize: "5 kWac Single Phase", cashPrice: 13886, ccPrice: 15020, threePhaseCashPrice: 18238, threePhaseCcPrice: 19720, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 5, kwp: 3.25, inverterSize: "5 kWac Single Phase", cashPrice: 14694, ccPrice: 15890, threePhaseCashPrice: 18985, threePhaseCcPrice: 20530, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 6, kwp: 3.90, inverterSize: "5 kWac Single Phase", cashPrice: 15495, ccPrice: 16760, threePhaseCashPrice: 19725, threePhaseCcPrice: 21330, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 7, kwp: 4.55, inverterSize: "5 kWac Single Phase", cashPrice: 16550, ccPrice: 17900, threePhaseCashPrice: 20451, threePhaseCcPrice: 22110, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 8, kwp: 5.20, inverterSize: "5 kWac Single Phase", cashPrice: 17365, ccPrice: 18780, threePhaseCashPrice: 21204, threePhaseCcPrice: 22930, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 9, kwp: 5.85, inverterSize: "5 kWac Single Phase", cashPrice: 18191, ccPrice: 19670, threePhaseCashPrice: 21969, threePhaseCcPrice: 23760, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 10, kwp: 6.50, inverterSize: "5 kWac Single Phase", cashPrice: 19066, ccPrice: 20620, threePhaseCashPrice: 22797, threePhaseCcPrice: 24650, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 11, kwp: 7.15, inverterSize: "5 kWac Single Phase", cashPrice: 19913, ccPrice: 21530, threePhaseCashPrice: 23582, threePhaseCcPrice: 25500, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 12, kwp: 7.80, inverterSize: "5 kWac Single Phase", cashPrice: 20748, ccPrice: 22440, threePhaseCashPrice: 24355, threePhaseCcPrice: 26330, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 13, kwp: 8.45, inverterSize: "5 kWac Single Phase", cashPrice: 21504, ccPrice: 23250, threePhaseCashPrice: 25118, threePhaseCcPrice: 27160, threePhaseInverterSize: "5 kWac Three Phase" },
  { panels: 14, kwp: 9.10, inverterSize: "6 kWac Single Phase", cashPrice: 22333, ccPrice: 24150, threePhaseCashPrice: 26280, threePhaseCcPrice: 28420, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 15, kwp: 9.75, inverterSize: "8 kWac Single Phase", cashPrice: 24359, ccPrice: 26340, threePhaseCashPrice: 27047, threePhaseCcPrice: 29240, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 16, kwp: 10.40, inverterSize: "8 kWac Single Phase", cashPrice: 25251, ccPrice: 27300, threePhaseCashPrice: 28010, threePhaseCcPrice: 30290, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 17, kwp: 11.05, inverterSize: "8 kWac Single Phase", cashPrice: 25944, ccPrice: 28050, threePhaseCashPrice: 28779, threePhaseCcPrice: 31120, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 18, kwp: 11.70, inverterSize: "8 kWac Single Phase", cashPrice: 26589, ccPrice: 28750, threePhaseCashPrice: 29500, threePhaseCcPrice: 31900, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 19, kwp: 12.35, inverterSize: "8 kWac Single Phase", cashPrice: 27306, ccPrice: 29520, threePhaseCashPrice: 30294, threePhaseCcPrice: 32760, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 20, kwp: 13.00, inverterSize: "8 kWac Single Phase", cashPrice: 27964, ccPrice: 30240, threePhaseCashPrice: 31029, threePhaseCcPrice: 33550, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 21, kwp: 13.65, inverterSize: "8 kWac Single Phase", cashPrice: 28615, ccPrice: 30940, threePhaseCashPrice: 31710, threePhaseCcPrice: 34290, threePhaseInverterSize: "8 kWac Three Phase" },
  { panels: 22, kwp: 14.30, inverterSize: "8 kWac Single Phase", cashPrice: 29336, ccPrice: 31720, threePhaseCashPrice: 32725, threePhaseCcPrice: 35380, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 23, kwp: 14.95, inverterSize: "8 kWac Single Phase", cashPrice: 29979, ccPrice: 32410, threePhaseCashPrice: 33400, threePhaseCcPrice: 36110, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 24, kwp: 15.60, inverterSize: "8 kWac Single Phase", cashPrice: 30646, ccPrice: 33140, threePhaseCashPrice: 34097, threePhaseCcPrice: 36870, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 25, kwp: 16.25, inverterSize: "10 kWac Three Phase", cashPrice: 37500, ccPrice: 41000, threePhaseCashPrice: 34771, threePhaseCcPrice: 37600, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 26, kwp: 16.90, inverterSize: "10 kWac Three Phase", cashPrice: 38400, ccPrice: 42000, threePhaseCashPrice: 35451, threePhaseCcPrice: 38330, threePhaseInverterSize: "10 kWac Three Phase" },
  { panels: 27, kwp: 17.55, inverterSize: "12 kWac Three Phase", cashPrice: 39100, ccPrice: 42750, threePhaseCashPrice: 36886, threePhaseCcPrice: 39880, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 28, kwp: 18.20, inverterSize: "12 kWac Three Phase", cashPrice: 39800, ccPrice: 43500, threePhaseCashPrice: 37605, threePhaseCcPrice: 40660, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 29, kwp: 18.85, inverterSize: "12 kWac Three Phase", cashPrice: 40500, ccPrice: 44300, threePhaseCashPrice: 38246, threePhaseCcPrice: 41350, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 30, kwp: 19.50, inverterSize: "12 kWac Three Phase", cashPrice: 41200, ccPrice: 45050, threePhaseCashPrice: 38875, threePhaseCcPrice: 42030, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 31, kwp: 20.15, inverterSize: "12 kWac Three Phase", cashPrice: 41900, ccPrice: 45800, threePhaseCashPrice: 39508, threePhaseCcPrice: 42720, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 32, kwp: 20.80, inverterSize: "12 kWac Three Phase", cashPrice: 42600, ccPrice: 46600, threePhaseCashPrice: 40161, threePhaseCcPrice: 43420, threePhaseInverterSize: "12 kWac Three Phase" },
  { panels: 33, kwp: 21.45, inverterSize: "15 kWac Three Phase", cashPrice: 45200, ccPrice: 49400, threePhaseCashPrice: 41567, threePhaseCcPrice: 44940, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 34, kwp: 22.10, inverterSize: "15 kWac Three Phase", cashPrice: 45900, ccPrice: 50200, threePhaseCashPrice: 42208, threePhaseCcPrice: 45640, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 35, kwp: 22.75, inverterSize: "15 kWac Three Phase", cashPrice: 46600, ccPrice: 50950, threePhaseCashPrice: 42851, threePhaseCcPrice: 46330, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 36, kwp: 23.40, inverterSize: "15 kWac Three Phase", cashPrice: 47300, ccPrice: 51700, threePhaseCashPrice: 43516, threePhaseCcPrice: 47050, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 37, kwp: 24.05, inverterSize: "15 kWac Three Phase", cashPrice: 48000, ccPrice: 52500, threePhaseCashPrice: 44162, threePhaseCcPrice: 47750, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 38, kwp: 24.70, inverterSize: "15 kWac Three Phase", cashPrice: 48700, ccPrice: 53250, threePhaseCashPrice: 44804, threePhaseCcPrice: 48440, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 39, kwp: 25.35, inverterSize: "15 kWac Three Phase", cashPrice: 49400, ccPrice: 54000, threePhaseCashPrice: 45524, threePhaseCcPrice: 49220, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 40, kwp: 26.00, inverterSize: "15 kWac Three Phase", cashPrice: 50100, ccPrice: 54800, threePhaseCashPrice: 46141, threePhaseCcPrice: 49890, threePhaseInverterSize: "15 kWac Three Phase" },
  { panels: 41, kwp: 26.65, inverterSize: "20 kWac Three Phase", cashPrice: 49300, ccPrice: 53900 },
  { panels: 42, kwp: 27.30, inverterSize: "20 kWac Three Phase", cashPrice: 50200, ccPrice: 54900 },
  { panels: 43, kwp: 27.95, inverterSize: "20 kWac Three Phase", cashPrice: 51100, ccPrice: 55900 },
  { panels: 44, kwp: 28.60, inverterSize: "20 kWac Three Phase", cashPrice: 52000, ccPrice: 56900 },
  { panels: 45, kwp: 29.25, inverterSize: "20 kWac Three Phase", cashPrice: 52900, ccPrice: 57900 },
  { panels: 46, kwp: 29.90, inverterSize: "20 kWac Three Phase", cashPrice: 53800, ccPrice: 58800 },
  { panels: 47, kwp: 30.55, inverterSize: "20 kWac Three Phase", cashPrice: 54700, ccPrice: 59800 },
  { panels: 48, kwp: 31.20, inverterSize: "20 kWac Three Phase", cashPrice: 55500, ccPrice: 60700 },
  { panels: 49, kwp: 31.85, inverterSize: "20 kWac Three Phase", cashPrice: 56300, ccPrice: 61600 },
  { panels: 50, kwp: 32.50, inverterSize: "20 kWac Three Phase", cashPrice: 57100, ccPrice: 62500 },
  { panels: 51, kwp: 33.15, inverterSize: "20 kWac Three Phase", cashPrice: 57900, ccPrice: 63300 },
  { panels: 52, kwp: 33.80, inverterSize: "20 kWac Three Phase", cashPrice: 58700, ccPrice: 64200 },
  { panels: 53, kwp: 34.45, inverterSize: "20 kWac Three Phase", cashPrice: 59500, ccPrice: 65100 },
  { panels: 54, kwp: 35.10, inverterSize: "20 kWac Three Phase", cashPrice: 60000, ccPrice: 65600 },
  { panels: 55, kwp: 35.75, inverterSize: "20 kWac Three Phase", cashPrice: 60200, ccPrice: 65800 },
  { panels: 56, kwp: 36.40, inverterSize: "20 kWac Three Phase", cashPrice: 60400, ccPrice: 66100 },
];
