/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarbonEntry, GoalSettings, CoachInsight, CarbonCategory } from './types';
import { CATEGORY_DETAILS, calculateCO2e } from './constants';
import QuickAddModal from './components/QuickAddModal';
import CoachCard from './components/CoachCard';
import BreakdownChart from './components/BreakdownChart';
import CategoryDetailModal from './components/CategoryDetailModal';
import GoalStreakCard from './components/GoalStreakCard';
import BenchmarkBanner from './components/BenchmarkBanner';
import WorkspaceSyncSandbox from './components/WorkspaceSyncSandbox';
import { 
  getTopEmissionCategory, 
  calculateCO2eWeeklySavings, 
  getBestReductionAction 
} from './utils/carbonMath';

import {
  Leaf,
  Car,
  Zap,
  Utensils,
  Droplet,
  Phone,
  Flame,
  Trash,
  Recycle,
  Sparkles,
  Info,
  RotateCcw,
  Trophy,
  History,
  CalendarCheck2,
  Download,
  AlertTriangle,
  TrendingDown,
  LineChart
} from 'lucide-react';

// Helper to build a localized carbon footprint coaching insight completely offline
function generateLocalFallbackInsight(currentEntries: CarbonEntry[]): CoachInsight {
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

  currentEntries.forEach((e) => {
    if (e.category === 'Recycling') {
      // Recycling is recorded as net negative, sum up the absolute offset
      categoryTotals.Recycling += Math.abs(e.co2e);
    } else {
      categoryTotals[e.category] += e.co2e;
    }
  });

  // Identify highest emission source (ignoring Recycling offset)
  let highestCat: CarbonCategory = 'Transport';
  let max = -1;
  const cats = Object.keys(categoryTotals) as CarbonCategory[];
  cats.forEach((cat) => {
    if (cat !== 'Recycling' && categoryTotals[cat] > max) {
      max = categoryTotals[cat];
      highestCat = cat;
    }
  });

  const tipsMap: Record<CarbonCategory, string[]> = {
    Transport: [
      'Swap short trips under 3km with walking or cycling entirely.',
      'Swap 2 single-occupancy car trips per week for energy-efficient metro/bus lines.',
      'Maintain stable tire pressures to save up to 10% on weekly fuel burn.'
    ],
    Electricity: [
      'Transition high-use living area fixtures to modern energy-saving LED bulbs.',
      'Keep residential air conditioning sets at 24°C rather than freezing levels.',
      'Unplug inactive entertainment gear to mitigate background "vampire" drain.'
    ],
    'Food & Household': [
      'Incorporate 1 or 2 plant-based low-emissions dining days each week.',
      'Prioritize fresh local grains and farm-grown vegetables over exotic imports.',
      'Leverage meal planning tactics to maintain absolute zero organic food waste.'
    ],
    Water: [
      'Equip primary bathroom and kitchen showers with low-flow water aerators.',
      'Reuse clean, residual crop-washing greywater to nourish household plants.',
      'Ensure leaking joints or dripping taps are sealed immediately to end resource loss.'
    ],
    'Phone & Internet': [
      'Download high-definition video collections on local Wi-Fi rather than mobile networks.',
      'De-clutter obsolete backups on inactive server cloud networks.',
      'Sustain your smart telephone device for 4 full years to amortize tracking cost.'
    ],
    Gas: [
      'Always seal boiling cooking vessels with lids to prepare meals 30% quicker.',
      'Soak legume seeds or red lentils beforehand to shorten required heating times.',
      'Maintain quarterly burner maintenance reviews to avoid heat distribution decay.'
    ],
    Waste: [
      'Completely separate organic kitchen waste from clean plastic or dry paper streams.',
      'Specify zero-packaging or compact shipping layouts when commissioning deliveries.',
      'Kickstart solid waste composting containers for organic household peelings.'
    ],
    Recycling: [
      'Rinse plastic containers before discard to prevent route contamination or rejection.',
      'Neatly compile cardboard, structural metals, and transparent bottles for processing.',
      'Avoid composite multi-layered packaging variants that are difficult to isolate.'
    ]
  };

  const selectedTips = tipsMap[highestCat] || [
    'Transition high-use fixtures to modern energy-saving LED bulbs.',
    'Equip showers and taps with low-flow water aerators.'
  ];

  return {
    highestCategory: highestCat,
    headlineInsight: `Based on your recent logs, your footprint shows a concentration in **${highestCat}** (${categoryTotals[highestCat].toFixed(1)} kg CO2e). Optimizing this category is your top sustainability leverage point!`,
    quantifiedAction: {
      title: `Optimize ${highestCat} Habits`,
      savedKg: parseFloat((categoryTotals[highestCat] * 0.15 || 5.0).toFixed(1)),
      description: `Reducing your ${highestCat} footprint by just 15% this week can trim approximately ${(categoryTotals[highestCat] * 0.15 || 5.0).toFixed(1)} kg of CO2e. This gets you closer to your user goal!`
    },
    encouragement: currentEntries.length > 0
      ? `Fabulous work logging ${currentEntries.length} entries! Actively tracking daily habits is the single most critical step.`
      : "Start tracking entries to see deep real-time carbon coaching advice!",
    tips: selectedTips
  };
}

