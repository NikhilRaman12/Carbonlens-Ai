import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalStreakCard from './GoalStreakCard';
import { CarbonEntry, GoalSettings } from '../types';

describe('GoalStreakCard Component', () => {
  const mockSettings: GoalSettings = {
    targetPercentage: 15,
    customReferenceBaseline: 300,
    gridEmissions: 0.71,
    nationalAverageKg: 1900,
  };

  const mockEntries: CarbonEntry[] = [
    {
      id: '1',
      category: 'Transport',
      subtype: 'Petrol Car',
      quantity: 10,
      unit: 'km',
      co2e: 2.1,
      date: new Date().toISOString().split('T')[0], // Today
      notes: 'Drive'
    }
  ];

  it('renders correctly with default settings', () => {
    render(
      <GoalStreakCard 
        entries={mockEntries} 
        settings={mockSettings} 
        onUpdateSettings={vi.fn()} 
      />
    );

    expect(screen.getByText('Carbon Ceiling Budget')).toBeInTheDocument();
    expect(screen.getByText('300 kg')).toBeInTheDocument(); // Baseline Budget
    expect(screen.getByText('-15%')).toBeInTheDocument(); // Target Cut %
  });

  it('calculates and displays correct streak days', () => {
    // Current streak with today is 1 day
    render(
      <GoalStreakCard 
        entries={mockEntries} 
        settings={mockSettings} 
        onUpdateSettings={vi.fn()} 
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Days in a row')).toBeInTheDocument();
  });

  it('toggles editing configure panel when button is clicked', () => {
    render(
      <GoalStreakCard 
        entries={[]} 
        settings={mockSettings} 
        onUpdateSettings={vi.fn()} 
      />
    );

    const configureBtn = screen.getByText('Configure Target');
    fireEvent.click(configureBtn);

    expect(screen.getByText('Target Reduction (%)')).toBeInTheDocument();
    expect(screen.getByText('Reference Budget (kg)')).toBeInTheDocument();
  });

  it('calls onUpdateSettings on save action', () => {
    const onUpdateSettingsMock = vi.fn();
    render(
      <GoalStreakCard 
        entries={[]} 
        settings={mockSettings} 
        onUpdateSettings={onUpdateSettingsMock} 
      />
    );

    // Turn editing mode on
    const configureBtn = screen.getByText('Configure Target');
    fireEvent.click(configureBtn);

    // Save
    const saveBtn = screen.getByText('Save Constants');
    fireEvent.click(saveBtn);

    expect(onUpdateSettingsMock).toHaveBeenCalled();
  });
});
