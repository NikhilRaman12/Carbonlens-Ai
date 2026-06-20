import { describe, expect, it } from 'vitest';
import { calculateCO2e, EMISSION_FACTORS } from '../constants';

describe('Carbon Calculator Logic - calculateCO2e', () => {
  it('should correctly calculate emissions for Transport category', () => {
    // Petrol Car factor is 0.21, so 10 km = 2.1 kg CO2e
    const result = calculateCO2e('Transport', 'Petrol Car', 10);
    expect(result).toBe(2.1);
  });

  it('should apply custom grid override for Electricity', () => {
    // Standard factor is 0.71, custom override is 0.5
    const standardResult = calculateCO2e('Electricity', 'Grid Average (India)', 10);
    expect(standardResult).toBe(7.1);

    const overriddenResult = calculateCO2e('Electricity', 'Grid Average (India)', 10, false, 0.5);
    expect(overriddenResult).toBe(5.0);
  });

  it('should apply 20% lifecycle premium for processed Food & Household items', () => {
    // Vegetables & Grains: 0.5 factor. 10kg = 5kg standard
    const standardFood = calculateCO2e('Food & Household', 'Vegetables & Grains', 10, false);
    expect(standardFood).toBe(5.0);

    // Processed Food: 5 * 1.2 = 6.0kg
    const processedFood = calculateCO2e('Food & Household', 'Vegetables & Grains', 10, true);
    expect(processedFood).toBe(6.0);
  });

  it('should return 0 emissions for unknown or missing subtypes', () => {
    const unknownResult = calculateCO2e('Transport', 'Rocket Ship', 100);
    expect(unknownResult).toBe(0);
  });

  it('should handle zero quantities gracefully', () => {
    const zeroResult = calculateCO2e('Transport', 'Petrol Car', 0);
    expect(zeroResult).toBe(0);
  });

  it('should handle negative values or edge cases reliably', () => {
    const negativeResult = calculateCO2e('Transport', 'Petrol Car', -10);
    expect(negativeResult).toBe(-2.1);
  });

  it('should match known factors in EMISSION_FACTORS', () => {
    expect(EMISSION_FACTORS.Transport['Electric Vehicle (EV)']).toBe(0.05);
  });
});
