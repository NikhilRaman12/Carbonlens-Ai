/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarbonCategory, CarbonEntry } from '../types';

/**
 * Calculates current week's total carbon emissions in kg CO2e
 */
export function getThisWeekTotalCO2e(entries: CarbonEntry[]): number {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  return entries
    .filter((e) => {
      const entryDate = new Date(e.date);
      return entryDate >= sevenDaysAgo && entryDate <= today;
    })
    .reduce((sum, e) => sum + e.co2e, 0);
}

/**
 * Calculates weekly carbon savings (kg CO2e) relative to the monthly baseline budget
 */
export function calculateCO2eWeeklySavings(entries: CarbonEntry[], baselineMonthly: number): number {
  const weeklyBaseline = baselineMonthly / 4.33; // average weeks in a month
  const weeklyLogged = getThisWeekTotalCO2e(entries);
  
  // If user emitted less than baseline, that difference is their savings. 
  // Otherwise savings are 0 (or negative if they prefer to display overshoot). 
  // We clamp it at 0 minimum for positive feedback, or return exact saving trend.
  const savings = weeklyBaseline - weeklyLogged;
  return parseFloat(Math.max(0, savings).toFixed(2));
}

/**
 * Identifies the top emission source category and total emission amount
 */
export function getTopEmissionCategory(entries: CarbonEntry[]): { category: CarbonCategory; co2e: number } {
  const categoryTotals: Record<CarbonCategory, number> = {
    Transport: 0,
    Electricity: 0,
    'Food & Household': 0,
    Water: 0,
    'Phone & Internet': 0,
    Recycling: 0,
    Gas: 0,
    Waste: 0,
  };

  entries.forEach((e) => {
    if (e.category === 'Recycling') {
      // Recycling counts as offset, so omit direct emission ranking or subtract
      // We focus on top DIRECT emission categories for positive actions
    } else {
      categoryTotals[e.category] += Math.max(0, e.co2e);
    }
  });

  let topCategory: CarbonCategory = 'Transport';
  let maxCO2e = 0;

  (Object.keys(categoryTotals) as CarbonCategory[]).forEach((cat) => {
    if (categoryTotals[cat] > maxCO2e) {
      maxCO2e = categoryTotals[cat];
      topCategory = cat;
    }
  });

  return { category: topCategory, co2e: parseFloat(maxCO2e.toFixed(2)) };
}

/**
 * Robust timezone helper to get current local day split details
 */
export function getLocalTodayDate() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate()
  };
}

/**
 * Unified helper to calculate today's total footprint
 */
export function getTodayTotalCO2e(entries: CarbonEntry[]): number {
  const { year, month, day } = getLocalTodayDate();
  return entries
    .filter((e) => {
      const parts = e.date.split('-');
      if (parts.length !== 3) return false;
      return parseInt(parts[0], 10) === year &&
             (parseInt(parts[1], 10) - 1) === month &&
             parseInt(parts[2], 10) === day;
    })
    .reduce((sum, e) => sum + e.co2e, 0);
}

/**
 * Unified helper to calculate this month's total footprint
 */
export function getMonthlyTotalCO2e(entries: CarbonEntry[]): number {
  const { year, month } = getLocalTodayDate();
  return entries
    .filter((e) => {
      const parts = e.date.split('-');
      if (parts.length !== 3) return false;
      return parseInt(parts[0], 10) === year &&
             (parseInt(parts[1], 10) - 1) === month;
    })
    .reduce((sum, e) => sum + e.co2e, 0);
}

export interface EnvironmentalEquivalencies {
  treesEquivalent: number;      // number of tree-months (1 tree absorbs ~1.83kg CO2e per month)
  gasolineSavedLiters: number;  // 1 liter gasoline = 2.31 kg CO2
  ledHoursRun: number;          // 1 hour run of a 10W LED bulb consumes 0.01 kWh -> (Grid avg 0.71 kg/kWh = 0.0071 kg)
  coalAvoidedKg: number;        // ~2.1 kg of CO2 per kg of coal burned
}

/**
 * Translates saved CO2e (kg) into human-scale, tangible environmental outcome metrics
 */
