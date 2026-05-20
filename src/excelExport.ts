import ExcelJS from 'exceljs';
import { Car, GlobalParams } from './types';
import { calculateCarCost } from './utils';

/**
 * Generates an Excel spreadsheet (.xlsx) with interactive formulas
 * matching the CarCost calculator rules.
 */
export const exportToExcel = async (cars: Car[], params: GlobalParams) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Lifecycle Cost Analysis');

  // Ensure gridlines are visible for premium spreadsheet look
  worksheet.views = [{ showGridLines: true }];

  // 1. App Header Title Block (across Col A to AG)
  worksheet.mergeCells('A1:AG1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '🚗 AUTOMOTIVE LIFECYCLE ECONOMICS COMPARISON MATRIX (MALAYSIA)';
  titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A0C12' }, // Matches deep charcoal theme setup
  };
  worksheet.getRow(1).height = 42;

  // 2. Parameters Dashboard Block
  worksheet.getCell('A3').value = 'Economic Parameter Input Dashboard (Adjustable)';
  worksheet.getCell('A3').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  worksheet.mergeCells('A3:D3');

  const paramDefinitions = [
    { label: 'Petrol RON95 Price (RM/L)', key: 'petrolPrice', val: params.petrolPrice, fmt: '"RM" 0.00', cellLab: 'A4', cellVal: 'B4' },
    { label: 'Diesel Euro 5 Price (RM/L)', key: 'dieselPrice', val: params.dieselPrice, fmt: '"RM" 0.00', cellLab: 'A5', cellVal: 'B5' },
    { label: 'Asset Assessment Lifespan (Years)', key: 'totalAssessmentYears', val: params.totalAssessmentYears, fmt: '#,##0', cellLab: 'A6', cellVal: 'B6' },
    { label: 'Operational Distance Base (KM)', key: 'totalAssessmentKm', val: params.totalAssessmentKm, fmt: '#,##0', cellLab: 'A7', cellVal: 'B7' },
    { label: 'Trip Evaluation Distance (KM)', key: 'tripDistance', val: params.tripDistance, fmt: '#,##0', cellLab: 'A8', cellVal: 'B8' },
    { label: 'Trip Passenger Seating Load (Pax)', key: 'passengers', val: params.passengers, fmt: '#,##0', cellLab: 'A9', cellVal: 'B9' },
    { label: 'Active Calculation Methodology', key: 'calcMode', val: params.calcMode, fmt: '@', cellLab: 'A10', cellVal: 'B10' },
    { label: 'Electricity Price (RM/kWh)', key: 'electricityPrice', val: params.electricityPrice ?? 0.8, fmt: '"RM" 0.00', cellLab: 'A11', cellVal: 'B11' },
  ];

  paramDefinitions.forEach((p) => {
    worksheet.getCell(p.cellLab).value = p.label;
    worksheet.getCell(p.cellLab).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
    worksheet.getCell(p.cellLab).alignment = { horizontal: 'right', vertical: 'middle' };

    const valCell = worksheet.getCell(p.cellVal);
    valCell.value = p.val;
    valCell.font = { name: 'Segoe UI', size: 10, bold: true };
    valCell.alignment = { horizontal: p.key === 'calcMode' ? 'left' : 'right', vertical: 'middle' };
    valCell.numFmt = p.fmt;
    valCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }, // Gray highlighted input cells
    };
    valCell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  worksheet.getRow(3).height = 20;
  for (let r = 4; r <= 11; r++) {
    worksheet.getRow(r).height = 19;
  }

  // 3. Grid headers creation at Row 13 (Total 33 columns)
  const headerRow = worksheet.getRow(13);
  headerRow.values = [
    'Vehicle Model Name',              // Col A (1)
    'Fuel Type',                      // Col B (2)
    'Efficiency (km/L or km/kWh)',     // Col C (3)
    'MPG (US or MPGe)',               // Col D (4)
    'Consumption/100km (L or kWh)',    // Col E (5)
    'Purchase Price (RM)',            // Col F (6)
    'Upfront Deposit (RM)',           // Col G (7)
    'Upfront Repair/Fees (RM)',       // Col H (8)
    'Engine Capacity (cc)',           // Col I (9)  - NEW!
    'Annual Road Tax (RM)',           // Col J (10) - NEW! (formula-based)
    'Insurance Mode',                 // Col K (11) - NEW! ("formula" | "override")
    'NCD (%)',                        // Col L (12) - NEW! (0, 25, 30, 38.33, 45, 55)
    'Expected Insurance (RM)',        // Col M (13) - NEW! (formula-based)
    'Custom Ins Override (RM)',       // Col N (14) - NEW!
    'Service Per 10k KM (RM)',        // Col O (15) (previously Col J)
    'Loan Term (Yrs)',                // Col P (16) (previously Col K)
    'Flat Interest Rate (%)',         // Col Q (17) (previously Col L)
    'Resale Value (RM)',              // Col R (18) (previously Col M)
    'Resale Override (RM)',           // Col S (19) (previously Col N)
    'Total Car Value (RM)',           // Col T (20)
    'Loan Amount (RM)',               // Col U (21)
    'Interest Total (RM)',            // Col V (22)
    'Fuel Cost/KM',                   // Col W (23)
    'Interest/KM',                    // Col X (24)
    'Insurance/KM',                   // Col Y (25)
    'Road Tax/KM',                    // Col Z (26) - NEW!
    'Repairs/KM',                     // Col AA (27)
    'Service/KM',                     // Col AB (28)
    'Own. Capital/KM',                // Col AC (29)
    'Own. Cost/KM',                   // Col AD (30)
    'Actual RM/KM',                   // Col AE (31)
    `Trip Cost (${params.tripDistance}km)`, // Col AF (32)
    'Trip Cost Per Pax'               // Col AG (33)
  ];
  headerRow.height = 36;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    
    // Color band categorization of headers
    if (colNumber <= 5) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
    } else if (colNumber <= 14) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Rich Dark Blue
    } else if (colNumber <= 19) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Muted Blue Gray
    } else if (colNumber <= 30) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; // Soft Charcoal
    } else if (colNumber === 31) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Vivid Blue focus
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }; // Safe Travel Green
    }
  });

  // 4. Feed comparing data models
  cars.forEach((car, idx) => {
    const rowIdx = 14 + idx;
    const calc = calculateCarCost(car, params);
    const row = worksheet.getRow(rowIdx);

    // Car physical attributes and purchase inputs (Direct overrides populate, else fallback bounds)
    row.getCell(1).value = car.name;                             // A
    row.getCell(2).value = car.fuelType;                         // B
    row.getCell(3).value = car.fuelEfficiency;                   // C

    // D: MPG (US) Formula
    row.getCell(4).value = { formula: `C${rowIdx}*2.35215`, result: calc.mpg };
    
    // E: L/100km Formula
    row.getCell(5).value = { formula: `IF(C${rowIdx}>0, 100/C${rowIdx}, 0)`, result: calc.litersPer100Km };

    row.getCell(6).value = car.purchasePrice;                    // F
    row.getCell(7).value = car.depositAmount;                    // G
    row.getCell(8).value = car.otherCosts;                       // H
    row.getCell(9).value = car.engineCc ?? 1500;                 // I

    // J: Malaysia Road Tax Nested IF Tiered Formula
    // Tiered calculations based on user capacity cc input row
    row.getCell(10).value = {
      formula: `IF(I${rowIdx}<=1000, 20, IF(I${rowIdx}<=1200, 55, IF(I${rowIdx}<=1400, 70, IF(I${rowIdx}<=1600, 90, IF(I${rowIdx}<=1800, 200+(I${rowIdx}-1600)*0.4, IF(I${rowIdx}<=2000, 280+(I${rowIdx}-1800)*0.5, IF(I${rowIdx}<=2500, 380+(I${rowIdx}-2000)*1, IF(I${rowIdx}<=3000, 880+(I${rowIdx}-2500)*2.5, 2130+(I${rowIdx}-3000)*4.5))))))))`,
      result: calc.annualRoadTax
    };

    row.getCell(11).value = car.insuranceMode ?? 'formula';      // K
    row.getCell(12).value = (car.ncdPct ?? 55) / 100;            // L (stored as fraction for neat percentage)
    
    // M: Estimated Insurance Premium Formula using West Malaysia private Tariff framework with progressive NCD over the assessment lifespan (0% Year 1, up to 55% at Year 5/6)
    row.getCell(13).value = {
      formula: `IF(K${rowIdx}="override", N${rowIdx}, (IF(F${rowIdx}>20000, 339.20+ROUNDUP((F${rowIdx}-20000)/1000,0)*26, MAX(150, (F${rowIdx}/20000)*339.20)))) * ((MIN(1,$B$6)*1 + MAX(0,MIN(1,$B$6-1))*0.75 + MAX(0,MIN(1,$B$6-2))*0.70 + MAX(0,MIN(1,$B$6-3))*0.6167 + MAX(0,MIN(1,$B$6-4))*0.55 + MAX(0,$B$6-5)*0.45)/$B$6)`,
      result: calc.annualInsurancePremium
    };

    row.getCell(14).value = car.annualInsurance;                 // N (Custom override premium input)
    row.getCell(15).value = car.serviceCostPer10k;               // O
    row.getCell(16).value = car.loanTermYears;                   // P
    row.getCell(17).value = car.interestRate / 100;              // Q (fraction format for %)

    // R: Resale Value (decay profile / custom S value reference)
    row.getCell(18).value = {
      formula: `IF(ISNUMBER(S${rowIdx}), S${rowIdx}, IF($B$6=10, F${rowIdx}*0.2, IF($B$6=5, F${rowIdx}*0.5, F${rowIdx}*MAX(0.1, 1-(0.08*$B$6)))))`,
      result: calc.resaleValue
    };

    row.getCell(19).value = car.resaleValueOverride;             // S

    // T: Total Car Value Formula
    row.getCell(20).value = { formula: `F${rowIdx}+G${rowIdx}+H${rowIdx}`, result: calc.totalCarValue };

    // U: Loan Amount Formula
    row.getCell(21).value = { formula: `MAX(0, T${rowIdx}-G${rowIdx})`, result: calc.loanAmount };

    // V: Interest Total Formula
    row.getCell(22).value = { formula: `U${rowIdx}*Q${rowIdx}*P${rowIdx}`, result: calc.interestTotal };

    // W: Fuel Upkeep cost per KM
    row.getCell(23).value = {
      formula: `IF(C${rowIdx}>0, IF(B${rowIdx}="diesel", $B$5, IF(B${rowIdx}="electric", $B$11, $B$4))/C${rowIdx}, 0)`,
      result: calc.fuelCostPerKm
    };

    // X: Interest cost per KM
    row.getCell(24).value = { formula: `V${rowIdx}/$B$7`, result: calc.interestCostPerKm };

    // Y: Insurance cost per KM
    row.getCell(25).value = { formula: `(M${rowIdx}*$B$6)/$B$7`, result: calc.insuranceCostPerKm };

    // Z: Road Tax cost per KM
    row.getCell(26).value = { formula: `(J${rowIdx}*$B$6)/$B$7`, result: calc.roadTaxCostPerKm };

    // AA: Repairs cost per KM
    row.getCell(27).value = { formula: `H${rowIdx}/$B$7`, result: calc.repairsCostPerKm };

    // AB: Maintenance Service cost per KM
    row.getCell(28).value = { formula: `O${rowIdx}/10000`, result: calc.serviceCostPerKm };

    // AC: Driving Capital cost per KM (handles 'reference' vs 'true_economic' option cell $B$10)
    row.getCell(29).value = {
      formula: `IF($B$10="reference", (F${rowIdx}+V${rowIdx})/$B$7, (F${rowIdx}-R${rowIdx}+H${rowIdx})/$B$7)`,
      result: calc.capitalCostPerKm
    };

    // AD: Ownership Cost Accumulation Per KM
    row.getCell(30).value = { formula: `AC${rowIdx}+X${rowIdx}+Y${rowIdx}+Z${rowIdx}+AB${rowIdx}`, result: calc.ownershipCostPerKm };

    // AE: Critical Combined True Cost Per KM RM
    row.getCell(31).value = { formula: `AD${rowIdx}+W${rowIdx}`, result: calc.actualCostPerKm };

    // AF: Projected Overall Custom Ticket Trip Cost
    row.getCell(32).value = { formula: `AE${rowIdx}*$B$8`, result: calc.tripCostTotal };

    // AG: Share fare cost divided by passenger capacity cell $B$9
    row.getCell(33).value = { formula: `IF($B$9>0, AF${rowIdx}/$B$9, AF${rowIdx})`, result: calc.tripCostPerPassenger };

    // Beautiful Layout configuration per cell to make rows beautiful
    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: colNumber === 1 || colNumber === 2 || colNumber === 11 ? 'left' : 'right' 
      };

      // Bordering lines
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Zebra striping highlights
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Model Name highlight text
      if (colNumber === 1) {
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
      }

      // Total RM/KM main rating column focus (AE = 31)
      if (colNumber === 31) {
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0284C7' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F9FF' } // Ambient light cyan background
        };
      }

      // Cost per passenger highlight column focus (AG = 33)
      if (colNumber === 33) {
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF047857' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFECFDF5' } // Velvet travel green background
        };
      }

      // Format masks
      if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
        cell.numFmt = '0.00';
      } else if (colNumber === 6 || colNumber === 7 || colNumber === 8 || colNumber === 10 || colNumber === 13 || colNumber === 14 || colNumber === 15 || colNumber === 18 || colNumber === 19 || colNumber === 20 || colNumber === 21 || colNumber === 22) {
        cell.numFmt = '"RM" #,##0';
      } else if (colNumber === 9 || colNumber === 16) {
        cell.numFmt = '#,##0';
      } else if (colNumber === 12 || colNumber === 17) {
        cell.numFmt = '0.00"%"';
      } else if (colNumber >= 23 && colNumber <= 31) {
        cell.numFmt = '"RM" 0.000';
      } else if (colNumber === 32 || colNumber === 33) {
        cell.numFmt = '"RM" #,##0.00';
      }
    });
  });

  // 5. Dynamic Footnoting Instruction text block at the bottom
  const footnoteStartRow = 14 + cars.length + 3;
  
  worksheet.getCell(`A${footnoteStartRow}`).value = '💡 DYNAMIC LIFECYCLE SPREADSHEET MANUAL & GUIDELINES:';
  worksheet.getCell(`A${footnoteStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  worksheet.mergeCells(`A${footnoteStartRow}:H${footnoteStartRow}`);

  const instructions = [
    '• COMPLIANT ROAD TAX SCALE: Road Tax (Col J) recalculates immediately when changing Engine Capacity (Col I) using active tiered road tax rules (RM20 to RM2130+ progressive components standard).',
    '• MALAYSIAN NCD OPTIONS: Insurance Premium (Col M) uses standard West Malaysia Tariff, dynamically and progressively calculating NCD for each year (0% Year 1, escalating to 55% at Year 5/6 and onwards) averaged across the assessment lifespan (cell B6). Pick "override" in Col K to manually force Custom inputs (Col N).',
    '• METHODOLOGY SPEC: Methodology parameter toggle (cell B10) supports "reference" (duplicate of simple sheets) or "true_economic" (depreciation resale offsets).',
    '• DIRECT TRIPS: Trip Cost cells dynamically pull values from distance and passenger volume configurations defined inside the Parameter dashboard at the top (cells B8 & B9).'
  ];

  instructions.forEach((inst, i) => {
    const rNum = footnoteStartRow + 1 + i;
    worksheet.getCell(`A${rNum}`).value = inst;
    worksheet.getCell(`A${rNum}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
    worksheet.mergeCells(`A${rNum}:V${rNum}`);
  });

  // 6. Professional column width alignments
  worksheet.columns.forEach((column, colIdx) => {
    if (colIdx === 0) {
      column.width = 24; // Model name width
    } else {
      let maxLen = 10;
      column.eachCell({ includeEmpty: false }, (cell) => {
        let valString = '';
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'formula' in cell.value) {
            valString = cell.value.result ? cell.value.result.toString() : '';
          } else {
            valString = cell.value.toString();
          }
        }
        if (valString.length > maxLen) {
          maxLen = valString.length;
        }
      });
      // Safety bounds to prevent extreme columns packing
      column.width = Math.min(26, Math.max(12, maxLen + 3.5));
    }
  });

  // Trigger browser download of compiled xlsx binary buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Car_Cost_Lifecycle_Economics_${params.calcMode}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
