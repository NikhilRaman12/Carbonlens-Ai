/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CarbonEntry, CarbonCategory } from '../types';
import { CATEGORY_DETAILS } from '../constants';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Calendar, TrendingUp, HelpCircle, Activity } from 'lucide-react';

interface BreakdownChartProps {
  entries: CarbonEntry[];
}

export default function BreakdownChart({ entries }: BreakdownChartProps) {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month');
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');

  // Filter entries based on range
  const getFilteredEntries = () => {
    const now = new Date();
    return entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeFilter === 'week') return diffDays <= 7;
      if (timeFilter === 'month') return diffDays <= 30;
      return diffDays <= 365;
    });
  };

  const filtered = getFilteredEntries();

  // Aggregate by category
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

  filtered.forEach((entry) => {
    categoryTotals[entry.category] += entry.co2e;
  });

  // Prepare chart data (Pie cannot have negative values nicely, so we separate Recycling credit as offset)
  const chartData = Object.entries(categoryTotals)
    .filter(([cat, amount]) => cat !== 'Recycling' && amount > 0)
    .map(([cat, amount]) => ({
      name: cat,
      value: parseFloat(amount.toFixed(1)),
      color: CATEGORY_DETAILS[cat as CarbonCategory]?.color || '#cbd5e1',
    }));

  const recyclingOffset = Math.abs(categoryTotals.Recycling);

  // Group last 30 days daily emissions for the trend chart
  const getLast30DaysTrend = () => {
    const dailyData: Record<string, number> = {};
    const now = new Date();
    
    // Seed last 30 dates
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const str = d.toISOString().split('T')[0];
      dailyData[str] = 0;
    }

    // Populate from entries with net calculation
    entries.forEach((entry) => {
      if (entry.date in dailyData) {
        dailyData[entry.date] += entry.co2e;
      }
    });

    // Format for recharts
    return Object.entries(dailyData).map(([dateStr, co2Val]) => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return {
        date: label,
        'CO2e (kg)': parseFloat(Math.max(-30, co2Val).toFixed(1)), // Keep positive trend or negative offsets visible
      };
    });
  };

  const trendData = getLast30DaysTrend();
  const netTotalSelectedRange = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Chart controls card */}
      <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Footprint Anatomy
            </span>
            <h3 className="text-xl font-black text-stone-800 tracking-tight mt-1.5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Category Breakdown
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Range selection */}
            <div className="bg-stone-50 border border-stone-200/60 p-1 rounded-xl flex">
              {(['week', 'month', 'year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeFilter(r)}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeFilter === r
                      ? 'bg-white border text-emerald-800 border-stone-200 font-bold shadow-xs'
                      : 'text-stone-400 hover:text-stone-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Type selection */}
            <div className="bg-stone-50 border border-stone-200/60 p-1 rounded-xl flex">
              <button
                onClick={() => setChartType('donut')}
                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'donut'
                    ? 'bg-white border text-emerald-800 border-stone-200 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Donut
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white border text-emerald-800 border-stone-200 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>

        {/* Chart displays */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <span className="text-4xl">📊</span>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">No entries logged in this time screen</p>
            <p className="text-stone-400 text-[11px]">Use the quick-add footprint buttons above to start mapping carbon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Visual Chart area */}
            <div className="lg:col-span-7 h-[280px]">
              {chartType === 'donut' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [`${val} kg CO2e`, 'Emissions']}
                      contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(val: number) => [`${val} kg CO2e`, 'Emissions']}
                      contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legends & Credits details side */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border bg-stone-50 border-stone-105 rounded-2xl p-4">
                <span className="text-[9px] text-stone-400 font-black block uppercase tracking-wider">
                  Net Selected Tally
                </span>
                <span className="text-2xl font-black text-stone-800 block mt-0.5">
                  {netTotalSelectedRange.toFixed(1)} kg CO2e
                </span>
                <span className="text-[10px] text-stone-500 block leading-tight mt-1">
                  Adjusted for Recycling mitigations.
                </span>
              </div>

              {/* Individual Category List legend stats */}
              <div className="space-y-2">
                {Object.entries(categoryTotals).map(([cat, amount]) => {
                  if (amount === 0) return null;
                  const details = CATEGORY_DETAILS[cat as CarbonCategory];
                  const percent = netTotalSelectedRange > 0 ? (amount / netTotalSelectedRange) * 100 : 0;
                  
                  return (
                    <div key={cat} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: details.color }}
                        />
                        <span className="text-stone-700 font-medium">{cat}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-stone-800 font-bold block">{amount.toFixed(1)} kg</span>
                        {cat !== 'Recycling' && amount > 0 && (
                          <span className="text-[9px] text-stone-400 font-semibold block">{percent.toFixed(0)}% contribution</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recycling mitigation note */}
              {recyclingOffset > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-800 block">
                      Recycling Credit Offset
                    </span>
                    <span className="text-stone-600 block mt-0.5">Segmented dry segregation offset.</span>
                  </div>
                  <span className="bg-emerald-500 font-black text-white px-2.5 py-1 rounded-full text-xs shrink-0 select-none">
                    -{recyclingOffset.toFixed(1)} kg CO2e
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 30 Days trend line chart */}
      <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-black text-stone-800 tracking-tight">30-Day Footprint Trend</h4>
            <p className="text-[10px] text-stone-400 font-medium">Daily combined net CO2e (kg) output timeline history</p>
          </div>
        </div>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9' }}
                labelStyle={{ fontSize: 9, fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="CO2e (kg)" 
                stroke="#059669" 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
