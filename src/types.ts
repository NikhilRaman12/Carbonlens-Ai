/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CarbonCategory =
  | 'Transport'
  | 'Electricity'
  | 'Food & Household'
  | 'Water'
  | 'Phone & Internet'
  | 'Recycling'
  | 'Gas'
  | 'Waste';

export interface CarbonEntry {
  id: string;
  category: CarbonCategory;
  subtype: string;
  quantity: number;
  unit: string;
  date: string; // YYYY-MM-DD
  co2e: number; // calculated in kg
  notes?: string;
}

export interface CoachInsight {
  highestCategory: CarbonCategory;
  headlineInsight: string;
  quantifiedAction: {
    title: string;
    savedKg: number;
    description: string;
  };
  encouragement: string;
  tips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface GoalSettings {
  targetPercentage: number; // e.g. 15% reduction
  gridEmissions: number; // kg CO2/kWh, default 0.71
  nationalAverageKg: number; // e.g. 1900 kg (1.9 tons)/year per capita -> 158.3 kg / month
  customReferenceBaseline: number; // reference baseline against which to evaluate progress. Let's make it 300kg CO2e/month.
}
