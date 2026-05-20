import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car as CarIcon, 
  Plus, 
  RotateCcw, 
  Edit2, 
  Trash2, 
  HelpCircle, 
  Info, 
  Gauge, 
  Droplet, 
  TrendingDown, 
  Shield, 
  Wrench, 
  Settings, 
  Users, 
  MapPin, 
  Copy, 
  ArrowUpRight, 
  Check,
  Percent,
  Coins,
  ChevronDown,
  LayoutGrid,
  BarChart3,
  Scale,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  LineChart,
  Line
} from 'recharts';
import { Car, GlobalParams, CalculatedCost, FuelType, CalcMode } from './types';
import { SAMPLE_CARS } from './data';
import { calculateCarCost, calculateInsurancePremium } from './utils';
import { exportToExcel } from './excelExport';

// Helper to load items securely from Local Storage
const STORAGE_KEY = 'car_calc_custom_cars_v1';
const METRICS_STORAGE_KEY = 'car_calc_global_params_v1';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'charts' | 'compare'>('matrix');
  const [chartSubTab, setChartSubTab] = useState<'breakdown' | 'cumulative' | 'yearly_cost' | 'cost_per_km'>('breakdown');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRefInfo, setShowRefInfo] = useState(false);

  // Read environment variables or fallback
  const envPetrol = (import.meta as any).env.VITE_DEFAULT_PETROL_PRICE;
  const envDiesel = (import.meta as any).env.VITE_DEFAULT_DIESEL_PRICE;
  const envElectricity = (import.meta as any).env.VITE_DEFAULT_ELECTRICITY_PRICE;
  
  const [globalParams, setGlobalParams] = useState<GlobalParams>({
    petrolPrice: envPetrol ? parseFloat(envPetrol) : 1.99,
    dieselPrice: envDiesel ? parseFloat(envDiesel) : 4.87,
    electricityPrice: envElectricity ? parseFloat(envElectricity) : 0.80,
    calcMode: 'reference',
    tripDistance: 250,
    passengers: 4,
    totalAssessmentKm: 150000,
    totalAssessmentYears: 10,
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load cars
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Car[];
        let updated = false;

        // Upgrade name of sample-7 if obsolete
        parsed.forEach(car => {
          if (car.id === 'sample-7' && (car.name === 'Proton e.MAS 5' || car.name === 'Proton e.MAS 5 (Electric)')) {
            car.name = 'Proton e.MAS 5 Standard';
            updated = true;
          }
        });

        // Ensure e.MAS 5 Standard (sample-7) exists
        if (!parsed.some(car => car.id === 'sample-7' || car.name === 'Proton e.MAS 5 Standard')) {
          const masCar = SAMPLE_CARS.find(c => c.id === 'sample-7');
          if (masCar) {
            parsed.push(masCar);
            updated = true;
          }
        }

        // Ensure e.MAS 5 Premium (sample-8) exists
        if (!parsed.some(car => car.id === 'sample-8' || car.name === 'Proton e.MAS 5 Premium')) {
          const masPremiumCar = SAMPLE_CARS.find(c => c.id === 'sample-8');
          if (masPremiumCar) {
            parsed.push(masPremiumCar);
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        setCars(parsed);
      } catch (e) {
        setCars(SAMPLE_CARS);
      }
    } else {
      setCars(SAMPLE_CARS);
    }

    // Load global params
    const storedParams = localStorage.getItem(METRICS_STORAGE_KEY);
    if (storedParams) {
      try {
        const parsed = JSON.parse(storedParams);
        // Ensure values are numbers
        setGlobalParams(prev => ({
          ...prev,
          ...parsed,
          petrolPrice: typeof parsed.petrolPrice === 'number' ? parsed.petrolPrice : prev.petrolPrice,
          dieselPrice: typeof parsed.dieselPrice === 'number' ? parsed.dieselPrice : prev.dieselPrice,
          electricityPrice: typeof parsed.electricityPrice === 'number' ? parsed.electricityPrice : (parsed.electricityPrice ? parseFloat(parsed.electricityPrice) : prev.electricityPrice),
        }));
      } catch (e) {
        // keep defaults
      }
    }
  }, []);

  // Save changes to local storage
  const saveCarsToStorage = (updatedCars: Car[]) => {
    setCars(updatedCars);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCars));
  };

  const updateGlobalParam = <K extends keyof GlobalParams>(key: K, value: GlobalParams[K]) => {
    const updated = { ...globalParams, [key]: value };
    setGlobalParams(updated);
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
  };

  // --- CALCULATION HOOKS ---
  const calculatedCars = useMemo(() => {
    return cars.map(car => calculateCarCost(car, globalParams));
  }, [cars, globalParams]);

  const selectedCarDetails = useMemo(() => {
    if (!selectedCarId) return null;
    const calc = calculatedCars.find(c => c.carId === selectedCarId);
    const origin = cars.find(c => c.id === selectedCarId);
    return calc && origin ? { calc, origin } : null;
  }, [selectedCarId, calculatedCars, cars]);

  // Default selection if none selected
  useEffect(() => {
    if (calculatedCars.length > 0 && !selectedCarId) {
      setSelectedCarId(calculatedCars[0].carId);
    }
  }, [calculatedCars, selectedCarId]);

  // --- MUTATION ACTORS ---
  const handleResetToDefaults = () => {
    if (window.confirm('Reset comparison list to the original 6 reference cars from the spreadsheet?')) {
      saveCarsToStorage(SAMPLE_CARS);
      setSelectedCarId(SAMPLE_CARS[0].id);
      setEditingCar(null);
      setIsAddingNew(false);
    }
  };

  const handleCreateCar = () => {
    const newCar: Car = {
      id: `custom-${Date.now()}`,
      name: 'My Custom Vehicle',
      fuelEfficiency: 14.5,
      purchasePrice: 45000,
      depositAmount: 4500, // 10%
      otherCosts: 0,
      resaleValueOverride: null, // auto-depreciate
      annualInsurance: 1200,
      serviceCostPer10k: 500,
      loanTermYears: 9,
      interestRate: 3.5,
      fuelType: 'petrol',
    };
    
    setEditingCar(newCar);
    setIsAddingNew(true);
  };

  const handleCloneCar = (car: Car, e: React.MouseEvent) => {
    e.stopPropagation();
    const clone: Car = {
      ...car,
      id: `custom-clone-${Date.now()}`,
      name: `${car.name} (Copy)`,
      isSample: false, // make it customizable
    };
    const updated = [...cars, clone];
    saveCarsToStorage(updated);
    setSelectedCarId(clone.id);
    
    // Quick copy visual feedback
    setCopiedId(car.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const handleDeleteCar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this vehicle from your comparison?')) {
      const updated = cars.filter(c => c.id !== id);
      saveCarsToStorage(updated);
      if (selectedCarId === id) {
        setSelectedCarId(updated.length > 0 ? updated[0].id : null);
      }
      if (editingCar?.id === id) {
        setEditingCar(null);
      }
    }
  };

  const handleStartEdit = (car: Car, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCar({ ...car });
    setIsAddingNew(false);
  };

  const handleSaveCarDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar) return;

    let updatedList: Car[];
    if (isAddingNew) {
      updatedList = [...cars, editingCar];
    } else {
      updatedList = cars.map(c => c.id === editingCar.id ? editingCar : c);
    }

    saveCarsToStorage(updatedList);
    setSelectedCarId(editingCar.id);
    setEditingCar(null);
    setIsAddingNew(false);
  };

  // Profile presets helper
  const handleApplyProfilePreset = (years: number, km: number) => {
    setGlobalParams(prev => {
      const updated = {
        ...prev,
        totalAssessmentYears: years,
        totalAssessmentKm: km
      };
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleExportToExcel = async () => {
    try {
      await exportToExcel(cars, globalParams);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    }
  };

  // Recharts color palette - styled to fit "Immersive UI" glowing aesthetics
  const COLORS = {
    fuel: '#f59e0b',       // Cyber Amber
    depreciation: '#06b6d4', // High-energy Cyan
    interest: '#3b82f6',   // Digital Blue
    insurance: '#8b5cf6',  // Vivid Purple
    roadTax: '#f43f5e',    // Velvet Rose/Crimson (Malaysian Road Tax)
    repairs: '#ec4899',    // Hot Pink
    service: '#10b981',    // Emerald Upkeep
  };

  const chartData = useMemo(() => {
    return calculatedCars.map(c => {
      const fuelVal = parseFloat(c.fuelCostPerKm.toFixed(3));
      const deprVal = parseFloat(c.capitalCostPerKm.toFixed(3));
      const loanVal = parseFloat(c.interestCostPerKm.toFixed(3));
      const insVal = parseFloat(c.insuranceCostPerKm.toFixed(3));
      const taxVal = parseFloat(c.roadTaxCostPerKm.toFixed(3));
      const maintVal = parseFloat(c.serviceCostPerKm.toFixed(3));
      const total = fuelVal + deprVal + loanVal + insVal + taxVal + maintVal;

      const getPct = (val: number) => {
        if (total <= 0 || val <= 0) return '';
        const pct = (val / total) * 100;
        return pct >= 7 ? `${Math.round(pct)}%` : ''; // Only draw labels when portion is large enough to stay readable
      };

      return {
        name: c.carName.length > 22 ? c.carName.substring(0, 20) + '...' : c.carName,
        'Fuel Cost': fuelVal,
        'Depreciation/Overhead': deprVal,
        'Loan Interest': loanVal,
        'First Party Insurance': insVal,
        'Road Tax': taxVal,
        'Maintenance Service': maintVal,
        'Total Cost/KM': parseFloat(c.actualCostPerKm.toFixed(3)),
        'Fuel Cost %': getPct(fuelVal),
        'Depreciation/Overhead %': getPct(deprVal),
        'Loan Interest %': getPct(loanVal),
        'First Party Insurance %': getPct(insVal),
        'Road Tax %': getPct(taxVal),
        'Maintenance Service %': getPct(maintVal),
      };
    });
  }, [calculatedCars]);

  // Year-by-Year Cumulative Cost (RM)
  const cumulativeChartData = useMemo(() => {
    const Y = globalParams.totalAssessmentYears;
    const data: any[] = [];
    
    // Initialize trackers with upfront costs (deposit + other custom costs)
    const trackers = cars.map(car => ({
      id: car.id,
      name: car.name,
      sum: car.depositAmount + (car.otherCosts || 0),
    }));

    // Year 0
    const year0Point: any = { name: 'Year 0', rawYear: 0 };
    trackers.forEach(t => {
      year0Point[t.name] = t.sum;
    });
    data.push(year0Point);

    const totalKm = globalParams.totalAssessmentKm;
    const annualDistance = Y > 0 ? totalKm / Y : 15000;

    for (let y = 1; y <= Y; y++) {
      const point: any = { name: `Year ${y}`, rawYear: y };
      
      let ncdPct = 55;
      if (y === 1) ncdPct = 0;
      else if (y === 2) ncdPct = 25;
      else if (y === 3) ncdPct = 30;
      else if (y === 4) ncdPct = 38.33;
      else if (y === 5) ncdPct = 45;
      else ncdPct = 55;

      trackers.forEach(t => {
        const car = cars.find(c => c.id === t.id);
        const calc = calculatedCars.find(c => c.carId === t.id);
        if (!car || !calc) return;

        // Fuel cost
        const fuelCost = annualDistance * calc.fuelCostPerKm;
        
        // Capital & interest
        const annualDepr = calc.capitalCostPerKm * annualDistance;
        const annualInterest = calc.interestCostPerKm * annualDistance;
        
        // Insurance
        let insuranceCost = 0;
        if (car.insuranceMode === 'override') {
          insuranceCost = car.annualInsurance * (1 - (ncdPct / 100));
        } else {
          insuranceCost = calculateInsurancePremium(car.purchasePrice, ncdPct);
        }
        
        const roadTaxCost = calc.annualRoadTax;
        const maintCost = annualDistance * calc.serviceCostPerKm;

        const yearSpent = fuelCost + annualDepr + annualInterest + insuranceCost + roadTaxCost + maintCost;
        t.sum += yearSpent;
        
        point[t.name] = parseFloat(t.sum.toFixed(0));
      });
      
      data.push(point);
    }
    return data;
  }, [cars, calculatedCars, globalParams]);

  // Year-by-Year Operating Expenses per Year (RM/Year)
  const yearlyExpensesChartData = useMemo(() => {
    const Y = globalParams.totalAssessmentYears;
    const data: any[] = [];
    const totalKm = globalParams.totalAssessmentKm;
    const annualDistance = Y > 0 ? totalKm / Y : 15000;

    for (let y = 1; y <= Y; y++) {
      const point: any = { name: `Year ${y}`, rawYear: y };
      
      let ncdPct = 55;
      if (y === 1) ncdPct = 0;
      else if (y === 2) ncdPct = 25;
      else if (y === 3) ncdPct = 30;
      else if (y === 4) ncdPct = 38.33;
      else if (y === 5) ncdPct = 45;
      else ncdPct = 55;

      cars.forEach(car => {
        const calc = calculatedCars.find(c => c.carId === car.id);
        if (!calc) return;

        const fuelCost = annualDistance * calc.fuelCostPerKm;
        const annualDepr = calc.capitalCostPerKm * annualDistance;
        const annualInterest = calc.interestCostPerKm * annualDistance;
        
        let insuranceCost = 0;
        if (car.insuranceMode === 'override') {
          insuranceCost = car.annualInsurance * (1 - (ncdPct / 100));
        } else {
          insuranceCost = calculateInsurancePremium(car.purchasePrice, ncdPct);
        }
        
        const roadTaxCost = calc.annualRoadTax;
        const maintCost = annualDistance * calc.serviceCostPerKm;

        const yearSpent = fuelCost + annualDepr + annualInterest + insuranceCost + roadTaxCost + maintCost;
        
        point[car.name] = parseFloat(yearSpent.toFixed(0));
      });
      
      data.push(point);
    }
    return data;
  }, [cars, calculatedCars, globalParams]);

  // Year-by-Year Cost per Kilometer (RM/KM)
  const yearlyCostPerKmChartData = useMemo(() => {
    const Y = globalParams.totalAssessmentYears;
    const data: any[] = [];
    const totalKm = globalParams.totalAssessmentKm;
    const annualDistance = Y > 0 ? totalKm / Y : 15000;

    for (let y = 1; y <= Y; y++) {
      const point: any = { name: `Year ${y}`, rawYear: y };
      
      let ncdPct = 55;
      if (y === 1) ncdPct = 0;
      else if (y === 2) ncdPct = 25;
      else if (y === 3) ncdPct = 30;
      else if (y === 4) ncdPct = 38.33;
      else if (y === 5) ncdPct = 45;
      else ncdPct = 55;

      cars.forEach(car => {
        const calc = calculatedCars.find(c => c.carId === car.id);
        if (!calc) return;

        const fuelCost = annualDistance * calc.fuelCostPerKm;
        const annualDepr = calc.capitalCostPerKm * annualDistance;
        const annualInterest = calc.interestCostPerKm * annualDistance;
        
        let insuranceCost = 0;
        if (car.insuranceMode === 'override') {
          insuranceCost = car.annualInsurance * (1 - (ncdPct / 100));
        } else {
          insuranceCost = calculateInsurancePremium(car.purchasePrice, ncdPct);
        }
        
        const roadTaxCost = calc.annualRoadTax;
        const maintCost = annualDistance * calc.serviceCostPerKm;

        const yearSpent = fuelCost + annualDepr + annualInterest + insuranceCost + roadTaxCost + maintCost;
        const costPerKm = annualDistance > 0 ? yearSpent / annualDistance : 0;
        
        point[car.name] = parseFloat(costPerKm.toFixed(3));
      });
      
      data.push(point);
    }
    return data;
  }, [cars, calculatedCars, globalParams]);

  return (
    <div className="min-h-screen bg-[#050608] text-[#e0e0e0] font-sans antialiased selection:bg-cyan-500/20">
      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-[#0a0c12]/90 backdrop-blur-md sticky top-0 z-10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <CarIcon className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-widest uppercase text-cyan-400 font-display">
                CAR<span className="font-bold text-white">CALC</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#706F69] font-mono">Precision Automotive Lifecycle Economics</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Header Live price display widgets */}
            <div className="hidden lg:flex items-center gap-6 text-[11px] uppercase tracking-wider bg-white/[0.02] border border-white/5 px-4 py-2 rounded-lg">
              <div className="flex flex-col items-start pr-4 border-r border-white/10">
                <span className="text-[9px] text-[#706F69] font-mono leading-none mb-1">RON95 PETROL</span>
                <span className="text-sm font-mono font-bold text-cyan-400">RM {globalParams.petrolPrice.toFixed(2)}<span className="text-[10px] text-[#706F69] font-normal">/L</span></span>
              </div>
              <div className="flex flex-col items-start pr-4 border-r border-white/10">
                <span className="text-[9px] text-[#706F69] font-mono leading-none mb-1">EURO 5 DIESEL</span>
                <span className="text-sm font-mono font-bold text-amber-500">RM {globalParams.dieselPrice.toFixed(2)}<span className="text-[10px] text-[#706F69] font-normal">/L</span></span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-[#706F69] font-mono leading-none mb-1">ELECTRICITY</span>
                <span className="text-sm font-mono font-bold text-emerald-400">RM {(globalParams.electricityPrice ?? 0.8).toFixed(2)}<span className="text-[10px] text-[#706F69] font-normal">/kWh</span></span>
              </div>
            </div>

            {/* Standard vs True Toggle */}
            <div className="bg-white/[0.04] p-1 border border-white/5 rounded-lg flex items-center text-xs">
              <button
                id="btn-ref-mode"
                onClick={() => updateGlobalParam('calcMode', 'reference')}
                className={`px-3.5 py-2 rounded-md font-medium tracking-wide transition-all ${
                  globalParams.calcMode === 'reference' 
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' 
                    : 'text-white/40 hover:text-white border border-transparent'
                }`}
                title="Use original reference sheet formulas (including double-counted flat interest)"
              >
                📊 Reference Mode
              </button>
              <button
                id="btn-eco-mode"
                onClick={() => updateGlobalParam('calcMode', 'true_economic')}
                className={`px-3.5 py-2 rounded-md font-medium tracking-wide transition-all ${
                  globalParams.calcMode === 'true_economic' 
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' 
                    : 'text-white/40 hover:text-white border border-transparent'
                }`}
                title="Subtracts resale value and fixes interest double-counting"
              >
                ⚖️ True Economic Mode
              </button>
            </div>

            <button
              id="btn-reset-specs"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/20 rounded-lg text-xs font-semibold uppercase tracking-wider text-white/80 transition-all flex items-center gap-1.5"
              title="Reset comparison system to the 6 seed cars"
            >
              <RotateCcw className="h-3 w-3 text-cyan-400" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* METHODOLOGY EXPLANATION BOX (ANIMATED ON TOGGLE) */}
        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all ${
              globalParams.calcMode === 'reference'
                ? 'bg-amber-950/20 border-amber-500/20 text-amber-250'
                : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-250'
            }`}
          >
            <div className="flex gap-3">
              <Info className={`h-5 w-5 mt-0.5 shrink-0 ${globalParams.calcMode === 'reference' ? 'text-amber-400' : 'text-cyan-400'}`} />
              <div>
                <h4 className={`text-sm font-semibold tracking-wide ${globalParams.calcMode === 'reference' ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {globalParams.calcMode === 'reference' 
                    ? 'Methodology: Reference Spreadsheet Logic (Aesthetic Match)' 
                    : 'Methodology: Real World True Economic Logic (Cost Correct)'}
                </h4>
                <p className="text-xs text-white/70 mt-1 max-w-4xl font-sans">
                  {globalParams.calcMode === 'reference' 
                    ? 'Matches your reference spreadsheet. Interest is calculated on 90% of Total Car Value and amortized over 150,000km, plus added into Cost to Drive (which is (Car Value + Interest) / 150,000km), and added again to reach Ownership Cost. Resale value is tracked as "Net after Sale" but is not deducted from actual per-km costs.'
                    : 'Provides correct financial modeling. Original capital depreciation (Purchase Value minus Resale value) is amortized per-km. Interest is accounted for exactly once as a loan upkeep. Any upfront setups or repairs are cleanly amortized. Car resale value returned is correctly subtracted from your net outlay.'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowRefInfo(!showRefInfo)} 
              className={`text-xs font-semibold shrink-0 hover:underline flex items-center gap-1 ${
                globalParams.calcMode === 'reference' ? 'text-amber-400' : 'text-cyan-400'
              }`}
            >
              {showRefInfo ? 'Hide math formulas' : 'Show math formulas'}
              <ChevronDown className={`h-3 w-3 transform transition-transform ${showRefInfo ? 'rotate-180' : ''}`} />
            </button>
          </motion.div>
        </AnimatePresence>

        {showRefInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-5 rounded-xl border border-white/5 bg-[#0a0c12] text-xs text-white/70 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <h5 className="font-semibold text-white mb-2">📊 Reference Spreadsheet Method</h5>
              <ul className="space-y-1.5 list-disc pl-4 font-mono text-white/60">
                <li><span className="font-semibold text-cyan-400">Capital Cost/KM (Cost to Drive)</span> = (Car Purchase Value + Interest Total) / Total Assessment KM</li>
                <li><span className="font-semibold text-cyan-400">Interest Total (Flat Rate)</span> = (Total Car Value * 90%) * (Interest % / 100) * Loan Years</li>
                <li><span className="font-semibold text-cyan-400">Ownership Cost/KM</span> = Cost To Drive + Interest/KM + Insurance/KM + Service/KM</li>
                <li><span className="font-semibold text-cyan-400">Actual Cost/KM</span> = Ownership Cost/KM + Fuel Cost/KM</li>
                <li className="text-amber-400 italic">Notice: Interest/KM is counted twice (once inside the Cost To Drive and once as a standalone row), and Resale is overlooked in per-KM bills.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-2">⚖️ Real World True Economic Method</h5>
              <ul className="space-y-1.5 list-disc pl-4 font-mono text-white/60">
                <li><span className="font-semibold text-cyan-400">Capital Cost/KM</span> = (Car Purchase Value - Resale Value + Initial repairs) / Total Assessment KM</li>
                <li><span className="font-semibold text-cyan-400">Interest Total (Upkeep)</span> = (Total Car Value - Deposit Paid) * (Interest % / 100) * Loan Years</li>
                <li><span className="font-semibold text-cyan-400">Ownership Cost/KM</span> = Capital Cost/KM + Interest/KM + Insurance/KM + Service/KM</li>
                <li><span className="font-semibold text-cyan-400">Actual Cost/KM</span> = Ownership Cost/KM + Fuel Cost/KM</li>
                <li className="text-emerald-400 italic">Result: Completely avoids double-counting and factors in the cash you recoup when selling the car at the end of the year assessment.</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* BENTO DASHBOARD: GLOBAL PARAMETERS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Fuel Adjustable Prices Card */}
          <div className="bg-[#0a0c12] border border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-semibold text-white/55 tracking-wider flex items-center gap-1.5 font-display">
                  <Droplet className="h-3.5 w-3.5 text-amber-500" /> Fuel Prices (RM per liter)
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-medium font-mono uppercase tracking-wider">ADJUSTABLE</span>
              </div>
              <p className="text-xs text-white/40 mb-4 font-sans">Set current prices to drive dynamic variables in calculations.</p>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Petrol (L)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-[10px] text-white/30 font-mono">RM</span>
                    <input
                      id="input-petrol-price"
                      type="number"
                      step="0.01"
                      min="0.1"
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 pl-7 pr-1 text-xs font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-right"
                      value={globalParams.petrolPrice}
                      onChange={(e) => updateGlobalParam('petrolPrice', Math.max(0.1, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Diesel (L)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-[10px] text-white/30 font-mono">RM</span>
                    <input
                      id="input-diesel-price"
                      type="number"
                      step="0.01"
                      min="0.1"
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 pl-7 pr-1 text-xs font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-right"
                      value={globalParams.dieselPrice}
                      onChange={(e) => updateGlobalParam('dieselPrice', Math.max(0.1, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Electric (kWh)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-[10px] text-white/30 font-mono">RM</span>
                    <input
                      id="input-electricity-price"
                      type="number"
                      step="0.01"
                      min="0.05"
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 pl-7 pr-1 text-xs font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-right"
                      value={globalParams.electricityPrice ?? 0.8}
                      onChange={(e) => updateGlobalParam('electricityPrice', Math.max(0.01, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[9px] text-white/30 font-mono leading-none">
              <span>Defaults:</span>
              <span>Petrol: RM{envPetrol || '1.99'} | Diesel: RM{envDiesel || '4.87'} | Electricity: RM{envElectricity || '0.80'}</span>
            </div>
          </div>

          {/* Assessment Terms Card */}
          <div className="bg-[#0a0c12] border border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-semibold text-white/55 tracking-wider flex items-center gap-1.5 font-display">
                  <TrendingDown className="h-3.5 w-3.5 text-cyan-400" /> Lifespan & Depreciation Default
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-medium font-mono uppercase tracking-wider">METRICS</span>
              </div>
              <p className="text-xs text-white/40 mb-3 font-sans">Adjust assessment timeframe and travel distance limits.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Years Observed</label>
                  <input
                    id="input-assessment-years"
                    type="number"
                    min="1"
                    max="50"
                    className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    value={globalParams.totalAssessmentYears}
                    onChange={(e) => updateGlobalParam('totalAssessmentYears', Math.max(1, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Accumulated KM</label>
                  <input
                    id="input-assessment-km"
                    type="number"
                    step="5000"
                    min="1000"
                    className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    value={globalParams.totalAssessmentKm}
                    onChange={(e) => updateGlobalParam('totalAssessmentKm', Math.max(1000, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Profiles presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  id="btn-preset-10y"
                  onClick={() => handleApplyProfilePreset(10, 150000)}
                  className={`text-[10px] font-mono tracking-wide uppercase px-2.5 py-1.5 rounded-sm border transition-all ${
                    globalParams.totalAssessmentYears === 10 && globalParams.totalAssessmentKm === 150000
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.02] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  10Y / 150k km (80%)
                </button>
                <button
                  id="btn-preset-5y"
                  onClick={() => handleApplyProfilePreset(5, 100000)}
                  className={`text-[10px] font-mono tracking-wide uppercase px-2.5 py-1.5 rounded-sm border transition-all ${
                    globalParams.totalAssessmentYears === 5 && globalParams.totalAssessmentKm === 100000
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.02] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  5Y / 100k km (50%)
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/30 italic font-mono">
              Calculation profiles based on actual automotive decay rates.
            </div>
          </div>

          {/* Quick Route Trip Simulator */}
          <div className="bg-[#0a0c12] border border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-semibold text-white/55 tracking-wider flex items-center gap-1.5 font-display">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" /> Active Trip Calculator
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-medium font-mono uppercase tracking-wider">SIMULATION</span>
              </div>
              <p className="text-xs text-white/40 mb-4 font-sans">Apply travel mileage to calculate instant passenger cost shares.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Trip Mileage (km)</label>
                  <div className="relative">
                    <input
                      id="input-trip-distance"
                      type="number"
                      min="1"
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                      value={globalParams.tripDistance}
                      onChange={(e) => updateGlobalParam('tripDistance', Math.max(1, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Passengers</label>
                  <div className="relative">
                    <input
                      id="input-passengers"
                      type="number"
                      min="1"
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono font-medium text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                      value={globalParams.passengers}
                      onChange={(e) => updateGlobalParam('passengers', Math.max(1, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-white/35 flex justify-between font-mono">
              <span>Standard Trip:</span>
              <span className="font-mono font-semibold text-cyan-400">{globalParams.tripDistance} km / {globalParams.passengers} Pax</span>
            </div>
          </div>

        </section>

        {/* DYNAMIC SELECTED CAR STATS DASHBOARD */}
        {selectedCarDetails && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#706F69]">Active Focus Lifecycle Summary</span>
                <h3 className="text-lg font-display font-bold text-white tracking-wide">
                  {selectedCarDetails.calc.carName} <span className="text-xs font-mono font-normal text-cyan-400">({selectedCarDetails.origin.fuelType === 'diesel' ? 'Diesel Euro 5' : 'Petrol RON95'})</span>
                </h3>
              </div>
              <div className="text-right text-[10px] font-mono text-white/40">
                LIFESPAN: {globalParams.totalAssessmentKm.toLocaleString()} KM OVER {globalParams.totalAssessmentYears} YEARS
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#0f111a] border border-white/5 rounded-xl py-6 px-4 flex flex-col justify-center items-center relative overflow-hidden shadow-lg h-40">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"></div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Actual Cost / KM</span>
                <span className="text-4xl font-mono font-bold tracking-tight text-white mb-1">
                  RM {selectedCarDetails.calc.actualCostPerKm.toFixed(3)}
                </span>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-mono">Total Net Outlay rate</span>
              </div>

              <div className="bg-[#0f111a] border border-white/5 rounded-xl py-6 px-4 flex flex-col justify-center items-center relative overflow-hidden shadow-lg h-40">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"></div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">{globalParams.totalAssessmentYears}Y Upkeep Cost</span>
                <span className="text-3xl font-mono font-bold tracking-tight text-white mb-1">
                  RM {(selectedCarDetails.calc.ownershipCostPerKm * globalParams.totalAssessmentKm).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-amber-500 uppercase tracking-wider font-mono">Excluding Fuel outlay</span>
              </div>

              <div className="bg-[#0f111a] border border-white/5 rounded-xl py-6 px-4 flex flex-col justify-center items-center relative overflow-hidden shadow-lg h-40">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]"></div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Trip {globalParams.tripDistance}km Share</span>
                <span className="text-3xl font-mono font-bold tracking-tight text-white mb-1">
                  RM {selectedCarDetails.calc.tripCostPerPassenger.toFixed(2)}
                </span>
                <span className="text-[10px] text-blue-400 uppercase tracking-wider font-mono">Per Pax ({globalParams.passengers} passengers)</span>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT LAYOUT */}
        <section className="bg-[#0a0c12] border border-white/5 rounded-xl overflow-hidden shadow-xl mb-8">
          
          {/* TAB BAR HEADER */}
          <div className="border-b border-white/5 bg-[#0f111a]/80 px-6 py-4.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-white/[0.03] p-1 border border-white/5 rounded-lg text-xs font-medium">
              <button
                id="tab-matrix"
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                  activeTab === 'matrix' 
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 shadow-xs' 
                    : 'text-white/40 hover:text-white border border-transparent'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Comparison Matrix
              </button>
              <button
                id="tab-charts"
                onClick={() => setActiveTab('charts')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                  activeTab === 'charts' 
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 shadow-xs' 
                    : 'text-white/40 hover:text-white border border-transparent'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Cost Breakdown Charts
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="btn-export-excel"
                onClick={handleExportToExcel}
                className="px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer"
                title="Export matching simulation matrix to Microsoft Excel with reactive formulas"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export as Excel
              </button>

              <button
                id="btn-add-car"
                onClick={handleCreateCar}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Custom Car
              </button>
            </div>
          </div>

          {/* TAB CONTENT: MATRIX TABLE */}
          {activeTab === 'matrix' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1250px]">
                <thead>
                  <tr className="bg-[#0f111a] text-white/40 text-[10px] font-semibold tracking-wider border-b border-white/5 uppercase font-mono">
                    <th className="py-4 px-6 bg-[#0f111a] sticky left-0 z-5 min-w-[230px] border-r border-white/5">Vehicle Parameters</th>
                    <th className="py-4 px-4 text-center">Efficiency</th>
                    <th className="py-4 px-4 text-center">MPG (US)</th>
                    <th className="py-4 px-4 text-center">Cons. / 100km</th>
                    <th className="py-4 px-4 text-right">Car Value</th>
                    <th className="py-4 px-4 text-right">Resale Value</th>
                    <th className="py-4 px-4 text-right">Fuel / Energy Cost</th>
                    <th className="py-4 px-4 text-right" title="Original Spreadsheet 'Cost to Drive'">Cost to Drive</th>
                    <th className="py-4 px-4 text-right">Interest/KM</th>
                    <th className="py-4 px-4 text-right">Ins./KM</th>
                    <th className="py-4 px-4 text-right">Tax/KM</th>
                    <th className="py-4 px-4 text-right">Service/KM</th>
                    <th className="py-4 px-4 text-right font-bold text-white bg-white/[0.01]">Own. Cost/KM</th>
                    <th className="py-4 px-6 text-right font-bold text-cyan-450 bg-[#0f111a] sticky right-0 z-5 border-l border-white/10 min-w-[120px]">Actual RM/KM</th>
                    <th className="py-4 px-4 text-right">Trip Cost ({globalParams.tripDistance}KM)</th>
                    <th className="py-4 px-4 text-right">Per Pass.</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculatedCars.map((c) => {
                    const originalCar = cars.find(car => car.id === c.carId);
                    const isSelected = selectedCarId === c.carId;
                    
                    return (
                      <tr 
                        key={c.carId} 
                        onClick={() => setSelectedCarId(c.carId)}
                        className={`group cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-950/15 text-white' : 'hover:bg-white/[0.01]/40 text-white/80'
                        }`}
                      >
                        {/* Vehicle Title Column - Sticky Left */}
                        <td className={`py-4 px-6 sticky left-0 z-5 font-medium border-r border-white/5 transition-colors ${
                          isSelected ? 'bg-[#0a0c12] group-hover:bg-[#0e111b]' : 'bg-[#0a0c12]/95 group-hover:bg-[#0f1220]'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-sm border ${
                              originalCar?.fuelType === 'diesel' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                : originalCar?.fuelType === 'electric'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              <CarIcon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="text-sm font-display font-medium text-white flex items-center gap-1.5 flex-wrap">
                                {c.carName}
                                {originalCar?.isSample && (
                                  <span className="text-[8px] px-1.5 py-0.2 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 rounded font-mono uppercase tracking-wider">SEED</span>
                                )}
                              </div>
                              <span className="text-[9px] text-[#706F69] font-mono uppercase flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span>{originalCar?.fuelType}</span>
                                <span>•</span>
                                <span>{originalCar?.fuelType === 'electric' ? 'EV Motor' : `${originalCar?.engineCc ?? 1500}cc`}</span>
                                <span>•</span>
                                <span>{originalCar?.insuranceMode === 'override' ? 'Custom Ins.' : 'Prog. NCD'}</span>
                                <span>•</span>
                                <span>Flat {originalCar?.interestRate}%</span>
                                <span>•</span>
                                <span>{originalCar?.loanTermYears}Y Loan</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Efficiency */}
                        <td className="py-4 px-4 text-center font-mono text-sm text-white/90">
                          {originalCar?.fuelType === 'electric' ? (
                            <>
                              <span className="text-emerald-400 font-semibold font-mono">
                                {(c.efficiencyKmL * (globalParams.petrolPrice / (globalParams.electricityPrice || 0.8))).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-white/40 font-mono block">km/L eq.</span>
                              <span className="text-[10px] text-white/50 block font-mono mt-0.5">
                                ({c.efficiencyKmL.toFixed(1)} km/kWh)
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{c.efficiencyKmL.toFixed(2)}</span>
                              <span className="text-[10px] text-white/40 block font-sans mt-0.5">km/L</span>
                            </>
                          )}
                        </td>

                        {/* MPG */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-white/50">
                          {originalCar?.fuelType === 'electric' ? (
                            <>
                              <span className="text-emerald-400/80 font-mono">
                                {(c.efficiencyKmL * (globalParams.petrolPrice / (globalParams.electricityPrice || 0.8)) * 2.35215).toFixed(1)}
                              </span>
                              <span className="text-[9px] text-white/30 block">MPGe</span>
                              <span className="text-[9px] text-white/40 block mt-0.5">
                                ({(c.efficiencyKmL * 2.35215).toFixed(1)} mi/kWh)
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{c.mpg.toFixed(1)}</span>
                              <span className="text-[9px] text-white/30 block font-sans mt-0.5">MPG</span>
                            </>
                          )}
                        </td>

                        {/* Consumption/100km */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-white/50">
                          {originalCar?.fuelType === 'electric' ? (
                            <>
                              <span className="text-emerald-400/80 font-mono">
                                {(100 / (c.efficiencyKmL * (globalParams.petrolPrice / (globalParams.electricityPrice || 0.8)))).toFixed(2)}
                              </span>
                              <span className="text-[9px] text-[#706F69] block">L/100km eq.</span>
                              <span className="text-[9px] text-white/40 block mt-0.5">
                                ({c.litersPer100Km.toFixed(1)} kWh)
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{c.litersPer100Km.toFixed(2)}</span>
                              <span className="text-[9px] text-white/30 block font-sans mt-0.5">L</span>
                            </>
                          )}
                        </td>

                        {/* Car Value */}
                        <td className="py-4 px-4 text-right font-mono text-sm text-white/90 font-medium">
                          RM {originalCar?.purchasePrice.toLocaleString()}
                        </td>

                        {/* Resale Value */}
                        <td className="py-4 px-4 text-right font-mono text-xs text-white/40">
                          <div className="font-semibold text-white/90">
                            RM {c.resaleValue.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-cyan-400 font-normal">
                            ({originalCar ? Math.round((c.resaleValue / originalCar.purchasePrice) * 100) : 0}% Resale)
                          </span>
                        </td>

                        {/* Fuel Cost / KM */}
                        <td className="py-4 px-4 text-right font-mono text-sm text-amber-400 font-medium">
                          RM {c.fuelCostPerKm.toFixed(3)}
                        </td>

                        {/* Cost to Drive - Capital Depreciation/KM */}
                        <td className="py-4 px-4 text-right font-mono text-sm text-cyan-400 font-medium" title={globalParams.calcMode === 'reference' ? "Spreadsheet Formula: (Car Value + Loan Interest) / 150k km (overlooking resale recovery)" : "Correct Formula: (Car Value + Setup Fees - Resale Value) / 150k km"}>
                          RM {c.capitalCostPerKm.toFixed(3)}
                        </td>

                        {/* Interest / KM */}
                        <td className="py-4 px-4 text-right font-mono text-xs text-blue-400">
                          RM {c.interestCostPerKm.toFixed(3)}
                        </td>

                        {/* Insurance / KM */}
                        <td className="py-4 px-4 text-right font-mono text-xs text-violet-400" title={`Annual Insurance: RM ${c.annualInsurancePremium.toLocaleString()}`}>
                          RM {c.insuranceCostPerKm.toFixed(3)}
                        </td>

                        {/* Road Tax / KM */}
                        <td className="py-4 px-4 text-right font-mono text-xs text-rose-400" title={`Annual Road Tax based on ${c.engineCc}cc: RM ${c.annualRoadTax.toLocaleString()}`}>
                          RM {c.roadTaxCostPerKm.toFixed(3)}
                        </td>

                        {/* Service / KM */}
                        <td className="py-4 px-4 text-right font-mono text-xs text-emerald-400">
                          RM {c.serviceCostPerKm.toFixed(3)}
                        </td>

                        {/* Ownership Cost per KM */}
                        <td className="py-4 px-4 text-right font-mono text-sm font-bold bg-white/[0.01] text-white">
                          RM {c.ownershipCostPerKm.toFixed(3)}
                        </td>

                        {/* Actual RM / KM (CORE STAT) - Sticky Right */}
                        <td className={`py-4 px-6 text-right font-mono text-base font-bold bg-[#0f111a] sticky right-0 z-5 border-l border-white/10 transition-colors ${
                          isSelected ? 'text-cyan-300 bg-[#121c2c]' : 'text-cyan-400 group-hover:bg-[#151c2d]'
                        }`}>
                          RM {c.actualCostPerKm.toFixed(3)}
                        </td>

                        {/* Custom Trip Cost */}
                        <td className="py-4 px-4 text-right font-mono text-sm text-white/90">
                          RM {c.tripCostTotal.toFixed(2)}
                        </td>

                        {/* Cost per Passenger */}
                        <td className="py-4 px-4 text-right font-mono text-sm font-bold text-emerald-400">
                          RM {c.tripCostPerPassenger.toFixed(2)}
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {originalCar && (
                              <button
                                id={`btn-edit-${originalCar.id}`}
                                onClick={(e) => handleStartEdit(originalCar, e)}
                                className="p-1 hover:bg-white/10 hover:text-white rounded text-white/70 border border-white/10 bg-white/[0.02]"
                                title="Edit parameters"
                              >
                                <Edit2 className="h-3 w-3 text-cyan-455" />
                              </button>
                            )}
                            {originalCar && (
                              <button
                                id={`btn-clone-${originalCar.id}`}
                                onClick={(e) => handleCloneCar(originalCar, e)}
                                className="p-1 hover:bg-white/10 rounded text-white/70 border border-white/10 bg-white/[0.02] relative"
                                title="Duplicate vehicle"
                              >
                                {copiedId === originalCar.id ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3 text-cyan-400" />
                                )}
                              </button>
                            )}
                            {!originalCar?.isSample && originalCar && (
                              <button
                                id={`btn-delete-${originalCar.id}`}
                                onClick={(e) => handleDeleteCar(originalCar.id, e)}
                                className="p-1 hover:bg-red-950/40 hover:text-red-400 rounded text-red-400 border border-white/10 bg-white/[0.02]"
                                title="Remove car"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB CONTENT: CHARTS VIEW */}
          {activeTab === 'charts' && (
            <div className="p-6">
              {/* SUB-TABS SELECTOR */}
              <div className="flex bg-[#050608]/80 p-1 border border-white/5 rounded-xl text-xs font-mono font-semibold max-w-fit mb-6 overflow-x-auto gap-1">
                <button
                  id="sub-tab-breakdown"
                  onClick={() => setChartSubTab('breakdown')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartSubTab === 'breakdown' 
                      ? 'bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/20 shadow-xs' 
                      : 'text-white/40 hover:text-white border border-transparent'
                  }`}
                >
                  RM/KM Breakdown
                </button>
                <button
                  id="sub-tab-cumulative"
                  onClick={() => setChartSubTab('cumulative')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartSubTab === 'cumulative' 
                      ? 'bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/20 shadow-xs' 
                      : 'text-white/40 hover:text-white border border-transparent'
                  }`}
                >
                  🔄 Cumulative spend
                </button>
                <button
                  id="sub-tab-yearly-cost"
                  onClick={() => setChartSubTab('yearly_cost')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartSubTab === 'yearly_cost' 
                      ? 'bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/20 shadow-xs' 
                      : 'text-white/40 hover:text-white border border-transparent'
                  }`}
                >
                  📅 Annual Cost (RM/Yr)
                </button>
                <button
                  id="sub-tab-cost-per-km"
                  onClick={() => setChartSubTab('cost_per_km')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartSubTab === 'cost_per_km' 
                      ? 'bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/20 shadow-xs' 
                      : 'text-white/40 hover:text-white border border-transparent'
                  }`}
                >
                  ⚡ Cost per KM (RM/KM)
                </button>
              </div>

              <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-semibold text-white">
                    {chartSubTab === 'breakdown' && "Visual Per-Kilometer Breakdown Comparison"}
                    {chartSubTab === 'cumulative' && "Ownership Lifecycle Cumulative spend (RM)"}
                    {chartSubTab === 'yearly_cost' && "Annual Out-Of-Pocket Expenses Progression (RM/Year)"}
                    {chartSubTab === 'cost_per_km' && "Yearly Cost per Kilometer Progression (RM/KM)"}
                  </h3>
                  <p className="text-xs text-white/40 font-sans mt-1">
                    {chartSubTab === 'breakdown' && "Review exactly what is inflating each vehicle's actual expense rate."}
                    {chartSubTab === 'cumulative' && `Forecast of total spent including purchase deposit and other overheads up to Year ${globalParams.totalAssessmentYears}.`}
                    {chartSubTab === 'yearly_cost' && "Track how running bills drop/change based on progressive NCD insurance discounts and upkeep."}
                    {chartSubTab === 'cost_per_km' && "Examine the dynamic expense rate for each individual year of run."}
                  </p>
                </div>
                
                {chartSubTab === 'breakdown' ? (
                  /* Micro legend */
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono text-white/50">
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" /> Fuel Cost</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#06b6d4]" /> Depreciation/Ovh</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" /> Loan Interest</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#8b5cf6]" /> Insurance</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#10b981]" /> Maintenance</div>
                  </div>
                ) : (
                  /* Micro legend for line charts */
                  <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-[10px] font-mono text-white/70">
                    {cars.map((car, idx) => {
                      const colors = ['#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#a855f7', '#14b8a6'];
                      return (
                        <div key={car.id} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/5 rounded-md px-2 py-0.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                          <span>{car.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RENDER THE ACTIVE CHART */}
              <div className="h-[480px] w-full bg-[#0a0c12]/50 border border-white/5 rounded-xl p-5">
                {chartSubTab === 'breakdown' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 140, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255, 255, 255, 0.15)" label={{ value: 'Cost per Kilometer (RM/KM)', fill: '#888888', position: 'insideBottom', offset: -10 }} tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontFamily: 'monospace' }} />
                      <YAxis dataKey="name" type="category" stroke="rgba(255, 255, 255, 0.15)" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => {
                          const entry = props?.payload;
                          if (entry) {
                            const fuel = entry['Fuel Cost'] || 0;
                            const depr = entry['Depreciation/Overhead'] || 0;
                            const loan = entry['Loan Interest'] || 0;
                            const ins = entry['First Party Insurance'] || 0;
                            const tax = entry['Road Tax'] || 0;
                            const maint = entry['Maintenance Service'] || 0;
                            const total = fuel + depr + loan + ins + tax + maint;
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            return [`RM ${parseFloat(value).toFixed(3)} (${pct})`, name];
                          }
                          return [`RM ${parseFloat(value).toFixed(3)}`, name];
                        }}
                        contentStyle={{ backgroundColor: '#0f111a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Bar dataKey="Fuel Cost" stackId="a" fill={COLORS.fuel}>
                        <LabelList dataKey="Fuel Cost %" position="inside" style={{ fill: '#050608', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                      <Bar dataKey="Depreciation/Overhead" stackId="a" fill={COLORS.depreciation}>
                        <LabelList dataKey="Depreciation/Overhead %" position="inside" style={{ fill: '#050608', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                      <Bar dataKey="Loan Interest" stackId="a" fill={COLORS.interest}>
                        <LabelList dataKey="Loan Interest %" position="inside" style={{ fill: '#ffffff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                      <Bar dataKey="First Party Insurance" stackId="a" fill={COLORS.insurance}>
                        <LabelList dataKey="First Party Insurance %" position="inside" style={{ fill: '#ffffff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                      <Bar dataKey="Road Tax" stackId="a" fill={COLORS.roadTax}>
                        <LabelList dataKey="Road Tax %" position="inside" style={{ fill: '#ffffff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                      <Bar dataKey="Maintenance Service" stackId="a" fill={COLORS.service}>
                        <LabelList dataKey="Maintenance Service %" position="inside" style={{ fill: '#050608', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartSubTab === 'cumulative' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cumulativeChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.15)" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                      <YAxis stroke="rgba(255, 255, 255, 0.15)" tickFormatter={(val) => `RM ${(val/1000).toFixed(0)}k`} tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any) => [`RM ${parseInt(value).toLocaleString()}`, "Total Outlay"]}
                        contentStyle={{ backgroundColor: '#0f111a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#ffffff' }}
                      />
                      {cars.map((car, idx) => {
                        const colors = ['#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#a855f7', '#14b8a6'];
                        return (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartSubTab === 'yearly_cost' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={yearlyExpensesChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.15)" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                      <YAxis stroke="rgba(255, 255, 255, 0.15)" tickFormatter={(val) => `RM ${(val).toLocaleString()}`} tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any) => [`RM ${parseInt(value).toLocaleString()}`, "Yearly Outlay"]}
                        contentStyle={{ backgroundColor: '#0f111a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#ffffff' }}
                      />
                      {cars.map((car, idx) => {
                        const colors = ['#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#a855f7', '#14b8a6'];
                        return (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartSubTab === 'cost_per_km' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={yearlyCostPerKmChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.15)" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                      <YAxis stroke="rgba(255, 255, 255, 0.15)" tickFormatter={(val) => `RM ${parseFloat(val).toFixed(2)}`} tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontFamily: 'monospace' }} />
                      <Tooltip 
                        formatter={(value: any) => [`RM ${parseFloat(value).toFixed(3)}`, "Cost/KM"]}
                        contentStyle={{ backgroundColor: '#0f111a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#ffffff' }}
                      />
                      {cars.map((car, idx) => {
                        const colors = ['#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#a855f7', '#14b8a6'];
                        return (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* DUAL STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-white/5">
                <div>
                  <h4 className="text-xs uppercase font-semibold text-white/50 tracking-wider mb-4 flex items-center gap-1.5 font-mono">
                    <Coins className="h-4 w-4 text-emerald-400" /> Ultimate Roadtrip Economics ({globalParams.tripDistance} km)
                  </h4>
                  <div className="space-y-3">
                    {calculatedCars.map(c => (
                      <div key={c.carId} className="flex items-center justify-between p-3 bg-white/[0.01]/30 border border-white/5 rounded-lg">
                        <span className="text-xs font-semibold text-white/80">{c.carName}</span>
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-white">RM {c.tripCostTotal.toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-400 font-mono font-medium">RM {c.tripCostPerPassenger.toFixed(2)} per pass. ({globalParams.passengers} pax)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-950/20 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5 mb-2 font-display">
                       Aesthetic/Economic Insight
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed font-sans">
                      This calculator reveals the <strong className="text-amber-300 font-semibold">unseen cost breakdown</strong> of vehicle ownership. While entry models like the Saga/Bezza or Axia might incur fuel charges similar to high-segment hybrids, executive and premium cars suffer dramatic financial friction from <strong className="text-amber-300 font-semibold">capital depreciation</strong> and <strong className="text-amber-300 font-semibold font-mono">flat-rate interest packages</strong>.
                      <br /><br />
                      In fact, over 10 Years and 150,000 KM under Reference Mode, a RM180,000 executive car's interest bill alone is RM32,076 (about RM0.21/KM)—which exceeds the Axia's entire fuel bill of RM0.117/KM!
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-500/10 text-[11px] text-amber-400/80 italic font-mono">
                    Use &ldquo;True Economic Math&rdquo; to factor in resale value recovery and correct the overall budget metrics score.
                  </div>
                </div>
              </div>

            </div>
          )}

        </section>

        {/* SIDE DRAWER FOR NEW CAR AND EDITING CAR OVERLAYS */}
        <AnimatePresence>
          {editingCar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#050608]/75 backdrop-blur-md flex justify-end z-50 p-0 md:p-4"
              onClick={() => setEditingCar(null)}
            >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-lg bg-[#0e111b] h-full md:h-[calc(100vh-2rem)] md:rounded-xl shadow-2xl border border-white/10 flex flex-col justify-between overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Card Title */}
                <div className="border-b border-white/5 bg-[#0a0c12]/95 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-display font-semibold text-white">
                      {isAddingNew ? 'Add Custom Comparison Car' : `Adjust Properties: ${editingCar.name}`}
                    </h3>
                    <p className="text-xs text-white/40">Modify parameters to evaluate financial configurations.</p>
                  </div>
                  <button 
                    onClick={() => setEditingCar(null)}
                    className="p-1 hover:bg-white/5 rounded-lg transition-colors text-xs font-semibold px-2.5 border border-white/10 text-white/70"
                  >
                    Cancel
                  </button>
                </div>

                {/* Form fields */}
                <form id="form-car-editor" onSubmit={handleSaveCarDetails} className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0e111b]">
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Vehicle Model Name</label>
                    <input
                      id="edit-car-name"
                      type="text"
                      required
                      className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                      value={editingCar.name}
                      onChange={(e) => setEditingCar({ ...editingCar, name: e.target.value })}
                    />
                  </div>

                  {/* Fuel Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">
                        {editingCar.fuelType === 'electric' ? 'Efficiency (km/kWh)' : 'Fuel Efficiency (km/L)'}
                      </label>
                      <input
                        id="edit-car-efficiency"
                        type="number"
                        step="0.01"
                        required
                        min="0.1"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.fuelEfficiency}
                        onChange={(e) => setEditingCar({ ...editingCar, fuelEfficiency: Math.max(0.1, parseFloat(e.target.value) || 0) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Fuel / Energy Type</label>
                      <select
                        id="edit-car-fueltype"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all [&>option]:bg-[#0e111b]"
                        value={editingCar.fuelType}
                        onChange={(e) => {
                          const val = e.target.value as FuelType;
                          // If switching to electric, default engineCc to 0
                          setEditingCar({ 
                            ...editingCar, 
                            fuelType: val,
                            engineCc: val === 'electric' ? 0 : (editingCar.engineCc === 0 ? 1500 : editingCar.engineCc)
                          });
                        }}
                      >
                        <option value="petrol">Petrol (RON95)</option>
                        <option value="diesel">Diesel (Euro 5)</option>
                        <option value="electric">Electric (EV)</option>
                      </select>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Purchase Finance Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Purchase Sticker Price (RM)</label>
                      <input
                        id="edit-car-price"
                        type="number"
                        required
                        min="0"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.purchasePrice}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          // Auto calculate standard 10% deposit
                          setEditingCar({ 
                            ...editingCar, 
                            purchasePrice: val,
                            depositAmount: Math.round(val * 0.1)
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Deposit (RM)</label>
                      <input
                        id="edit-car-deposit"
                        type="number"
                        required
                        min="0"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.depositAmount}
                        onChange={(e) => setEditingCar({ ...editingCar, depositAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  </div>

                  {/* Upfront repairs & Resale Override Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Upfront Repair / Options (RM)</label>
                      <input
                        id="edit-car-othercosts"
                        type="number"
                        min="0"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.otherCosts}
                        onChange={(e) => setEditingCar({ ...editingCar, otherCosts: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="e.g. Repairs/Purchases"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Resale Override (RM)</label>
                      <div className="relative">
                        <input
                          id="edit-car-resale"
                          type="number"
                          min="0"
                          className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          value={editingCar.resaleValueOverride === null ? '' : editingCar.resaleValueOverride}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0);
                            setEditingCar({ ...editingCar, resaleValueOverride: val });
                          }}
                          placeholder="Autocalculate"
                        />
                      </div>
                      <span className="text-[9px] text-white/30 font-mono tracking-tight">Leave blank to use global depreciation rates.</span>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Interest terms Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Loan Interest Rate (% Flat)</label>
                      <div className="relative">
                        <input
                          id="edit-car-interest"
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 pr-8 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          value={editingCar.interestRate}
                          onChange={(e) => setEditingCar({ ...editingCar, interestRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-white/40 font-semibold font-mono">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Loan Term (Yrs)</label>
                      <input
                        id="edit-car-term"
                        type="number"
                        required
                        min="1"
                        max="30"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.loanTermYears}
                        onChange={(e) => setEditingCar({ ...editingCar, loanTermYears: Math.max(1, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Road Tax & Engine CC Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">
                        {editingCar.fuelType === 'electric' ? 'Engine Capacity (N/A)' : 'Engine Capacity'}
                      </label>
                      <div className="relative">
                        <input
                          id="edit-car-cc"
                          type="number"
                          disabled={editingCar.fuelType === 'electric'}
                          required={editingCar.fuelType !== 'electric'}
                          min="100"
                          max="12000"
                          className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 pr-8 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all disabled:opacity-40"
                          value={editingCar.fuelType === 'electric' ? 0 : (editingCar.engineCc ?? 1500)}
                          onChange={(e) => setEditingCar({ ...editingCar, engineCc: editingCar.fuelType === 'electric' ? 0 : Math.max(100, parseInt(e.target.value) || 0) })}
                          placeholder={editingCar.fuelType === 'electric' ? 'N/A' : 'e.g. 1500'}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-white/40 font-semibold font-mono">cc</span>
                      </div>
                      <span className="text-[9px] text-white/30 font-mono tracking-tight block mt-1">
                        {editingCar.fuelType === 'electric' 
                          ? '⚡ EVs qualify for minimal progressive Road Tax bracket (RM20/year equivalent).' 
                          : 'Determines tiered Malaysian Road Tax.'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Upkeep / Service rate per 10k KM</label>
                      <input
                        id="edit-car-service"
                        type="number"
                        required
                        min="0"
                        className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        value={editingCar.serviceCostPer10k}
                        onChange={(e) => setEditingCar({ ...editingCar, serviceCostPer10k: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Malaysia Insurance configuration */}
                  <div className="space-y-4">
                    <h3 className="text-white/80 text-[11px] font-mono uppercase tracking-wider">Malaysia First-Party Insurance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Premium Calculation</label>
                        <select
                          className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          value={editingCar.insuranceMode ?? 'formula'}
                          onChange={(e) => setEditingCar({ ...editingCar, insuranceMode: e.target.value as 'formula' | 'override' })}
                        >
                          <option value="formula">Formulated tariff estimate</option>
                          <option value="override">Override with actual premium</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Malaysian NCD progression</label>
                        <div className="bg-[#101b2b]/30 border border-cyan-500/10 rounded-lg p-2.5 space-y-1">
                          <span className="text-[10px] text-cyan-400 font-mono block">Dynamic Lifecycle NCD Ladder:</span>
                          <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono text-white/60">
                            <div>Yr 1: <strong className="text-cyan-400">0%</strong></div>
                            <div>Yr 2: <strong className="text-cyan-400">25%</strong></div>
                            <div>Yr 3: <strong className="text-cyan-400">30%</strong></div>
                            <div>Yr 4: <strong className="text-cyan-400">38.3%</strong></div>
                            <div>Yr 5: <strong className="text-cyan-400">45%</strong></div>
                            <div>Yr 6+: <strong className="text-cyan-400">55%</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(editingCar.insuranceMode ?? 'formula') === 'override' ? (
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5 font-mono">Custom Annual Premium (RM/yr)</label>
                        <input
                          id="edit-car-insurance"
                          type="number"
                          required
                          min="0"
                          className="w-full bg-[#050608]/60 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          value={editingCar.annualInsurance}
                          onChange={(e) => setEditingCar({ ...editingCar, annualInsurance: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                    ) : (
                      <div className="bg-[#101b2b]/30 border border-cyan-500/10 rounded-lg p-3">
                        <span className="text-[10px] text-cyan-400 font-mono block">West Malaysia private car tariff assessment formula:</span>
                        <span className="text-xs text-white/70 font-sans block mt-1">
                          Base rate RM339.20 up to RM20K purchase sum insured + RM26.00 per RM1,000 exceeding RM20K.
                        </span>
                      </div>
                    )}
                  </div>

                </form>

                {/* Confirm footer */}
                <div className="border-t border-white/5 bg-[#0a0c12]/95 px-6 py-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingCar(null)}
                    className="px-4 py-2 bg-transparent hover:bg-white/5 text-white/70 border border-white/15 rounded-lg text-xs font-semibold transition-colors font-mono uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="form-car-editor"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                  >
                    Apply Parameters
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER COLOFON */}
      <footer className="border-t border-white/5 bg-[#050608] py-8 text-center text-xs text-white/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="mb-2">Car Cost Calculator — Re-engineered to premium high-contrast hyper-responsive specifications.</p>
          <p className="font-mono text-[10px] text-white/20">Dynamic setup rates: Petrol 1.99 RM/L • Diesel 4.87 RM/L. Model computational framework updated May 2026.</p>
        </div>
      </footer>
    </div>
  );
}