export function calculateEnvironmentalEquivalencies(co2eSavedKg: number): EnvironmentalEquivalencies {
  const positiveSaved = Math.max(0, co2eSavedKg);
  return {
    treesEquivalent: parseFloat((positiveSaved / 1.833).toFixed(1)),
    gasolineSavedLiters: parseFloat((positiveSaved / 2.31).toFixed(1)),
    ledHoursRun: parseFloat((positiveSaved / 0.0071).toFixed(0)),
    coalAvoidedKg: parseFloat((positiveSaved / 2.1).toFixed(1))
  };
}

export interface PersonalizedAction {
  title: string;
  savedKg: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  costImpact: 'High Saving' | 'Medium Saving' | 'Neutral' | 'Low Cost';
  timeRequired: string;
  whyFits: string;
  category: CarbonCategory;
}

/**
 * Master collection of high-integrity localized actions across categories
 */
export const MASTER_REDUCTION_ACTIONS: Record<CarbonCategory, PersonalizedAction> = {
  Transport: {
    category: 'Transport',
    title: 'Swap Short Solo Vehicle Trips with Bus or Metro Lines',
    savedKg: 18.5,
    difficulty: 'Easy',
    costImpact: 'High Saving',
    timeRequired: 'Daily habits',
    whyFits: 'Transport represents your highest emission footprint. Transitioning commute routines yields massive individual fuel reductions.'
  },
  Electricity: {
    category: 'Electricity',
    title: 'Set AC Thermostat at 24°C Coupled with a Ceiling Fan',
    savedKg: 12.0,
    difficulty: 'Easy',
    costImpact: 'High Saving',
    timeRequired: 'Immediate action',
    whyFits: 'Grid average electricity carries peak emission coefficient loads. Elevating setting temperatures lowers operational times.'
  },
  'Food & Household': {
    category: 'Food & Household',
    title: 'Incorporate 2 Vegan or Plant-Based Meal Days Weekly',
    savedKg: 15.0,
    difficulty: 'Medium',
    costImpact: 'Medium Saving',
    timeRequired: '30 mins prep',
    whyFits: 'Imported groceries and dairy processing generate substantial carbon overheads compared to fresh regional grains.'
  },
  Water: {
    category: 'Water',
    title: 'Install Dual-Spray Water Aerators on Vanity Taps',
    savedKg: 5.2,
    difficulty: 'Easy',
    costImpact: 'Medium Saving',
    timeRequired: '10 min install',
    whyFits: 'Pumping systems and filtration are high electricity consumers; trimming water quantities lowers indirect grid drain.'
  },
  'Phone & Internet': {
    category: 'Phone & Internet',
    title: 'De-Clutter Redundant Files and Download Streams on Wi-Fi',
    savedKg: 4.5,
    difficulty: 'Easy',
    costImpact: 'Neutral',
    timeRequired: '1 min habit',
    whyFits: 'High-definition telecommunication transfers over mobile data arrays force servers and cell towers to run refrigeration equipment continuously.'
  },
  Gas: {
    category: 'Gas',
    title: 'Cover Boiling Vessels with Lids and Pre-soak Legumes',
    savedKg: 8.4,
    difficulty: 'Easy',
    costImpact: 'Medium Saving',
    timeRequired: 'Daily habit',
    whyFits: 'Sealing cook pots concentrates thermal energy, cooking meals up to 30% faster with less LPG gas burned.'
  },
  Waste: {
    category: 'Waste',
    title: 'Commence Kitchen Segregation and Back-door Composting',
    savedKg: 6.2,
    difficulty: 'Medium',
    costImpact: 'Neutral',
    timeRequired: 'Daily sorting',
    whyFits: 'Anaerobic landfill decay of organic foods releases high percentages of methane. Aerobic home composting avoids this.'
  },
  Recycling: {
    category: 'Recycling',
    title: 'Consolidate PET and Paper Materials for Local Agents',
    savedKg: 3.5,
    difficulty: 'Easy',
    costImpact: 'Low Cost',
    timeRequired: 'Weekly compilation',
    whyFits: 'Standard recycling keeps clean, structural resource molecules within reusable circulation loops instead of mining fresh ores.'
  }
};

/**
 * Returns list of matching carbon reduction actions ordered for impact
 */
export function getAllReductionActions(): PersonalizedAction[] {
  return Object.values(MASTER_REDUCTION_ACTIONS);
}

/**
 * Provides an optimal, high-integrity reduction recommendation based on highest emission source
 */
export function getBestReductionAction(category: CarbonCategory): PersonalizedAction {
  return MASTER_REDUCTION_ACTIONS[category] || MASTER_REDUCTION_ACTIONS.Transport;
}
