/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CarbonCategory, CarbonEntry } from '../types';
import { CATEGORY_DETAILS, calculateCO2e } from '../constants';
import {
  Car,
  Zap,
  Utensils,
  Droplet,
  Phone,
  Flame,
  Trash,
  Recycle,
  X,
  Plus,
  Compass
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CarbonCategory | null;
  gridEmissions: number;
  onAddEntry: (entry: Omit<CarbonEntry, 'id'>) => void;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  category,
  gridEmissions,
  onAddEntry,
}: QuickAddModalProps) {
  if (!isOpen || !category) return null;

  const details = CATEGORY_DETAILS[category];
  const [subtype, setSubtype] = useState(details.subtypes[0]?.name || '');
  const [quantity, setQuantity] = useState<string>(
    String(details.subtypes[0]?.defaultVal || 1)
  );
  const [isProcessed, setIsProcessed] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Handle category change reset
  React.useEffect(() => {
    setSubtype(details.subtypes[0]?.name || '');
    setQuantity(String(details.subtypes[0]?.defaultVal || 1));
    setIsProcessed(false);
    setNotes('');
  }, [category, details]);

  const numericQuantity = parseFloat(quantity) || 0;
  const calculatedCO2 = calculateCO2e(
    category,
    subtype,
    numericQuantity,
    category === 'Food & Household' ? isProcessed : false,
    gridEmissions
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericQuantity <= 0) return;

    onAddEntry({
      category,
      subtype,
      quantity: numericQuantity,
      unit: details.unit,
      date,
      co2e: calculatedCO2,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'Transport': return <Car className="w-6 h-6" />;
      case 'Electricity': return <Zap className="w-6 h-6" />;
      case 'Food & Household': return <Utensils className="w-6 h-6" />;
      case 'Water': return <Droplet className="w-6 h-6" />;
      case 'Phone & Internet': return <Phone className="w-6 h-6" />;
      case 'Gas': return <Flame className="w-6 h-6" />;
      case 'Waste': return <Trash className="w-6 h-6" />;
      case 'Recycling': return <Recycle className="w-6 h-6" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        id="quick-add-dialog"
        className="bg-white rounded-[2rem] border border-emerald-50 max-w-md w-full shadow-2xl overflow-hidden relative"
      >
        {/* Banner Headers */}
        <div 
          className="p-6 text-white flex items-center justify-between"
          style={{ backgroundColor: details.color }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              {getCategoryIcon()}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                Log {category}
              </h3>
              <p className="text-xs text-white/80 font-medium">Under 10 seconds tracking</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 px-2.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Subtype Dropdown */}
          <div>
            <label htmlFor="subtype-select" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Emission Class / Subtype
            </label>
            <select
              id="subtype-select"
              value={subtype}
              onChange={(e) => {
                setSubtype(e.target.value);
                const sub = details.subtypes.find(s => s.name === e.target.value);
                if (sub) setQuantity(String(sub.defaultVal));
              }}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:outline-2 focus:outline-emerald-500"
            >
              {details.subtypes.map((sub) => (
                <option key={sub.name} value={sub.name}>
                  {sub.name} ({sub.factor > 0 ? `+${sub.factor}` : sub.factor} kg CO2e)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input with inline unit */}
          <div>
            <label htmlFor="quantity-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Quantity / Distance ({details.unit})
            </label>
            <div className="relative">
              <input
                id="quantity-input"
                type="number"
                step="any"
                min="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter amount..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:outline-2 focus:outline-emerald-500 pr-16"
              />
              <span className="absolute right-4 top-3.5 text-xs text-stone-400 font-bold uppercase">
                {details.unit}
              </span>
            </div>
          </div>

          {/* Processed Food Lifecyle Premium (Only for Food & Household category) */}
          {category === 'Food & Household' && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
              <div className="max-w-[75%]">
                <span className="text-xs font-bold text-orange-900 block">Packaged/Processed Premium</span>
                <span className="text-[10px] text-orange-850 block leading-tight">
                  Adds 20% carbon premium covering cold manufacturing supply chain lifecycle.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isProcessed}
                  onChange={(e) => setIsProcessed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-orange-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-orange-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          )}

          {/* Advanced fields toggled or standard */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Log Date
              </label>
              <input
                id="date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:outline-2 focus:outline-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="notes-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Short Notes (Optional)
              </label>
              <input
                id="notes-input"
                type="text"
                placeholder="e.g. daily commute"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:outline-2 focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Real-time Tally Calculation Show */}
          <div className="bg-stone-50 border border-stone-105 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Estimated Impact</span>
              <span className={`text-xl font-black ${calculatedCO2 < 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                {calculatedCO2 > 0 ? `+${calculatedCO2.toFixed(2)}` : calculatedCO2.toFixed(2)} kg CO2e
              </span>
            </div>
            {calculatedCO2 < 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold uppercase animate-pulse">
                Carbon Offset
              </span>
            )}
          </div>

          {/* Submit action */}
          <button
            type="submit"
            className="w-full py-4 text-white font-bold rounded-2xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: details.color }}
          >
            <Plus className="w-4 h-4" />
            Add to Footprint Tally
          </button>
        </form>
      </div>
    </div>
  );
}
