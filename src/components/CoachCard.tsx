/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { CoachInsight, ChatMessage, CarbonEntry } from '../types';
import { BrainCircuit, Send, Sparkles, MessageSquare, ListCollapse, RefreshCw, Smartphone } from 'lucide-react';

interface CoachCardProps {
  entries: CarbonEntry[];
  targetPercentage: number;
  gridEmissions: number;
  insight: CoachInsight | null;
  onRefreshInsight: () => void;
  isLoadingInsight: boolean;
}

export default function CoachCard({
  entries,
  targetPercentage,
  gridEmissions,
  insight,
  onRefreshInsight,
  isLoadingInsight,
}: CoachCardProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSendingMessage) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
          message: text,
          gridEmissions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const serverMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, serverMsg]);
      } else {
        throw new Error('Chat failed');
      }
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: "I appreciate your patience. Let's try sending that question to my sustainability logic center again — my connection is having a quick rest!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    handleSendMessage(text);
  };

  const suggestions = [
    "What if I switch to an EV?",
    "How can I cut 10kg CO2 this week?",
    "Suggest a simple low-carbon dinner recipe.",
    "Help me minimize my Internet carbon footprint."
  ];

  return (
    <div id="ai-coach-card" className="bg-gradient-to-br from-emerald-950 to-teal-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
      {/* Visual background leaf curves */}
      <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute left-1/3 top-0 w-48 h-48 bg-teal-400/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Recommended Insight side */}
      <div className="flex-1 space-y-5 flex flex-col justify-between py-1 relative z-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/30 text-emerald-250 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-inner">
              <BrainCircuit className="w-4 h-4 text-teal-300 animate-pulse" />
              AI Coach Insight
            </span>
            <button
              onClick={onRefreshInsight}
              disabled={isLoadingInsight}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white px-3 py-1.5 rounded-full border border-white/5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsight ? 'animate-spin' : ''}`} />
              {insight ? 'Regenerate' : 'Analyze Footprint'}
            </button>
          </div>

          {isLoadingInsight ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-stone-200 animate-pulse font-medium">Analyzing entries, simulating carbon offsets...</p>
            </div>
          ) : !insight ? (
            <div className="py-16 text-center space-y-4 bg-white/5 rounded-2xl p-6 border border-white/5">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-emerald-100">Click below to activate your personalized coach's carbon lens!</p>
              <button
                onClick={onRefreshInsight}
                className="bg-emerald-500 hover:bg-emerald-400 font-bold text-white text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                Assemble Recommendations
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-emerald-100 italic">
                "{insight.headlineInsight.replace(/\*\*/g, '')}"
              </p>

              {/* Quantified Action Spotlight */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:border-white/15 transition-all">
                <span className="text-[9px] font-black tracking-widest text-teal-300 uppercase block mb-1">
                  Proposed Weekly reduction
                </span>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">{insight.quantifiedAction.title}</h4>
                  <span className="shrink-0 bg-emerald-505 text-white bg-emerald-600 px-2.5 py-1 rounded-full text-xs font-black shadow-xs">
                    -{insight.quantifiedAction.savedKg} kg CO2e
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1.5 leading-relaxed">
                  {insight.quantifiedAction.description}
                </p>
              </div>

              {/* Encouragement Accent */}
              <div className="flex items-start gap-2.5 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/15">
                <span className="text-base text-yellow-400">🌟</span>
                <p className="text-xs text-emerald-100 leading-normal">
                  <span className="font-bold">Strength Observation:</span> {insight.encouragement}
                </p>
              </div>
            </div>
          )}
        </div>

        {insight && (
          <div className="border-t border-white/5 pt-3">
            <button
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-2 text-xs text-teal-300 hover:text-white transition-colors cursor-pointer"
            >
              <ListCollapse className="w-4 h-4" />
              <span>{showTips ? 'Hide category tips' : 'Show additional actions'}</span>
            </button>
            {showTips && (
              <ul className="mt-2.5 space-y-1.5 text-xs text-emerald-200 list-disc pl-4">
                {insight.tips.map((tip, idx) => (
                  <li key={idx} className="leading-relaxed hover:text-white transition-colors">{tip}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Coach Chat side */}
      <div className="flex-1 bg-black/25 backdrop-blur-xs rounded-[2rem] border border-white/5 flex flex-col justify-between max-h-[420px] relative z-10">
        {/* Chat Headers */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            <div>
              <span className="text-xs font-bold block">CarbonLens Chat Coach</span>
              <span className="text-[9px] text-emerald-300/80 block">Active • Real-time reasoning</span>
            </div>
          </div>
          <MessageSquare className="w-4 h-4 text-teal-400" />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar max-h-[290px]">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-3">
              <BrainCircuit className="w-8 h-8 text-teal-300/30" />
              <p className="text-xs text-emerald-250">
                Ask me scenario-based questions like **"What if I switch to an EV?"** or cooking swaps. I hold your entries list in mind!
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white/10 text-emerald-50 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[8px] text-emerald-300/50 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))
          )}
          {isSendingMessage && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-2 px-3 rounded-2xl w-fit mr-auto">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-200"></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-white/5 bg-black/10 rounded-b-[2rem]">
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-[9px] bg-white/5 hover:bg-white/10 text-emerald-200 hover:text-white border border-white/5 px-2 py-1 rounded-full transition-colors cursor-pointer text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(userInput);
            }}
            className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-1 focus-within:border-emerald-500/50"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your climate coaching question..."
              className="flex-1 bg-transparent border-none text-xs text-white placeholder-stone-400 focus:outline-none py-1.5 py-2"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isSendingMessage}
              className="p-1 px-2.5 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl transition-colors shrink-0 disabled:opacity-40 cursor-pointer text-xs font-bold"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
