import { Car, GlobalParams, CalculatedCost } from './types';

/**
 * Calculates the annual Malaysia road tax using physical engine capacity (cc)
 * based on the official private passenger vehicle tiered structure:
 *  - 1,000cc and below: RM20.00 Base, None progressive
 *  - 1,001 - 1,200cc: RM55.00 Base, None progressive
 *  - 1,201 - 1,400cc: RM70.00 Base, None progressive
 *  - 1,401 - 1,600cc: RM90.00 Base, None progressive
 *  - 1,601 - 1,800cc: RM200.00 + RM0.40 per cc exceeding 1,600cc
 *  - 1,801 - 2,000cc: RM280.00 + RM0.50 per cc exceeding 1,800cc
 *  - 2,001 - 2,500cc: RM380.00 + RM1.00 per cc exceeding 2,000cc
 *  - 2,501 - 3,000cc: RM880.00 + RM2.50 per cc exceeding 2,500cc
 *  - 3,000cc and above: RM2,130.00 + RM4.50 per cc exceeding 3,000cc
 */
export const calculateRoadTax = (cc: number): number => {
  if (cc <= 1000) return 20;
  if (cc <= 1200) return 55;
  if (cc <= 1400) return 70;
  if (cc <= 1600) return 90;
  
  if (cc <= 1800) {
    return 200 + Math.max(0, cc - 1600) * 0.40;
  }
  if (cc <= 2000) {
    return 280 + Math.max(0, cc - 1800) * 0.50;
  }
  if (cc <= 2500) {
    return 380 + Math.max(0, cc - 2000) * 1.00;
  }
  if (cc <= 3000) {
    return 880 + Math.max(0, cc - 2500) * 2.50;
  }
  return 2130 + Math.max(0, cc - 3000) * 4.50;
};

/**
 * Estimates standard annual comprehensive insurance for private cars (West Malaysia Tariff rates):
 * - Basic Premium: first RM20,000 car sum-insured is RM339.20 base
 * - Every incremental RM1,000 sum-insured is RM26.00
 * - Applies standard NCD reduction %
 */
export const calculateInsurancePremium = (purchasePrice: number, ncdPct: number): number => {
  const baseRate = 339.20;
  let basicPremium = baseRate;
  
  if (purchasePrice > 20000) {
    const excessThousand = Math.ceil((purchasePrice - 20000) / 1000);
    basicPremium += excessThousand * 26.00;
  } else {
    basicPremium = Math.max(150, (purchasePrice / 20000) * baseRate);
  }
  
  const discountFactor = 1 - (ncdPct / 100);
  return basicPremium * discountFactor;
};

