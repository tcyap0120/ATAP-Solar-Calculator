
export interface TariffBlock {
  max: number;
  rate: number;
}

export interface DiscountBlock {
  min: number;
  max: number;
  discountSen: number; // in sen
}

export interface BillBreakdown {
  baseCharge: number;
  retailCharge: number;
  discount: number;
  serviceTax: number;
  kwtbb: number; // Renewable Energy Fund
  exportCredit?: number; // Credit from solar export
  exportUnits?: number; // Units exported
  eeIncentiveAdjustment?: number; // Adjustment/Clawback for export
  subtotal: number;
  finalTotal: number;
  units: number;
}

export interface SimulationResult {
  originalBill: BillBreakdown;
  newBill: BillBreakdown;
  solarGenerationMonthly: number;
  solarUtilized: number;
  batteryDischarge: number;
  gridImport: number;
  monthlySavings: number;
  demandDay: number;
  demandNight: number;
}

export interface PricingTier {
  panels: number;
  kwp: number;
  inverterSize: string;
  /**
   * Single-phase NO-BATTERY system (cash / 36m CC). Battery systems add the manual backup box
   * once plus `BATTERY_COST_CASH` per unit on top — there is no separate with-battery tier price.
   */
  cashPrice: number;
  ccPrice: number; // 36 Month Installment Price
  /** Three-phase NO-BATTERY system cash/CC; same battery add-on rule as above. */
  threePhaseCashPrice?: number;
  threePhaseCcPrice?: number;
  /** Inverter label for three-phase (differs from single-phase for 6–14). */
  threePhaseInverterSize?: string;
}

export interface RecommendationResult {
  panels: number;
  batteries: number;
  systemCostCash: number;
  systemCostCC: number;
  /** 60-month credit-card price. Comes from the engine so the SuRIA rebate lands on it too. */
  systemCostCC60: number;
  monthlySavings: number;
  savedPercentage: number;
  newBillAmount: number;
  paybackYearsCash: number;
  paybackYearsCC: number;
  roiPercentage: number;
  generation: number;
  export: number;
  inverterSize: string;
  newImportKwh: number;
  newExportKwh: number;
  batteryUtilization: number;
  // New fields for Inverter Upgrade Logic
  isUpgraded?: boolean;
  upgradeCost?: number;
  originalInverterSize?: string;
  exportCreditValue?: number;
  suriaRebate?: number;
}
