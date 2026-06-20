/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, Info, Landmark, Lightbulb, Compass } from 'lucide-react';

interface BenchmarkBannerProps {
  monthlyAmountKg: number;
  benchmarkConstantKgYearly: number; // e.g. 1900
}

export default function BenchmarkBanner({
  monthlyAmountKg,
  benchmarkConstantKgYearly,
}: BenchmarkBannerProps) {
  const benchmarkMonthly = benchmarkConstantKgYearly / 12; // 158.33 kg / month
  const ratioPercent = benchmarkMonthly > 0 ? (monthlyAmountKg / benchmarkMonthly) * 100 : 0;
  const diffAmount = Math.abs(monthlyAmountKg - benchmarkMonthly);

  return (
    <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      
      {/* Informative description */}
      <div className="md:col-span-8 space-y-3">
        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          National Compass Benchmarks
        </span>
        <h3 className="text-lg font-black text-stone-800 tracking-tight flex items-center gap-2">
          <Landmark className="w-5 h-5 text-indigo-600" />
          Comparing Against India Per Capita average
        </h3>
        <p className="text-xs text-stone-500 max-w-xl leading-relaxed">
          The rough national average benchmark for personal non-industrial lifestyle consumption in India is approximately <span className="font-bold text-stone-700">{(benchmarkConstantKgYearly / 1000).toFixed(1)} tons ({(benchmarkMonthly).toFixed(0)} kg) CO2e/year per capita</span>. Your entries help map exactly where you sit relative to this baseline context box.
        </p>
        
        {/* Supporting educational tip */}
        <div className="flex gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 max-w-xl">
          <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-950 font-medium leading-relaxed leading-normal">
            {monthlyAmountKg < benchmarkMonthly
              ? `Tremendous! You are currently keeping ${(diffAmount).toFixed(0)} kg CO2e below the national Indian average this month. Fantastic climate conscious habits!`
              : `You are currently experiencing a higher relative personal footprint compared to the national per-capita target. Consider swapping flights or high red-meat meals to bridge the ${(diffAmount).toFixed(0)} kg delta.`
            }
          </p>
        </div>
      </div>

      {/* Visual comparison Gauge side */}
      <div className="md:col-span-4 bg-stone-50 border border-stone-105 p-5 rounded-2xl flex flex-col justify-between h-full space-y-4">
        <div className="space-y-3">
          {/* My monthly amount */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-500 font-semibold uppercase text-[10px]">Your Month Tally</span>
            <span className="font-extrabold text-stone-800">{monthlyAmountKg.toFixed(1)} kg</span>
          </div>
          {/* Benchmark line */}
          <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-200">
            <span className="text-stone-500 font-semibold uppercase text-[10px]">India Average</span>
            <span className="font-extrabold text-stone-800">{(benchmarkMonthly).toFixed(0)} kg</span>
          </div>
        </div>

        {/* Linear Gauge showing comparison */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-stone-400 font-bold uppercase">
            <span>Climate Saver</span>
            <span>Target Average</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3.5 overflow-hidden border">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                monthlyAmountKg < benchmarkMonthly ? 'bg-emerald-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, ratioPercent)}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-400 block text-right">
            {ratioPercent.toFixed(0)}% of average ceiling
          </span>
        </div>
      </div>

    </div>
  );
}