export const calculateCarCost = (car: Car, params: GlobalParams): CalculatedCost => {
  const { petrolPrice, dieselPrice, electricityPrice = 0.8, calcMode, tripDistance, passengers, totalAssessmentKm, totalAssessmentYears } = params;

  // Fallbacks for saved state or sample compatibility
  const engineCc = car.engineCc !== undefined ? car.engineCc : (car.fuelType === 'electric' ? 0 : 1500);
  const insuranceMode = car.insuranceMode ?? 'formula';
  const ncdPct = car.ncdPct ?? 55;

  // 1. Fuel efficiency derivations
  const efficiencyKmL = car.fuelEfficiency;
  const mpg = efficiencyKmL * 2.35215; // standard conversion
  const litersPer100Km = efficiencyKmL > 0 ? 100 / efficiencyKmL : 0;

  // 2. Fuel cost per km based on Petrol vs Diesel vs Electric
  const fuelPricePerLiter = car.fuelType === 'diesel' 
    ? dieselPrice 
    : car.fuelType === 'electric' 
    ? electricityPrice 
    : petrolPrice;
  const fuelCostPerKm = efficiencyKmL > 0 ? fuelPricePerLiter / efficiencyKmL : 0;

  // 3. Resale value formulation
  let resaleValue = 0;
  if (car.resaleValueOverride !== null) {
    resaleValue = car.resaleValueOverride;
  } else {
    // Fallback profile rates based on user inputs
    if (totalAssessmentYears === 10) {
      // 80% depreciation (20% resale)
      resaleValue = car.purchasePrice * 0.20;
    } else if (totalAssessmentYears === 5) {
      // 50% depreciation (50% resale)
      resaleValue = car.purchasePrice * 0.50;
    } else {
      // Linear extrapolation as standard
      const ratio = 1 - (0.08 * totalAssessmentYears); // ~8% depreciation per year as average
      resaleValue = Math.max(0, car.purchasePrice * Math.max(0.1, ratio));
    }
  }

  // 4. Net depreciation after sale
  const depreciationTotal = Math.max(0, car.purchasePrice - resaleValue);

  // 5. Total cost base (Car value + Deposit + upfront upgrades/fees)
  // Spreadsheet formula: Total Car Value = Car Value (purchasePrice) + Deposit + Repairs (depositAmount + otherCosts)
  const totalCarValue = car.purchasePrice + car.depositAmount + car.otherCosts;

  // 6. Loan parameters
  // Assuming 10% default deposit on total car value, loan is 90% of totalCarValue
  // More adjustable: Loan Amount = Total Car Value - Deposit
  const loanAmount = Math.max(0, totalCarValue - car.depositAmount);
  const interestTotal = Math.max(0, loanAmount * (car.interestRate / 100) * car.loanTermYears);

  // 7. Insurance Calculation (mode-based: formula with progressive NCD vs custom actual override value with progressive NCD)
  let annualInsurancePremium = 0;
  let totalInsuranceCost = 0;
  for (let y = 1; y <= totalAssessmentYears; y++) {
    let currentNcd = 55;
    if (y === 1) currentNcd = 0;
    else if (y === 2) currentNcd = 25;
    else if (y === 3) currentNcd = 30;
    else if (y === 4) currentNcd = 38.33;
    else if (y === 5) currentNcd = 45;
    else currentNcd = 55;
    
    if (insuranceMode === 'override') {
      const discountFactor = 1 - (currentNcd / 100);
      totalInsuranceCost += car.annualInsurance * discountFactor;
    } else {
      totalInsuranceCost += calculateInsurancePremium(car.purchasePrice, currentNcd);
    }
  }
  annualInsurancePremium = totalAssessmentYears > 0 ? (totalInsuranceCost / totalAssessmentYears) : 0;

  // 8. Road Tax calculation from CC capacity
  const annualRoadTax = calculateRoadTax(engineCc);

  // 9. Core costs per KM
  const interestCostPerKm = interestTotal / totalAssessmentKm;
  const insuranceCostPerKm = (annualInsurancePremium * totalAssessmentYears) / totalAssessmentKm;
  const roadTaxCostPerKm = (annualRoadTax * totalAssessmentYears) / totalAssessmentKm;
  const repairsCostPerKm = car.otherCosts / totalAssessmentKm;
  const serviceCostPerKm = car.serviceCostPer10k / 10000;

  // 10. Capital cost per KM ("Cost to Drive")
  let capitalCostPerKm = 0;
  if (calcMode === 'reference') {
    // Matches the spreadsheet: Cost to Drive = (Car Purchase Value + Loan Interest Total) / Total Assessment KM
    capitalCostPerKm = (car.purchasePrice + interestTotal) / totalAssessmentKm;
  } else {
    // True Economic Capital Cost = Net actual vehicle depreciation amortized + other initial overheads
    // (Notice that we correctly deduct the resale value!)
    capitalCostPerKm = (depreciationTotal + car.otherCosts) / totalAssessmentKm;
  }

  // 11. Ownership Cost per km
  // Capital Cost/KM + Interest/KM + Insurance/KM + RoadTax/KM + Service/KM (Repairs/KM is technically in Deposit)
  const ownershipCostPerKm = capitalCostPerKm + interestCostPerKm + insuranceCostPerKm + roadTaxCostPerKm + serviceCostPerKm;

  // 12. Actual total Cost / KM (Ownership Upkeep + Fuel Upkeep)
  const actualCostPerKm = ownershipCostPerKm + fuelCostPerKm;

  // 13. Trip projection
  const tripCostTotal = actualCostPerKm * tripDistance;
  const tripCostPerPassenger = passengers > 0 ? tripCostTotal / passengers : tripCostTotal;

  return {
    carId: car.id,
    carName: car.name,
    efficiencyKmL,
    mpg,
    litersPer100Km,
    engineCc,
    resaleValue,
    depreciationTotal,
    totalCarValue,
    loanAmount,
    interestTotal,
    annualInsurancePremium,
    annualRoadTax,
    fuelCostPerKm,
    interestCostPerKm,
    insuranceCostPerKm,
    roadTaxCostPerKm,
    repairsCostPerKm,
    serviceCostPerKm,
    capitalCostPerKm,
    ownershipCostPerKm,
    actualCostPerKm,
    tripCostTotal,
    tripCostPerPassenger,
  };
};
