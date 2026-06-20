/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CarbonEntry, GoalSettings } from '../types';
import { Trophy, Zap, Award, Flame, Calendar, Settings, ShieldCheck, HelpCircle } from 'lucide-react';

interface GoalStreakCardProps {
  entries: CarbonEntry[];
  settings: GoalSettings;
  onUpdateSettings: (newSettings: GoalSettings) => void;
}

export default function GoalStreakCard({
  entries,
  settings,
  onUpdateSettings,
}: GoalStreakCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [target, setTarget] = useState(settings.targetPercentage);
  const [baseline, setBaseline] = useState(settings.customReferenceBaseline);
  const [grid, setGrid] = useState(settings.gridEmissions);

  // Calculate current streak
  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    
    // Extract unique dates and sort chronological descending
    const dates = Array.from(new Set(entries.map((e) => e.date))).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If no log today AND no log yesterday, streak is broken -> 0
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let expectedDate = new Date(dates[0]);

    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const diffTime = Math.abs(expectedDate.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (100 * 60 * 60 * 24)); // Wait, 1000*60*60*24 = 86400000, let's divide day correctly
      
      const dayDiff = Math.round((expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 0 || dayDiff === 1) {
        streak++;
        expectedDate = currentDate;
      } else {
        break; // Tapped out streak
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Calculate emissions this current month
  const getMonthlyTotal = () => {
    const curMonth = new Date().getMonth();
    const curYear = new Date().getFullYear();
    return entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      })
      .reduce((sum, e) => sum + e.co2e, 0);
  };

  const monthlyEmissions = getMonthlyTotal();
  const targetAllowed = settings.customReferenceBaseline * (1 - settings.targetPercentage / 100);
  const percentEmitted = targetAllowed > 0 ? (monthlyEmissions / targetAllowed) * 100 : 0;
  const isBudgetExceeded = monthlyEmissions > targetAllowed;

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      targetPercentage: Number(target) || 15,
      customReferenceBaseline: Number(baseline) || 300,
      gridEmissions: Number(grid) || 0.71,
    });
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Target & Budget Progress bar */}
      <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-xs md:col-span-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Monthly Target Budget
              </span>
              <h3 className="text-lg font-black text-stone-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
                Carbon Ceiling Budget
              </h3>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl transition-all text-stone-500 text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>Configure Target</span>
            </button>
          </div>

          {isEditing ? (
            <div className="bg-stone-50 border border-stone-105 rounded-2xl p-5 mt-4 space-y-4 animate-fadeIn">
              <span className="text-[10px] font-black tracking-widest text-emerald-800 uppercase block mb-1">
                Ajustable Sustainability Constants
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1.5">Target Reduction (%)</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl text-stone-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 15%"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1.5 font-sans">Reference Budget (kg)</label>
                  <input
                    type="number"
                    value={baseline}
                    onChange={(e) => setBaseline(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl text-stone-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1.5">Grid intensity (kWh/kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grid}
                    onChange={(e) => setGrid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl text-stone-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 0.71"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-400 bg-transparent rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl cursor-pointer"
                >
                  Save Constants
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5 py-2">
              <div className="bg-stone-50 border border-stone-105 p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-semibold uppercase block leading-none">Baseline Budget</span>
                <span className="text-base font-black text-stone-850 block mt-1">{settings.customReferenceBaseline} kg</span>
              </div>
              <div className="bg-stone-50 border border-stone-105 p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-semibold uppercase block leading-none">Target Cut %</span>
                <span className="text-base font-black text-emerald-600 block mt-1">-{settings.targetPercentage}%</span>
              </div>
              <div className="bg-stone-50 border border-stone-105 p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-semibold uppercase block leading-none">Ceiling Allowed</span>
                <span className="text-base font-black text-stone-850 block mt-1">{targetAllowed.toFixed(0)} kg</span>
              </div>
              <div className="bg-stone-50 border border-stone-105 p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-semibold uppercase block leading-none">Logged This Month</span>
                <span className="text-base font-black text-stone-850 block mt-1">{monthlyEmissions.toFixed(1)} kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar Rendering */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-stone-500">
              {percentEmitted.toFixed(0)}% budget consumed
            </span>
            <span className={`${isBudgetExceeded ? 'text-red-655 font-extrabold' : 'text-stone-600'}`}>
              {isBudgetExceeded 
                ? `Exceeded ceiling by ${(monthlyEmissions - targetAllowed).toFixed(1)} kg!`
                : `${(targetAllowed - monthlyEmissions).toFixed(1)} kg remaining`
              }
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isBudgetExceeded
                  ? 'bg-rose-550 bg-rose-500' 
                  : percentEmitted > 80 
                  ? 'bg-yellow-500' 
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, percentEmitted)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak Tracking Panel */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-[2.5rem] p-6 shadow-xs md:col-span-4 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative leaf vectors */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full pointer-events-none"></div>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500 text-white rounded-xl shadow-md shadow-teal-200">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest text-teal-800 font-black">Streak Tracker</span>
              <h4 className="text-sm font-bold text-teal-980 leading-none mt-0.5">Mindful Tracking</h4>
            </div>
          </div>

          <div className="py-2 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-teal-950 font-mono tracking-tight">{streak}</span>
            <span className="text-xs text-teal-800 font-black uppercase tracking-wider">Days in a row</span>
          </div>

          <p className="text-xs text-teal-900/85 leading-normal font-medium first-letter:uppercase">
            {streak > 0
              ? `Tremendous! You are sustaining a ${streak}-day logging habit. Routine tracking is the leading driver of personal carbon reductions.`
              : `Increase consistency by logging a single footprint entry today! Set a daily calendar reminder.`
            }
          </p>
        </div>

        {/* Calendar visual checklist */}
        <div className="flex justify-between border-t border-teal-150/50 pt-4 mt-4 text-[10px] text-teal-800 font-extrabold uppercase">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Daily habit checks</span>
          </div>
          <span>Active</span>
        </div>
      </div>

    </div>
  );
}