export default function App() {
  // In-app states
  const [entries, setEntries] = useState<CarbonEntry[]>([]);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [settings, setSettings] = useState<GoalSettings>({
    targetPercentage: 15,
    gridEmissions: 0.71,
    nationalAverageKg: 1900,
    customReferenceBaseline: 250,
  });

  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);
  
  // Quick log displayed period filter state ('today' | 'month' | 'all')
  const [quickLogPeriod, setQuickLogPeriod] = useState<'today' | 'month' | 'all'>('month');

  // Modals & triggers
  const [selectedQuickAddCategory, setSelectedQuickAddCategory] = useState<CarbonCategory | null>(null);
  const [selectedDetailCategory, setSelectedDetailCategory] = useState<CarbonCategory | null>(null);
  
  // Spinners
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Sync state from LocalStorage on mount
  useEffect(() => {
    // Set official browser tab title right away
    document.title = "CarbonLens — AI Footprint Coach";

    try {
      const storedEntries = localStorage.getItem('carbonlens_entries');
      let parsedEntries: CarbonEntry[] = [];
      if (storedEntries) {
        parsedEntries = JSON.parse(storedEntries);
        setEntries(parsedEntries);
      } else {
        // Pre-loaded baseline entries to make the app gorgeous on first boot
        parsedEntries = getDefaultDemoEntries();
        setEntries(parsedEntries);
      }

      const storedSettings = localStorage.getItem('carbonlens_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }

      const storedInsight = localStorage.getItem('carbonlens_insight');
      if (storedInsight) {
        setCoachInsight(JSON.parse(storedInsight));
      } else {
        // Automatically pre-load offline local coaching insights so page is never empty
        setCoachInsight(generateLocalFallbackInsight(parsedEntries));
      }
    } catch (err) {
      console.error('LocalStorage sync failed', err);
    } finally {
      setAppInitialized(true);
    }
  }, []);

  // Sync state back to LocalStorage on updates
  useEffect(() => {
    if (!appInitialized) return;
    localStorage.setItem('carbonlens_entries', JSON.stringify(entries));
  }, [entries, appInitialized]);

  useEffect(() => {
    if (!appInitialized) return;
    localStorage.setItem('carbonlens_settings', JSON.stringify(settings));
  }, [settings, appInitialized]);

  useEffect(() => {
    if (!appInitialized) return;
    localStorage.setItem('carbonlens_insight', JSON.stringify(coachInsight));
  }, [coachInsight, appInitialized]);

  // Default initial entries to make chart render active right away
  function getDefaultDemoEntries(): CarbonEntry[] {
    const today = new Date();
    const demo: CarbonEntry[] = [];
    
    // Add 10 varied historic entries spread over the last 15 days
    const subtypes = [
      { cat: 'Transport' as const, sub: 'Petrol Car', qty: 35, co2e: 7.35 },
      { cat: 'Electricity' as const, sub: 'Grid Average (India)', qty: 45, co2e: 31.95 },
      { cat: 'Food & Household' as const, sub: 'Red Meat (Mutton/Beef)', qty: 1.5, co2e: 40.5 },
      { cat: 'Water' as const, sub: 'Tap/Piped Water', qty: 250, co2e: 0.075 },
      { cat: 'Phone & Internet' as const, sub: 'Mobile/Cloud Internet Data', qty: 12, co2e: 6.0 },
      { cat: 'Gas' as const, sub: 'LPG Cylinder', qty: 5, co2e: 14.9 },
      { cat: 'Waste' as const, sub: 'Landfill Waste (Mixed)', qty: 8, co2e: 4.0 },
      { cat: 'Recycling' as const, sub: 'Recyclable Materials (Offset)', qty: 6, co2e: -1.8 },
    ];

    for (let i = 12; i >= 0; i -= 2) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const template = subtypes[i % subtypes.length];
      
      demo.push({
        id: `demo-${i}`,
        category: template.cat,
        subtype: template.sub,
        quantity: template.qty,
        unit: CATEGORY_DETAILS[template.cat].unit,
        date: dateStr,
        co2e: template.co2e,
        notes: "Template Preset Data"
      });
    }
    return demo;
  }

  // Prepopulate a deep historic CarbonLens demo dataset for deep analytics demonstration
  const handleLoadRichDemoDataset = () => {
    const today = new Date();
    const list: CarbonEntry[] = [];
    
    // Generate 25 entries back in time
    for (let i = 24; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Add a couple entries per day
      if (i % 3 === 0) {
        list.push({
          id: `rich-demo-t-${i}`,
          category: 'Transport',
          subtype: i % 2 === 0 ? 'Petrol Car' : 'Train/Metro',
          quantity: i % 2 === 0 ? 40 : 18,
          unit: 'km',
          date: dateStr,
          co2e: i % 2 === 0 ? 8.4 : 0.72,
          notes: i % 2 === 0 ? "commuted home" : "subway transit"
        });
      }
      if (i % 4 === 0) {
        list.push({
          id: `rich-demo-f-${i}`,
          category: 'Food & Household',
          subtype: i % 5 === 0 ? 'Dairy Products' : 'Vegetables & Grains',
          quantity: i % 5 === 0 ? 0.8 : 2.5,
          unit: 'kg',
          date: dateStr,
          co2e: i % 5 === 0 ? 2.4 : 1.25,
          notes: i % 5 === 0 ? "cheese/milk log" : "green grocer trip"
        });
      }
      if (i % 5 === 0) {
        list.push({
          id: `rich-demo-w-${i}`,
          category: 'Waste',
          subtype: 'Landfill Waste (Mixed)',
          quantity: 2.0,
          unit: 'kg',
          date: dateStr,
          co2e: 1.0,
          notes: "weekly dump"
        });
        list.push({
          id: `rich-demo-r-${i}`,
          category: 'Recycling',
          subtype: 'Recyclable Materials (Offset)',
          quantity: 3.5,
          unit: 'kg',
          date: dateStr,
          co2e: -1.05,
          notes: "segregated metals & PET"
        });
      }
      if (i % 6 === 0) {
        list.push({
          id: `rich-demo-e-${i}`,
          category: 'Electricity',
          subtype: 'Grid Average (India)',
          quantity: 12.0,
          unit: 'kWh',
          date: dateStr,
          co2e: 8.52,
          notes: "residential load"
        });
      }
      if (i % 7 === 0) {
        list.push({
          id: `rich-demo-wa-${i}`,
          category: 'Water',
          subtype: 'Tap/Piped Water',
          quantity: 180.0,
          unit: 'liters',
          date: dateStr,
          co2e: 0.054,
          notes: "daily household supply"
        });
      }
      if (i % 8 === 0) {
        list.push({
          id: `rich-demo-p-${i}`,
          category: 'Phone & Internet',
          subtype: 'Mobile/Cloud Internet Data',
          quantity: 4.5,
          unit: 'GB / Days',
          date: dateStr,
          co2e: 2.25,
          notes: "cloud data backup"
        });
      }
      if (i % 9 === 0) {
        list.push({
          id: `rich-demo-g-${i}`,
          category: 'Gas',
          subtype: 'LPG Cylinder',
          quantity: 2.0,
          unit: 'kg / m³',
          date: dateStr,
          co2e: 5.96,
          notes: "cooking fuel"
        });
      }
    }

    setEntries(list);
    setSrAnnouncement('Laid down full active carbon trace preset logs for live demo analytics.');
    setCoachInsight(generateLocalFallbackInsight(list));
  };

  // Log active new footprint entries
  const handleAddNewEntry = (entryData: Omit<CarbonEntry, 'id'>) => {
    const newEntry: CarbonEntry = {
      ...entryData,
      id: Math.random().toString(36).substring(7),
    };
    
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setSrAnnouncement(`Added new carbon footprint entry in category ${entryData.category} for ${entryData.subtype} of ${entryData.quantity} ${entryData.unit}, adding ${entryData.co2e.toFixed(1)} kilograms of CO2 equivalent.`);

    // Transition automatic update to fast local calculation to avoid 429 limits
    setCoachInsight(generateLocalFallbackInsight(updated));
  };

  // Delete logged entries
  const handleDeleteEntry = (id: string) => {
    const targetEntry = entries.find((e) => e.id === id);
    const label = targetEntry ? `${targetEntry.category} ${targetEntry.subtype}` : 'record';
    const filtered = entries.filter((e) => e.id !== id);
    setEntries(filtered);
    setSrAnnouncement(`Deleted carbon footprint record for ${label}.`);
    
    // Transition automatic update to fast local calculation to avoid 429 limits
    setCoachInsight(generateLocalFallbackInsight(filtered));
  };

  // Re-run Coach advice
  const handleRefreshCoachInsight = () => {
    triggerCoachInsightRebuild(entries);
  };

  const triggerCoachInsightRebuild = async (currentEntries: CarbonEntry[]) => {
    setIsLoadingInsight(true);
    try {
      const response = await fetch('/api/coach/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: currentEntries,
          targetPercentage: settings.targetPercentage,
          gridEmissions: settings.gridEmissions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCoachInsight(data);
      } else {
        throw new Error('Coach API failed');
      }
    } catch (err) {
      console.warn('Silent coach advice reload experienced error, using local fallback calculations:', err);
      setCoachInsight(generateLocalFallbackInsight(currentEntries));
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // Export tracking summary as a beautifully formatted text/markdown file
  const handleExportSummary = () => {
    if (entries.length === 0) {
      alert("No entries recorded yet to export. Try adding some logs first!");
      return;
    }
    
    const topCategoryInfo = getTopEmissionCategory(entries);
    const savings = calculateCO2eWeeklySavings(entries, settings.customReferenceBaseline);
    
    let content = `# CarbonLens - Environmental Impact Summary\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `==============================================\n\n`;
    content += `## KEY STATS SUMMARY\n`;
    content += `- Total Monthly Ceiling Target: ${(settings.customReferenceBaseline * (1 - settings.targetPercentage / 100)).toFixed(0)} kg CO2e\n`;
    content += `- Logged Monthly Emissions: ${getMonthlyTotalCO2e().toFixed(2)} kg CO2e\n`;
    content += `- Estimated Weekly Savings: ${savings} kg CO2e\n`;
    content += `- Highest Carbon Driver: ${topCategoryInfo.category} (${topCategoryInfo.co2e} kg CO2e)\n\n`;
    
    content += `## ALL RECORDED ENTRIES (${entries.length})\n`;
    content += `----------------------------------------------\n`;
    content += `Date       | Category           | Subtype            | Qty   | Unit  | CO2e (kg) \n`;
    content += `----------------------------------------------\n`;
    entries.forEach((e) => {
      content += `${e.date.padEnd(10)} | ${e.category.padEnd(18)} | ${e.subtype.padEnd(18)} | ${e.quantity.toString().padEnd(5)} | ${e.unit.padEnd(5)} | ${e.co2e.toFixed(1).padEnd(5)}\n`;
    });
    content += `\n==============================================\n`;
    content += `Thank you for building low-carbon habits using CarbonLens AI!\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CarbonLens_Footprint_Summary_${new Date().toISOString().split('T')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSrAnnouncement("Generated CarbonLens environmental summary text file download.");
  };

  // Clear state reset
  const handleWipeDatabaseReset = () => {
    if (window.confirm('Do you explicitly intend to clear all logged carbon entries and reset settings? This action is irreversible.')) {
      setEntries([]);
      setSettings({
        targetPercentage: 15,
        gridEmissions: 0.71,
        nationalAverageKg: 1900,
        customReferenceBaseline: 250,
      });
      setCoachInsight(null);
      localStorage.removeItem('carbonlens_entries');
      localStorage.removeItem('carbonlens_settings');
      localStorage.removeItem('carbonlens_insight');
      setSrAnnouncement('Cleared all dynamic carbon footprint entries and restored settings. Dashboard has been reset.');
    }
  };

  // Helper to extract safe system date details (avoid UTC/local discrepancy)
  const getLocalTodayDate = () => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate()
    };
  };

  // Safe timezone aggregations
  const getTodayTotalCO2e = () => {
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
  };

  const todayTally = getTodayTotalCO2e();

  const getMonthlyTotalCO2e = () => {
    const { year, month } = getLocalTodayDate();
    return entries
      .filter((e) => {
        const parts = e.date.split('-');
        if (parts.length !== 3) return false;
        return parseInt(parts[0], 10) === year &&
               (parseInt(parts[1], 10) - 1) === month;
      })
      .reduce((sum, e) => sum + e.co2e, 0);
  };

  const monthlyTotal = getMonthlyTotalCO2e();

  // Current period entries for Quick Log Category Tile aggregations
  const getPeriodFilteredEntries = () => {
    const { year, month, day } = getLocalTodayDate();
    return entries.filter((e) => {
      const parts = e.date.split('-');
      if (parts.length !== 3) return false;
      const eYear = parseInt(parts[0], 10);
      const eMonth = parseInt(parts[1], 10) - 1;
      const eDay = parseInt(parts[2], 10);

      if (quickLogPeriod === 'today') {
        return eYear === year && eMonth === month && eDay === day;
      }
      if (quickLogPeriod === 'month') {
        return eYear === year && eMonth === month;
      }
      return true; // 'all'
    });
  };

  const currentPeriodEntries = getPeriodFilteredEntries();
  const totalCategorySum = currentPeriodEntries.reduce((sum, e) => sum + e.co2e, 0);

  // Get visual icon for the category leaf cluster
  const getCategoryLeafIcon = (cat: CarbonCategory) => {
    switch (cat) {
      case 'Transport': return <Car className="w-5 h-5" />;
      case 'Electricity': return <Zap className="w-5 h-5" />;
      case 'Food & Household': return <Utensils className="w-5 h-5" />;
      case 'Water': return <Droplet className="w-5 h-5" />;
      case 'Phone & Internet': return <Phone className="w-5 h-5" />;
      case 'Gas': return <Flame className="w-5 h-5" />;
      case 'Waste': return <Trash className="w-5 h-5" />;
      case 'Recycling': return <Recycle className="w-5 h-5" />;
      default: return null;
    }
  };

  // Sort and list 6 most recent entries
  const recentLogs = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div id="carbonlens-root" className="min-h-screen bg-stone-50 text-stone-850 font-sans selection:bg-emerald-200 select-none pb-12">
      
      {/* ARIA Live Region for accessibility screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>

      {/* Visual Brand Header Section */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Leaf className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-emerald-950 font-sans flex items-center gap-1">
                CarbonLens
              </span>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
                AI Footprint Coach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLoadRichDemoDataset}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold font-semibold transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Load Analytics Preset</span>
            </button>

            <button
              onClick={handleExportSummary}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-750 rounded-xl text-xs font-bold font-semibold transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Download text report of your footprint"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Summary</span>
            </button>

            <button
              onClick={handleWipeDatabaseReset}
              className="p-2 border border-stone-100 bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
              title="Clear all local footprint logs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Top running Tally show */}
      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-[2.5rem] p-6 text-white text-center shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute left-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="text-center sm:text-left space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-200">Today Tally</span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-4xl font-extrabold tracking-tight font-mono">
                {todayTally.toFixed(2)}
              </span>
              <span className="text-xs text-emerald-100 font-bold uppercase">kg CO2e</span>
            </div>
            <p className="text-[10px] text-teal-100 font-medium leading-relaxed leading-normal">
              Logged footprint entries compiled live for today.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-4.5 border border-white/5 flex gap-2 justify-center items-center divide-x divide-white/10 shrink-0 text-xs font-bold text-emerald-100">
            <div className="px-3 text-center">
              <span className="block text-[9px] uppercase text-emerald-200 font-black tracking-wider">Target ceiling</span>
              <span className="block text-base font-black text-white font-mono mt-0.5">
                {(settings.customReferenceBaseline * (1 - settings.targetPercentage / 100)).toFixed(0)} <span className="text-[10px] font-sans">kg/mo</span>
              </span>
            </div>
            <div className="px-3 text-center">
              <span className="block text-[9px] uppercase text-emerald-200 font-black tracking-wider">Logged Current Month</span>
              <span className="block text-base font-black text-white font-mono mt-0.5">
                {monthlyTotal.toFixed(1)} <span className="text-[10px] font-sans">kg</span>
              </span>
            </div>
          </div>
        </div>

        {/* CARBON HUD - ADOPTION PERFORMANCE SCORECARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(() => {
            const monthlyCeiling = settings.customReferenceBaseline * (1 - settings.targetPercentage / 100);
            const progressPct = parseFloat(Math.min(100, Math.max(0, (monthlyTotal / (monthlyCeiling || 1)) * 100)).toFixed(0));
            const weeklySavings = calculateCO2eWeeklySavings(entries, settings.customReferenceBaseline);
            const topCategoryInfo = getTopEmissionCategory(entries);
            const spotlightActionObj = getBestReductionAction(topCategoryInfo.category);

            const isOverBudget = monthlyTotal > monthlyCeiling;
            const progressColorClass = isOverBudget
              ? 'bg-rose-600'
              : progressPct >= 80
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            return (
              <>
                {/* Scorecard 1: Budget Ceiling Progress */}
                <div className="bg-white rounded-[2rem] border border-stone-200/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider block">
                      Target Ceiling Progress
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-stone-850 font-mono">
                        {progressPct}%
                      </span>
                      <span className="text-xs text-stone-500 font-bold">consumed</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full ${progressColorClass} transition-all duration-500`} style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <p className="text-[10px] text-stone-400 font-semibold leading-none flex items-center gap-1">
                      {isOverBudget ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-500 inline shrink-0" />
                          <span className="text-rose-600">Surpassed limit by {(monthlyTotal - monthlyCeiling).toFixed(1)} kg!</span>
                        </>
                      ) : (
                        <span>{(monthlyCeiling - monthlyTotal).toFixed(1)} kg remaining this month</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Scorecard 2: Estimated Weekly Savings */}
                <div className="bg-white rounded-[2rem] border border-stone-200/60 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-emerald-700 tracking-wider block">
                      Estimated Weekly Savings
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-emerald-800 font-mono">
                        {weeklySavings}
                      </span>
                      <span className="text-xs text-emerald-700 font-bold">kg CO2e</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 font-semibold mt-3 leading-relaxed">
                    Carbon trimmed this week relative to your budget limit baseline. Great work!
                  </p>
                </div>

                {/* Scorecard 3: Peak Footprint Category */}
                <div className="bg-white rounded-[2rem] border border-stone-200/60 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider block">
                      Peak Emission Driver
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 overflow-hidden">
                      <span className="text-lg font-black text-stone-850 truncate block tracking-tight">
                        {topCategoryInfo.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
                    <span className="text-[10px] text-stone-400 font-bold">Month Total:</span>
                    <span className="text-xs font-extrabold text-stone-850 font-mono">
                      {entries.filter(e => e.category === topCategoryInfo.category).reduce((sum, e) => sum + e.co2e, 0).toFixed(1)} kg
                    </span>
                  </div>
                </div>

                {/* Scorecard 4: Top Action Checkpoint */}
                <div className="bg-white rounded-[2rem] border border-stone-200/60 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-indigo-700 tracking-wider block">
                      Spotlight Habit Tweak
                    </span>
                    <p className="text-[11px] font-black text-stone-800 mt-1.5 leading-snug tracking-tight line-clamp-2 min-h-[2rem]">
                      {spotlightActionObj.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-indigo-50/60 pt-2 mt-2">
                    <span className="text-[9px] text-indigo-500 font-extrabold uppercase">Potential:</span>
                    <span className="text-[10px] font-bold text-indigo-700">
                      -{spotlightActionObj.savedKg} kg/mo offset
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Main Workspace Grid layouts */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* CHALLENGE ALIGNMENT & ONBOARDING SYSTEM */}
        <section aria-labelledby="challenge-onboarding-title" className="bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-xs space-y-8">
          
          {/* Top Grid: Mission & Highlight Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Hand: High impact checklist & Challenge statement */}
            <div className="space-y-4">
              <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block">
                Mission Statement
              </span>
              <h2 id="challenge-onboarding-title" className="text-2xl font-black text-stone-900 tracking-tight leading-none">
                Empower Your Low-Carbon Lifestyle
              </h2>
              
              <div className="bg-stone-50 border border-stone-100 p-4.5 rounded-2xl space-y-1.5">
                <p className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600 sm:shrink-0" />
                  <span>Why It Matters:</span>
                </p>
                <p className="text-[11px] text-stone-500 font-semibold leading-relaxed">
                  While most individuals actively wish to lower their environmental impact, they lack clear, calculated visibility into which daily choices actually carry the highest carbon significance. CarbonLens solves this by translating complex emission datasets into simple, real-time, measurable actions.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-black text-stone-800 uppercase tracking-wider">CarbonLens helps you:</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>1. Understand your footprint</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>2. Track daily activities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>3. Reduce through simple actions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>4. Get personalized AI insights</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Hand: 4 Core Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Understand', text: 'Analyze category-wise carbon breakdowns with professional reactive charts.', color: 'border-emerald-100 bg-emerald-50/20 text-emerald-800' },
                { title: 'Track', text: 'Log consumption points instantly through simple, tactile click tapping.', color: 'border-blue-100 bg-blue-50/20 text-blue-800' },
                { title: 'Reduce', text: 'Uncover immediate, actionable, carbon-saving adjustments.', color: 'border-indigo-100 bg-indigo-50/20 text-indigo-800' },
                { title: 'Personalize', text: 'Obtain deep, context-aware AI reduction advice powered by Gemini.', color: 'border-violet-100 bg-violet-50/20 text-violet-800' }
              ].map((feat, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${feat.color} space-y-1`}>
                  <h4 className="text-xs font-black uppercase tracking-wider">{feat.title}</h4>
                  <p className="text-[11px] text-stone-500 font-semibold leading-relaxed">{feat.text}</p>
                </div>
              ))}
            </div>

          </div>

          <hr className="border-t border-stone-100" />

          {/* Bottom Grid: Impact Journey Step Process */}
          <div className="space-y-4">
            <span className="block text-xs font-black text-stone-850 uppercase tracking-widest text-center">
              Your 4-Step Carbon Reduction Journey
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: 'Step 1', title: 'Log Lifestyle', desc: 'Input your energy, gas, water, or commute data in seconds.' },
                { step: 'Step 2', title: 'View Target CO2e', desc: 'Instantly watch your daily and monthly numbers sync.' },
                { step: 'Step 3', title: 'Get AI Advice', desc: 'Assemble custom, personalized recommendations for optimization.' },
                { step: 'Step 4', title: 'Track Savings', desc: 'Build steady habits and compare trends against benchmarks.' }
              ].map((journey, idx) => (
                <div key={idx} className="bg-stone-50 border border-stone-100 p-5 rounded-2xl space-y-2 relative">
                  <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                    {journey.step}
                  </span>
                  <div>
                    <h5 className="text-xs font-black text-stone-800 tracking-tight leading-snug">{journey.title}</h5>
                    <p className="text-[10px] text-stone-400 font-semibold leading-relaxed mt-1">{journey.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>
        
        {/* Quick-Add Cluster Layout and Footprint/leaf representation */}
        <section aria-labelledby="track-heading" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Organic Tapping Center
              </span>
              <h2 id="track-heading" className="text-xl font-black text-stone-800 tracking-tight mt-1.5 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                TRACK: Quick-Log Footprint Leaf Cluster
              </h2>
              <p className="text-stone-400 text-xs font-medium mt-0.5">
                Tap any category tile below to quickly record daily emissions. Take under 10 seconds.
              </p>
            </div>
          </div>

          {/* Ambiguity Resolution Period Selector & Mathematical Reconciliation Audit Check */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-100/50 p-4 rounded-3xl border border-stone-200/50">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-black text-stone-500 uppercase tracking-widest block">
                Logged Period:
              </span>
              <div className="bg-white border border-stone-200 p-1 rounded-2xl flex gap-1 shadow-xs">
                {(['today', 'month', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuickLogPeriod(p)}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      quickLogPeriod === p
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {p === 'today' ? 'Today Only' : p === 'month' ? 'This Month' : 'All-Time'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-2xl font-bold tracking-tight shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Category Reconciler: <b>{totalCategorySum.toFixed(1)} kg CO2e</b></span>
              </span>
            </div>
          </div>

          {/* Leaf Shape organic grid cluster layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {(Object.keys(CATEGORY_DETAILS) as CarbonCategory[]).map((cat) => {
              const details = CATEGORY_DETAILS[cat];
              // Count and sum logged entries in this category for the active display period
              const count = currentPeriodEntries.filter((e) => e.category === cat).length;
              const catSum = currentPeriodEntries.filter((e) => e.category === cat).reduce((sum, e) => sum + e.co2e, 0);

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedQuickAddCategory(cat)}
                  className={`relative p-5 rounded-tr-[2.2rem] rounded-bl-[2.2rem] rounded-tl-xl rounded-br-xl border text-center transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95 cursor-pointer flex flex-col justify-between h-[165px] overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/55 ${details.bgColor} ${details.borderColor}`}
                  aria-label={`Quick log ${cat} consumption. Current period logged amount is ${catSum.toFixed(1)} kilograms.`}
                >
                  <div className="flex justify-between items-start">
                    {/* Icon container */}
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: details.color }}
                    >
                      {getCategoryLeafIcon(cat)}
                    </div>

                    {/* Quick quantity counts */}
                    {count > 0 && (
                      <span className="text-[9px] bg-stone-900 text-white rounded-full px-2 py-0.5 font-black">
                        {count}x
                      </span>
                    )}
                  </div>

                  <div>
                    {/* Multi-line wrapping text layout for long names like "Food & Household" and "Phone & Internet" */}
                    <span className="text-xs font-black text-stone-800 block text-left leading-normal break-words whitespace-normal tracking-tight min-h-[2.2rem]">
                      {cat}
                    </span>
                    <span 
                      className="text-[10px] font-bold block text-left mt-1"
                      style={{ color: details.color }}
                    >
                      {catSum > 0 ? `+${catSum.toFixed(1)}` : catSum.toFixed(1)} kg CO2e
                    </span>
                  </div>

                  {/* Bottom custom prompt view trigger */}
                  <div className="flex justify-end pr-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailCategory(cat);
                      }}
                      className="text-[9px] hover:underline font-extrabold text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      Logs & Tips →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* REDUCE: personalized AI and offline carbon advice coach */}
        <section aria-labelledby="reduce-heading" className="space-y-4">
          <div className="border-l-4 border-emerald-500 pl-3">
            <h3 id="reduce-heading" className="text-sm font-black text-emerald-850 uppercase tracking-widest">
              REDUCE: Personalized AI Recommendations
            </h3>
          </div>
          <CoachCard
            entries={entries}
            targetPercentage={settings.targetPercentage}
            gridEmissions={settings.gridEmissions}
            insight={coachInsight}
            onRefreshInsight={handleRefreshCoachInsight}
            isLoadingInsight={isLoadingInsight}
          />
        </section>

        {/* TRACK: Gmail, Calendar, Infrastructure data feeds */}
        <section aria-labelledby="track-sync-heading" className="space-y-4">
          <div className="border-l-4 border-emerald-500 pl-3">
            <h3 id="track-sync-heading" className="text-sm font-black text-emerald-850 uppercase tracking-widest">
              TRACK: Live Ecosystem Workspace Feeds
            </h3>
          </div>
          <WorkspaceSyncSandbox
            onAddEntry={handleAddNewEntry}
            gridEmissions={settings.gridEmissions}
          />
        </section>

        {/* PROGRESS: Goal Streak habits and budget control tracker */}
        <section aria-labelledby="progress-heading" className="space-y-4">
          <div className="border-l-4 border-emerald-500 pl-3">
            <h3 id="progress-heading" className="text-sm font-black text-emerald-850 uppercase tracking-widest">
              PROGRESS: Core Baseline Settings & Streak Controls
            </h3>
          </div>
          <GoalStreakCard
            entries={entries}
            settings={settings}
            onUpdateSettings={setSettings}
          />
          <BenchmarkBanner
            monthlyAmountKg={monthlyTotal}
            benchmarkConstantKgYearly={settings.nationalAverageKg}
          />
        </section>

        {/* UNDERSTAND: Charts, analysis overlays, and database logs audits */}
        <section aria-labelledby="understand-heading" className="space-y-4">
          <div className="border-l-4 border-emerald-500 pl-3">
            <h3 id="understand-heading" className="text-sm font-black text-emerald-850 uppercase tracking-widest">
              UNDERSTAND: Data Breakdowns & Audit Trails
            </h3>
          </div>
          <BreakdownChart entries={entries} />
          
          {/* Recent logs audit section */}
          {entries.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <History className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-800">Recent Tracking Logs Audit</h4>
                  <p className="text-[10px] text-stone-400 font-medium">Review and modify recent carbon records</p>
                </div>
              </div>

              <div className="divide-y divide-stone-100">
                {recentLogs.map((entry) => {
                  const details = CATEGORY_DETAILS[entry.category];
                  return (
                    <div key={entry.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: details.color }} />
                          <span className="font-extrabold text-[#1B3022]">{entry.category}</span>
                          <span className="text-stone-400">•</span>
                          <span className="text-stone-500 font-medium">{entry.subtype}</span>
                          {entry.notes && (
                            <span className="text-[9px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-400">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          Logged {entry.date} with {entry.quantity} {entry.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-black ${entry.co2e < 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                          {entry.co2e > 0 ? `+${entry.co2e.toFixed(1)}` : entry.co2e.toFixed(1)} kg CO2e
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 px-1.5 hover:bg-rose-50 rounded-lg text-stone-400 hover:text-rose-600 cursor-pointer"
                          title="Delete log"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ASSUMPTIONS & METHODS TRANSPARENCY CARD */}
        <section aria-labelledby="assumptions-methodology-title" className="bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 p-6 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 id="assumptions-methodology-title" className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Assumptions & Methodology Transparency
              </h3>
              <p className="text-[10px] text-stone-400 font-semibold">How CarbonLens translates routine lifestyle actions into physical metrics</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-stone-600 leading-relaxed">
            <div className="space-y-1.5 p-3.5 bg-white/40 border border-stone-100 rounded-xl">
              <p className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Standardized Estimation Engine:</span>
              </p>
              <p className="text-[10.5px] text-stone-500 font-semibold leading-snug">
                All CO2e values displayed on the dashboard are mathematically derived proxies intended for personal educational habit-building and environmental awareness, rather than certified financial or commercial carbon auditing.
              </p>
            </div>
            <div className="space-y-1.5 p-3.5 bg-white/40 border border-stone-100 rounded-xl">
              <p className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Formula Mechanics:</span>
              </p>
              <p className="text-[10.5px] text-stone-500 font-semibold leading-snug">
                Our calculations operate under the absolute physical formula: <code className="font-mono bg-stone-100 text-stone-700 px-1 py-0.5 rounded text-[9.5px]">Activity Quantity × Emission Factor = Estimated CO2e kg</code>, utilizing compiled multipliers simplified for individual consumption tracking.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 pt-16 text-center text-stone-400 text-[10px] uppercase font-bold tracking-wider space-y-1">
        <p>CarbonLens Coach • Nature-first Environmental Resonance</p>
        <p>© 2026 CarbonLens Workspace. All Rights Reserved.</p>
      </footer>

      {/* MODALS RENDERING */}
      <QuickAddModal
        isOpen={selectedQuickAddCategory !== null}
        onClose={() => setSelectedQuickAddCategory(null)}
        category={selectedQuickAddCategory}
        gridEmissions={settings.gridEmissions}
        onAddEntry={handleAddNewEntry}
      />

      <CategoryDetailModal
        isOpen={selectedDetailCategory !== null}
        onClose={() => setSelectedDetailCategory(null)}
        category={selectedDetailCategory}
        entries={entries}
        onDeleteEntry={handleDeleteEntry}
      />

    </div>
  );
}
