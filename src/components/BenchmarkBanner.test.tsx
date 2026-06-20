import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BenchmarkBanner from './BenchmarkBanner';

describe('BenchmarkBanner Component', () => {
  it('renders correct details when monthly usage is within average targets', () => {
    // Under benchmark (monthly benchmark is 1900 / 12 = 158.33 kg)
    render(<BenchmarkBanner monthlyAmountKg={100} benchmarkConstantKgYearly={1900} />);
    
    expect(screen.getByText('Comparing Against India Per Capita average')).toBeInTheDocument();
    expect(screen.getByText('100.0 kg')).toBeInTheDocument();
    expect(screen.getByText(/You are currently keeping/)).toBeInTheDocument();
  });

  it('renders correct elements when monthly usage exceeds target ceiling limit', () => {
    // Exceeding benchmark
    render(<BenchmarkBanner monthlyAmountKg={200} benchmarkConstantKgYearly={1900} />);
    
    expect(screen.getByText('200.0 kg')).toBeInTheDocument();
    expect(screen.getByText(/You are currently experiencing a higher/)).toBeInTheDocument();
  });
});
