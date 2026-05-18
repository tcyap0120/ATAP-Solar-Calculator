
export interface PricingTier {
  minKw: number;
  maxKw: number;
  pricePerKw: number;
  baseFee: number; // For logic like "+ RM3000"
  deductionPerKw?: number; // For logic like "- RM50/kWp"
  useSmartLogic?: boolean; // If true, overrides pricePerKw with Reference Price lookup
  description: string;
}

export interface InverterBrand {
  id: string;
  name: string;
  pricingTiers: PricingTier[];
}

export interface MeterType {
  id: string;
  name: string;
  limitKwac: number;
  /** Max inverter AC (kW). ≤0 means no software cap (three-phase default). */
  maxInverterKw: number;
  recommendedInverterKw?: number; 
}

export interface ReferencePrice {
  panels: number;
  price: number;
  priceCC36?: number;
}

export interface BrandRule {
  minKwp: number;
  maxKwp: number;
  brandId: string;
}

export interface TariffGroup {
  id: string;
  name: string;
  rate: number;      // e.g. 0.5068
  kwtbbPct: number;  // e.g. 1.6
  description?: string;
}

export interface MaintenanceTier {
  minKwp: number;
  maxKwp: number;
  cost: number; // Cost per service
  frequencyYears: number; // How often (e.g. 1 = Annual, 3 = Every 3 years)
}

export interface OtherCostsSettings {
  gitaFee: number;          // One-time fee (e.g., 5000)
  gitaFeeThreshold: number; // Apply if kWp < this value (e.g., 60)
  gitaIncentiveThreshold: number; // Apply Tax Incentive if kWp >= this value (e.g. 60)
  stLicenseRate: number;    // RM per kWp per year (e.g., 1.65)
  stLicenseThreshold: number; // Apply if kWp >= this value (e.g., 100)
  chargemanCost: number;    // Monthly cost (e.g., 700)
  chargemanThreshold: number; // Apply if kWp >= this value (e.g., 100)
  visitingEngineerCost: number; // Monthly cost (e.g., 300)
  visitingEngineerThreshold: number; // Apply if kWp >= this value (e.g., 100)
}

export interface BatterySettings {
  capacityKwh: number; // e.g. 16
  usableRatio: number; // e.g. 0.9
  /** Cash price per battery unit (RM), not per kWh */
  pricePerUnit: number;
  maxCount: number; // e.g. 4
}

export interface FinancingSettings {
  interestRate: number; // Percentage (e.g. 5 for 5%)
  tenureYears: number; // e.g. 7
}

export interface GlobalSettings {
  panelRating: number; // kWp per panel (default 0.64)
  sunHours: number; // default 3.3
  tariffRate: number; // default 0.5068
  kwtbb: number; // default 1.6% (stored as 0.016)
  taxRate: number; // default 24% (stored as 0.24)
  resiBasePrice: number; // Legacy field, can be ignored or used as fallback
  exportRate: number; // NEM/Export rate (default 0.20)
  solarStartHour: number; // default 10 (10am)
  solarEndHour: number; // default 16 (4pm)
  /** @deprecated Use oversizingRatioWithoutBattery / oversizingRatioWithBattery */
  oversizingRatio?: number;
  /** DC/AC when no battery (default 1.37) */
  oversizingRatioWithoutBattery?: number;
  /** DC/AC when battery count > 0 (default 1.75) */
  oversizingRatioWithBattery?: number;
  referencePrices: ReferencePrice[]; // The lookup table for panel-based pricing
  brandRules: BrandRule[]; // Rules for auto-switching brands based on kWp
  tariffGroups: TariffGroup[]; // Configurable commercial tariff groups
  maintenanceTiers: MaintenanceTier[];
  otherCosts: OtherCostsSettings;
  battery: BatterySettings;
  financing: FinancingSettings;
  /** Bumped when saved settings receive one-time migrations; omit in older stored JSON. */
  _settingsSchemaVersion?: number;
}

export interface ProposedPlan {
  type: 'max_savings' | 'daytime_coverage' | 'bess_coverage';
  label: string;
  panels: number;
  kwp: number;
  estOffset: number; // RM
  hasExcess: boolean;
  cost: number;
  batteryCount?: number;
}

export interface CalculatorSession {
  selectedMeterId: string;
  selectedBrandId: string;
  kwpValue: string;
  panelsValue: string;
  inverterSize: string;
  selectedTariffGroupId: string;
  billAmount: string;
  targetKwh: string;
  roofLimit: string;
  noLoadDays: string;
  opStartHour: number;
  opEndHour: number;
  activeStrategy: 'custom' | 'max_savings' | 'daytime_coverage' | 'bess_coverage';
  proposedPlans: ProposedPlan[] | null;
  showBillDetails: boolean;
  showSavingsDetails: boolean;
  hasDefaultedMeter: boolean;
  batteryCount: number;
}

export interface CalculationResult {
  systemSizeKw: number;
  limitKwac: number;
  totalPrice: number; // Capex
  annualGeneration: number;
  annualSavings: number; // Gross Savings
  roiYearsNoTax: number;
  priceAfterCA: number;
  roiYearsCA: number;
  priceAfterGITA: number;
  roiYearsGITA: number; // Includes CA + GITA
  selfConsumedRatio: number; // 0 to 1
  annualSelfConsumedKwh: number;
  annualExportedKwh: number;
  savingsFromSelfConsumption: number;
  savingsFromExport: number;
  
  // Opex & Fees
  oneTimeFees: number; // e.g. GITA processing
  annualOpex: number; // Total Annual Recurring Costs
  netAnnualSavings: number; // Savings - Opex
  breakdownOpex: {
    maintenance: number;
    stLicense: number;
    chargeman: number;
    visitingEngineer: number;
    maintenanceDetails?: { cost: number; freq: number }; // For tooltip
  };
  isGitaEligible: boolean;
  
  // Battery specific
  batteryCount: number;
  batteryCapacity: number;
  batteryCost: number;
  batteryDischargeKwh: number; // Monthly
}

export interface QuotationDraft {
  clientname: string;
  clientcompany: string;
  contactno: string;
  email: string;
  addressline1: string;
  addressline2: string;
  addressline3: string;
  systemsize: string;
  panel: string;
  invertersize: string;
  inverterbrand: string;
  systemprice: number;
  date: string;
}
