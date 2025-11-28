

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
  cashPrice: number;
  ccPrice: number; // 36 Month Installment Price
}

export interface RecommendationResult {
  panels: number;
  batteries: number;
  systemCostCash: number;
  systemCostCC: number;
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
}
