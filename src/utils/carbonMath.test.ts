import { describe, expect, it } from 'vitest';
import { 
  getThisWeekTotalCO2e, 
  calculateCO2eWeeklySavings, 
  getTopEmissionCategory, 
  getBestReductionAction 
} from './carbonMath';
import { CarbonEntry } from '../types';

describe('Carbon Math Utilities Helper Tests', () => {
  const mockToday = new Date().toISOString().split('T')[0];
  
  const sampleEntries: CarbonEntry[] = [
    {
      id: 'test-1',
      category: 'Transport',
      subtype: 'Petrol Car',
      quantity: 100,
      unit: 'km',
      date: mockToday,
      co2e: 21.0
    },
    {
      id: 'test-2',
      category: 'Electricity',
      subtype: 'Grid Average (India)',
      quantity: 50,
      unit: 'kWh',
      date: mockToday,
      co2e: 35.5
    },
    {
      id: 'test-3',
      category: 'Recycling',
      subtype: 'Recyclable Materials (Offset)',
      quantity: 10,
      unit: 'kg',
      date: mockToday,
      co2e: -3.0
    }
  ];

  it('should correctly sum current week emissions', () => {
    const sum = getThisWeekTotalCO2e(sampleEntries);
    // Transport 21.0 + Electricity 35.5 + Recycling -3.0 = 53.5
    expect(sum).toBe(53.5);
  });

  it('should compute correct savings against baseline', () => {
    // Baseline is 433 kg / month -> approx 100 kg / week
    // 100 - 53.5 = 46.5 saving
    const savings = calculateCO2eWeeklySavings(sampleEntries, 433);
    expect(savings).toBeGreaterThan(0);
    expect(savings).toBe(46.5);
  });

  it('should identify top emission category', () => {
    // Electricity (35.5) > Transport (21.0)
    const top = getTopEmissionCategory(sampleEntries);
    expect(top.category).toBe('Electricity');
    expect(top.co2e).toBe(35.5);
  });

  it('should generate personalized advice recommendations based on category', () => {
    const action = getBestReductionAction('Electricity');
    expect(action.title).toContain('AC Thermostat');
    expect(action.difficulty).toBe('Easy');
    expect(action.costImpact).toBe('High Saving');
    expect(action.category).toBe('Electricity');
  });
});
