/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarbonCategory } from './types';

export const EMISSION_FACTORS = {
  Transport: {
    'Petrol Car': 0.21, // kg CO2/km
    'Diesel Car': 0.17, // kg CO2/km
    'Electric Vehicle (EV)': 0.05, // kg CO2/km
    'Two-Wheeler/Bike': 0.07, // kg CO2/km
    'Bus': 0.05, // kg CO2/km per passenger
    'Train/Metro': 0.04, // kg CO2/km
    'Domestic Flight': 0.15, // kg CO2/km
  },
  Electricity: {
    'Grid Average (India)': 0.71, // kg CO2/kWh
  },
  'Food & Household': {
    'Red Meat (Mutton/Beef)': 27.0, // kg CO2/kg
    'Poultry (Chicken/Eggs)': 6.0, // kg CO2/kg
    'Dairy Products': 3.0, // kg CO2/kg
    'Vegetables & Grains': 0.5, // kg CO2/kg
  },
  Water: {
    'Tap/Piped Water': 0.0003, // kg CO2/liter
  },
  'Phone & Internet': {
    'Mobile/Cloud Internet Data': 0.5, // kg CO2/GB
    'Smartphone Mfg Amortized (Daily)': 0.219, // 80 kg CO2/year = 0.219 kg/day
  },
  Gas: {
    'LPG Cylinder': 2.98, // kg CO2/kg LPG
    'Piped Natural Gas (PNG)': 2.0, // kg CO2/m³
  },
  Waste: {
    'Landfill Waste (Mixed)': 0.5, // kg CO2/kg
  },
  Recycling: {
    'Recyclable Materials (Offset)': -0.3, // kg CO2/kg recycled (credit against Waste)
  }
};

export const CATEGORY_DETAILS: Record<CarbonCategory, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  unit: string;
  description: string;
  subtypes: { name: string; factor: number; defaultVal: number }[];
}> = {
  Transport: {
    icon: 'car',
    color: '#0ea5e9', // Sky blue
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
    unit: 'km',
    description: 'Emissions from driving, public transport, riding, and flight transits.',
    subtypes: [
      { name: 'Petrol Car', factor: 0.21, defaultVal: 15 },
      { name: 'Diesel Car', factor: 0.17, defaultVal: 15 },
      { name: 'Electric Vehicle (EV)', factor: 0.05, defaultVal: 15 },
      { name: 'Two-Wheeler/Bike', factor: 0.07, defaultVal: 10 },
      { name: 'Bus', factor: 0.05, defaultVal: 10 },
      { name: 'Train/Metro', factor: 0.04, defaultVal: 20 },
      { name: 'Domestic Flight', factor: 0.15, defaultVal: 350 },
    ]
  },
  Electricity: {
    icon: 'zap',
    color: '#eab308', // Amber/Yellow
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    unit: 'kWh',
    description: 'Grid energy consumed at home, adjustable by state grid intensity.',
    subtypes: [
      { name: 'Grid Average (India)', factor: 0.71, defaultVal: 10 },
    ]
  },
  'Food & Household': {
    icon: 'utensils',
    color: '#f97316', // Orange
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    unit: 'kg',
    description: 'Personal grocery items consumed, with a lifecycle margin for processing.',
    subtypes: [
      { name: 'Vegetables & Grains', factor: 0.5, defaultVal: 2.0 },
      { name: 'Dairy Products', factor: 3.0, defaultVal: 0.5 },
      { name: 'Poultry (Chicken/Eggs)', factor: 6.0, defaultVal: 0.5 },
      { name: 'Red Meat (Mutton/Beef)', factor: 27.0, defaultVal: 0.2 },
    ]
  },
  Water: {
    icon: 'droplet',
    color: '#06b6d4', // Cyan
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-100',
    unit: 'liters',
    description: 'Pumping, treatment, and distribution lifecycle emissions per liter.',
    subtypes: [
      { name: 'Tap/Piped Water', factor: 0.0003, defaultVal: 150 },
    ]
  },
  'Phone & Internet': {
    icon: 'phone',
    color: '#8b5cf6', // Violet
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-100',
    unit: 'GB / Days',
    description: 'Cloud networking overhead per GB and phone manufacturing amortization.',
    subtypes: [
      { name: 'Mobile/Cloud Internet Data', factor: 0.5, defaultVal: 2.0 },
      { name: 'Smartphone Mfg Amortized (Daily)', factor: 0.219, defaultVal: 1 },
    ]
  },
  Gas: {
    icon: 'flame',
    color: '#f43f5e', // Rose
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    unit: 'kg / m³',
    description: 'Direct thermal fuel burned for meal-cooking or hot-water geysers.',
    subtypes: [
      { name: 'LPG Cylinder', factor: 2.98, defaultVal: 1.0 },
      { name: 'Piped Natural Gas (PNG)', factor: 2.0, defaultVal: 1.0 },
    ]
  },
  Waste: {
    icon: 'trash',
    color: '#64748b', // Slate
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    unit: 'kg',
    description: 'Organic and wet items destined to undergo anaerobic landfill compilation.',
    subtypes: [
      { name: 'Landfill Waste (Mixed)', factor: 0.5, defaultVal: 1.5 },
    ]
  },
  Recycling: {
    icon: 'recycle',
    color: '#10b981', // Emerald
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    unit: 'kg',
    description: 'Diverted metal, dry clean papers, or cardboard that earn a negative offset credit.',
    subtypes: [
      { name: 'Recyclable Materials (Offset)', factor: -0.3, defaultVal: 1.0 },
    ]
  }
};

/**
 * Calculates carbon emissions in kg CO2e
 * @param category Carbone Category
 * @param subtype Type name
 * @param quantity Units consumed
 * @param isProcessed Adds 20% premium for Food & Household category items
 * @param gridEmissionsOverride User-overridden grid average value for Electricity
 */
export function calculateCO2e(
  category: CarbonCategory,
  subtype: string,
  quantity: number,
  isProcessed?: boolean,
  gridEmissionsOverride?: number
): number {
  let factor = 0;

  if (category === 'Electricity' && gridEmissionsOverride !== undefined) {
    factor = gridEmissionsOverride;
  } else {
    // Lookup factor
    const subList = CATEGORY_DETAILS[category]?.subtypes;
    const found = subList?.find(s => s.name === subtype);
    factor = found ? found.factor : 0;
  }

  let emission = quantity * factor;

  // Add 20% lifeycle premium for processed food on Food & Household items
  if (category === 'Food & Household' && isProcessed) {
    emission = emission * 1.20;
  }

  // Rounded to 3 decimal places
  return parseFloat(emission.toFixed(3));
}
