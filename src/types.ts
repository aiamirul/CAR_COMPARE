export type FuelType = 'petrol' | 'diesel' | 'electric';

export interface Car {
  id: string;
  name: string;
  fuelEfficiency: number; // km/liter
  purchasePrice: number; // original car value
  depositAmount: number; // actual deposit (e.g., 10%)
  otherCosts: number; // upfront repairs or additional purchase cost
  resaleValueOverride: number | null; // direct resale value (null to auto-calculate)
  
  // New enhanced insurance & roadtax inputs
  insuranceMode?: 'formula' | 'override'; 
  ncdPct?: number; // 0, 25, 30, 38.33, 45, 55
  annualInsurance: number; // custom override if mode is 'override', else used as raw premium
  engineCc?: number; // engine capacity in cc to calculate Malaysian Road Tax
  
  serviceCostPer10k: number; // maintenance service cost per 10,000 km
  loanTermYears: number; // loan duration in years
  interestRate: number; // annual flat interest percentage (e.g., 4% or 2%)
  fuelType: FuelType;
  isSample?: boolean;
}

export type CalcMode = 'reference' | 'true_economic';

export interface GlobalParams {
  petrolPrice: number; // Petrol price per liter
  dieselPrice: number; // Diesel price per liter
  electricityPrice: number; // Electricity price per kWh (default 0.8)
  calcMode: CalcMode;
  tripDistance: number; // km for a custom trip
  passengers: number; // numbers of passengers to split trip cost
  totalAssessmentKm: number; // default 150000 km
  totalAssessmentYears: number; // default 10 years
}

export interface CalculatedCost {
  carId: string;
  carName: string;
  
  // Basic attributes
  efficiencyKmL: number;
  mpg: number;
  litersPer100Km: number;
  engineCc: number; // actual or fallback
  
  // Cashflow details
  resaleValue: number;
  depreciationTotal: number; // Total depreciation or loss representing original capital - resale
  totalCarValue: number; // purchase price + upfront fees/repairs
  loanAmount: number;
  interestTotal: number;
  
  // New component outlays
  annualInsurancePremium: number;
  annualRoadTax: number;
  
  // Costs per km (RM/KM)
  fuelCostPerKm: number;
  interestCostPerKm: number;
  insuranceCostPerKm: number;
  roadTaxCostPerKm: number; // Malaysian tiered scale cost per km
  repairsCostPerKm: number;
  serviceCostPerKm: number;
  capitalCostPerKm: number; // Cost to drive (raw depreciation + fees etc)
  
  // Aggregated costs per km
  ownershipCostPerKm: number;
  actualCostPerKm: number;
  
  // Trip details
  tripCostTotal: number;
  tripCostPerPassenger: number;
}
