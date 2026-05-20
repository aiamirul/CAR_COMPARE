import { Car } from './types';

export const SAMPLE_CARS: Car[] = [
  {
    id: 'sample-1',
    name: 'Entry sedan (e.g. Saga/Bezza)',
    fuelEfficiency: 12.57,
    purchasePrice: 30800,
    depositAmount: 3080, // 10%
    otherCosts: 5000, // upfront repairs/others to make Deposit + Repairs = 8080
    resaleValueOverride: 10000,
    insuranceMode: 'formula',
    ncdPct: 55,
    annualInsurance: 1350, 
    engineCc: 1300,
    serviceCostPer10k: 700, // 0.07 RM/KM
    loanTermYears: 9,
    interestRate: 4.0, // 4.0%
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-2',
    name: 'Compact Hatchback (e.g. Axia A)',
    fuelEfficiency: 17.0,
    purchasePrice: 22000,
    depositAmount: 2200,
    otherCosts: 0,
    resaleValueOverride: 11000,
    insuranceMode: 'formula',
    ncdPct: 55,
    annualInsurance: 540, 
    engineCc: 1000,
    serviceCostPer10k: 400, // 0.04 RM/KM
    loanTermYears: 9,
    interestRate: 4.0,
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-3',
    name: 'Compact Hatchback (e.g. Axia B)',
    fuelEfficiency: 17.0,
    purchasePrice: 38600,
    depositAmount: 3860,
    otherCosts: 0,
    resaleValueOverride: 19300,
    insuranceMode: 'override', // Keep specific override as in sample
    ncdPct: 55,
    annualInsurance: 1050, 
    engineCc: 1000,
    serviceCostPer10k: 400, // 0.04 RM/KM
    loanTermYears: 9,
    interestRate: 4.0,
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-4',
    name: 'B-Segment Sedan (e.g. Vios/City)',
    fuelEfficiency: 15.0,
    purchasePrice: 58300,
    depositAmount: 5830,
    otherCosts: 0,
    resaleValueOverride: 29150,
    insuranceMode: 'formula',
    ncdPct: 55,
    annualInsurance: 1350, 
    engineCc: 1500,
    serviceCostPer10k: 500, // 0.05 RM/KM
    loanTermYears: 9,
    interestRate: 4.0,
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-5',
    name: 'Executive Segment (e.g. Accord/Camry)',
    fuelEfficiency: 16.0,
    purchasePrice: 180000,
    depositAmount: 18000,
    otherCosts: 0,
    resaleValueOverride: 90000,
    insuranceMode: 'formula',
    ncdPct: 55,
    annualInsurance: 2625, 
    engineCc: 2500,
    serviceCostPer10k: 800, // 0.08 RM/KM
    loanTermYears: 9,
    interestRate: 2.0, // 2.0%
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-6',
    name: 'Premium SUV/Sedan (e.g. CR-V/Mazda)',
    fuelEfficiency: 21.0,
    purchasePrice: 148000,
    depositAmount: 14800,
    otherCosts: 0,
    resaleValueOverride: 74000,
    insuranceMode: 'formula',
    ncdPct: 55,
    annualInsurance: 2400, 
    engineCc: 2000,
    serviceCostPer10k: 800, // 0.08 RM/KM
    loanTermYears: 9,
    interestRate: 2.0,
    fuelType: 'petrol',
    isSample: true,
  },
  {
    id: 'sample-7',
    name: 'Proton e.MAS 5 Standard',
    fuelEfficiency: 12, // 12 km/kWh
    purchasePrice: 56800,
    depositAmount: 5680, // 10%
    otherCosts: 0,
    resaleValueOverride: 28400, // 50% resale override
    insuranceMode: 'override',
    ncdPct: 55,
    annualInsurance: 3300, // RM3,300 for 1st year insurance, progress NCD over lifespans
    engineCc: 1500, // Road tax standard considered as 1500 cc car (RM 90 / year)
    serviceCostPer10k: 120, // RM120 maintenance per 10,000 km
    loanTermYears: 9,
    interestRate: 4.0,
    fuelType: 'electric',
    isSample: true,
  },
  {
    id: 'sample-8',
    name: 'Proton e.MAS 5 Premium',
    fuelEfficiency: 12, // 12 km/kWh
    purchasePrice: 69800,
    depositAmount: 6980, // 10%
    otherCosts: 0,
    resaleValueOverride: 34950, // 50% resale override (69,900 / 2 or 69,800 / 2) Wait, 69800 / 2 = 34900
    insuranceMode: 'override',
    ncdPct: 55,
    annualInsurance: 3300, // RM3,300 for 1st year insurance, progress NCD over lifespans
    engineCc: 1500, // Road tax standard considered as 1500 cc car
    serviceCostPer10k: 120, // RM120 maintenance per 10,000 km
    loanTermYears: 9,
    interestRate: 4.0,
    fuelType: 'electric',
    isSample: true,
  },
];
