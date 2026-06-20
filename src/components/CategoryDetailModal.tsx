/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CarbonCategory, CarbonEntry } from '../types';
import { CATEGORY_DETAILS } from '../constants';
import { X, Calendar, Trash2, ArrowDownCircle, Info, Sparkles, Footprints } from 'lucide-react';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CarbonCategory | null;
  entries: CarbonEntry[];
  onDeleteEntry: (id: string) => void;
}

export default function CategoryDetailModal({
  isOpen,
  onClose,
  category,
  entries,
  onDeleteEntry,
}: CategoryDetailModalProps) {
  if (!isOpen || !category) return null;

  const details = CATEGORY_DETAILS[category];
  const categoryEntries = entries.filter((e) => e.category === category);

  // Subtype calculations
  const subtypeBreakdown: Record<string, { qty: number; co2e: number }> = {};
  categoryEntries.forEach((entry) => {
    if (!subtypeBreakdown[entry.subtype]) {
      subtypeBreakdown[entry.subtype] = { qty: 0, co2e: 0 };
    }
    subtypeBreakdown[entry.subtype].qty += entry.quantity;
    subtypeBreakdown[entry.subtype].co2e += entry.co2e;
  });

  const categoryTotalCO2e = categoryEntries.reduce((acc, e) => acc + e.co2e, 0);

  // Category specific AI coach tips list
  const categoryCoachTips: Record<CarbonCategory, string> = {
    Transport: "Transport is a major direct emissions sector because burning diesel and petrol produces high quantities of greenhouse gases. I suggest pooling commutes, choosing metro rail lines that skip single-occupancy gridlocks, and keeping tire pressure steady to save 12-18% fuel costs instantly.",
    Electricity: "Electricity carbon footprint stems from fossil fuels burned at the grid average plant (0.71 kg CO2/kWh). Switching to LED home lighting is the lowest-friction, highest ROI step. Set your air conditioner to 24°C; every degree cooler adds ~6% more consumption load.",
    'Food & Household': "Beef, mutton, and processed meals carrying extensive multi-layered packaging hold very high embedded resource footprints due to animal agriculture and logistics. Prioritize fresh local grains and farm veg, and use meal planning to keep household food decay at zero.",
    Water: "Pumping, treatment, and distribution consume notable electricity. Keep water carbon low by washing veggies in bowls to save water, using aerators, and ensuring dripping pipes are repaired instantly.",
    'Phone & Internet': "Streaming video continuously over mobile network nodes requires substantial remote server farm cooling. Download favorite shows on local Wi-Fi and consider smartphone manufacturing lifetime extensions beyond three years to amortize its manufacturing footprint (80 kg).",
    Gas: "Piped or LPG heating fuels burn cleanly but are non-renewable hydrocarbons. Cover cooking pots with lids to simmer dishes 30% faster, and pre-soak legumes or rice prior to turning on gas burners.",
    Waste: "Anaerobic garbage decomposition in landfills produces methane, which is 25x more thermal-gaseous than CO2.Segregating organic peels enables high-value aerated compost creation, reducing direct household waste contributions.",
    Recycling: "Recycling is powerful offset logic! It diverts metals, clean papers, and cardboard from landfill, receiving a direct -0.3 kg CO2/kg positive credit. Rinse plastic containers to avoid landfill route rejection."
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        id="category-detail-dialog"
        className="bg-white rounded-[2rem] border border-stone-100 max-w-lg w-full shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        {/* Detail Header area */}
        <div 
          className="p-6 text-white shrink-0 relative"
          style={{ backgroundColor: details.color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-white/20 rounded-xl">
                <Footprints className="w-5 h-5 text-white" />
              </span>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{category} Lens</h3>
                <span className="text-[10px] uppercase font-bold text-white/80 block tracking-widest mt-0.5">
                  Deep Category Insights
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 px-2.5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-white/95 mt-4 leading-relaxed font-medium">
            {details.description}
          </p>

          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center bg-white/5 -mx-6 px-6 -mb-6 py-4">
            <span className="text-xs font-bold text-white/90">Cumulative Impact</span>
            <span className="text-lg font-black text-white">
              {categoryTotalCO2e.toFixed(1)} kg CO2e
            </span>
          </div>
        </div>

        {/* Scrollable details container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          
          {/* Subtype quantitative breakdown list */}
          <div>
            <h4 className="text-xs font-black text-stone-700 uppercase tracking-widest mb-3">Subtype Breakdown</h4>
            {categoryEntries.length === 0 ? (
              <div className="bg-stone-50 rounded-xl p-4 border text-center text-xs text-stone-400">
                No entries recorded for {category} yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(subtypeBreakdown).map(([sub, data]) => {
                  const percent = categoryTotalCO2e !== 0 ? (data.co2e / categoryTotalCO2e) * 100 : 0;
                  return (
                    <div key={sub} className="bg-stone-50 border border-stone-105 rounded-xl p-3.5 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-extrabold text-stone-800 block">{sub}</span>
                        <span className="text-[10px] text-stone-500 block font-medium mt-0.5">
                          Tally: {data.qty.toFixed(1)} {details.unit}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-800 block">
                          {data.co2e.toFixed(1)} kg CO2e
                        </span>
                        {categoryTotalCO2e > 0 && data.co2e > 0 && (
                          <span className="text-[9px] text-stone-400 font-semibold block">{percent.toFixed(0)}% contribution</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Coach Specific Recommendation text box */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4.5 rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-lg mt-0.5 shadow-sm shadow-emerald-250">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-800 block mb-1">
                  Coach Category Tip
                </span>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {categoryCoachTips[category]}
                </p>
              </div>
            </div>
          </div>

          {/* Tracked Entries list scroll view with delete option */}
          <div>
            <h4 className="text-xs font-black text-stone-700 uppercase tracking-widest mb-3">Logged History Log</h4>
            {categoryEntries.length === 0 ? (
              <div className="border border-dashed border-stone-200 rounded-xl p-6 text-center text-xs text-stone-400">
                Log entries will compilation history list here.
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                {categoryEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="border border-stone-105 rounded-xl p-3 flex justify-between items-center text-xs hover:bg-stone-50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-700">{entry.subtype}</span>
                        {entry.notes && (
                          <span className="text-[9px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">
                            {entry.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>{entry.date}</span>
                        <span>•</span>
                        <span>{entry.quantity} {entry.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`font-black ${entry.co2e < 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                        {entry.co2e > 0 ? `+${entry.co2e.toFixed(1)}` : entry.co2e.toFixed(1)} kg
                      </span>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-1 px-1.5 hover:bg-red-50 hover:text-red-650 text-stone-400 rounded-lg transition-all cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
