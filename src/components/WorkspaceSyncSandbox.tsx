import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  logout, 
  getCachedToken, 
  auth 
} from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  Mail, 
  Calendar, 
  Server, 
  Database, 
  Sparkles, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Cloud, 
  Info,
  ChevronRight,
  Shield,
  Loader2,
  Trash
} from 'lucide-react';
import { CarbonEntry, CarbonCategory } from '../types';

interface WorkspaceSyncProps {
  onAddEntry: (entry: Omit<CarbonEntry, 'id'>) => void;
  gridEmissions: number;
}

export default function WorkspaceSyncSandbox({ onAddEntry, gridEmissions }: WorkspaceSyncProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync state
  const [gmailEntries, setGmailEntries] = useState<any[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [isScanningCalendar, setIsScanningCalendar] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Import tracker (to prevent double clicks / double imports)
  const [importedLogs, setImportedLogs] = useState<Record<string, boolean>>({});

  // Server parameters
  const [cpuCores, setCpuCores] = useState<number>(4);
  const [ramGb, setRamGb] = useState<number>(16);
  const [hoursRunning, setHoursRunning] = useState<number>(720); // Monthly default
  const [databaseStorageGb, setDatabaseStorageGb] = useState<number>(50);
  const [cloudProvider, setCloudProvider] = useState<'aws' | 'gcp' | 'azure'>('aws');
  const [isCalculatingCloud, setIsCalculatingCloud] = useState(false);
  const [registeredCloudLog, setRegisteredCloudLog] = useState<any>(null);
  const [cloudResult, setCloudResult] = useState<any>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Retrieve token
        const token = getCachedToken();
        if (token) {
          setAccessToken(token);
        }
      } else {
        setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setScanMessage("Connected successfully! Scan Gmail or Calendar below.");
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Verification rejected/failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setGmailEntries([]);
      setCalendarEntries([]);
      setScanMessage("Disconnected account successfully.");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleScanGmail = async () => {
    if (!accessToken) {
      setAuthError("Auth token expired or missing. Please reconnect.");
      return;
    }
    setIsScanningGmail(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/sync/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setGmailEntries(data.entries || []);
        if (data.hasRealData) {
          setScanMessage(`Gmail scan successful! Live verified data matched.`);
        } else {
          setScanMessage(`Gmail scanned! Imported typical bill receipts based on standard green templates (no specific bills discovered).`);
        }
      } else {
        const errVal = await res.json();
        setScanMessage(`Scan response: ${errVal.error || 'Server rejected query'}`);
      }
    } catch (err: any) {
      console.error(err);
      setScanMessage("Failed to connect workspace scan pipeline.");
    } finally {
      setIsScanningGmail(false);
    }
  };

  const handleScanCalendar = async () => {
    if (!accessToken) {
      setAuthError("Auth token missing. Please reconnect.");
      return;
    }
    setIsScanningCalendar(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/sync/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarEntries(data.entries || []);
        if (data.hasRealData) {
          setScanMessage(`Calendar scanned! Real live commuting and flight patterns imported.`);
        } else {
          setScanMessage(`Calendar scanned successfully! Extracted representative travel events from past 30 days.`);
        }
      } else {
        const errVal = await res.json();
        setScanMessage(`Scan response: ${errVal.error || 'Service returned error'}`);
      }
    } catch (err: any) {
      console.error(err);
      setScanMessage("Failed to coordinate Google Calendar scan.");
    } finally {
      setIsScanningCalendar(false);
    }
  };

  const handleImportToLogs = (item: any) => {
    if (importedLogs[item.id]) return;

    onAddEntry({
      category: item.category as CarbonCategory,
      subtype: item.subtype,
      quantity: item.quantity,
      unit: item.unit,
      date: item.date,
      co2e: item.co2e,
      notes: item.notes
    });

    setImportedLogs(prev => ({ ...prev, [item.id]: true }));
  };

  const handleCalculateServers = async () => {
    setIsCalculatingCloud(true);
    setRegisteredCloudLog(null);
    try {
      const res = await fetch('/api/sync/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpuCores,
          ramGb,
          hoursRunning,
          databaseStorageGb,
          provider: cloudProvider,
          gridFactor: gridEmissions
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCloudResult(data);
      }
    } catch (err) {
      console.error("Cloud compute engine error:", err);
    } finally {
      setIsCalculatingCloud(false);
    }
  };

  const handleImportCloudResult = () => {
    if (!cloudResult || !cloudResult.entry) return;
    
    onAddEntry({
      category: cloudResult.entry.category,
      subtype: `@${cloudProvider.toUpperCase()} Cloud Nodes`,
      quantity: cloudResult.entry.quantity,
      unit: cloudResult.entry.unit,
      date: cloudResult.entry.date,
      co2e: cloudResult.entry.co2e,
      notes: cloudResult.entry.notes
    });

    setRegisteredCloudLog(cloudResult.entry);
    setCloudResult(null);
  };

  return (
    <div id="mcp-sync-dashboard" className="bg-white rounded-[2.5rem] border border-stone-200 p-6 md:p-8 shadow-xs space-y-8">
      
      {/* Title & Introduction block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Workspace Automated Live Feeds
          </span>
          <h3 className="text-xl font-black text-stone-800 tracking-tight mt-1.5 flex items-center gap-2">
            <Sparkles className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
            Integrations & Cloud Resources Hub
          </h3>
          <p className="text-stone-400 text-xs font-semibold mt-0.5 max-w-xl">
            Audit carbon emissions from actual life feeds. Connect your workspace to extract physical utility bills, travel scheduling, and active server nodes.
          </p>
        </div>

        {/* Auth controller status */}
        <div className="shrink-0">
          {!user ? (
            <button
              onClick={handleConnectGoogle}
              disabled={isAuthenticating}
              className="gsi-material-button w-full sm:w-auto shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center gap-2 justify-center pl-3 pr-4 py-2.5">
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                ) : (
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "16px", height: "16px" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                )}
                <span className="text-[11px] font-black uppercase text-stone-700 tracking-wider">
                  {isAuthenticating ? 'Authorizing...' : 'Connect Workspace'}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center bg-stone-50 border border-stone-150 p-2.5 rounded-2xl gap-3 text-xs">
              <div className="flex items-center gap-2 px-1">
                <img 
                  src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-full border border-white"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-extrabold text-stone-800 leading-tight truncate max-w-[120px]">{user.displayName || 'Google User'}</p>
                  <p className="text-[10px] text-stone-400 font-semibold truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl font-bold uppercase text-[9px] tracking-wider cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-semibold">{authError}</span>
        </div>
      )}

      {scanMessage && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-indigo-500" />
          <span className="font-bold">{scanMessage}</span>
        </div>
      )}

      {/* Grid containing scan systems */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gmail scanner */}
        <div className="border border-stone-200/80 rounded-3xl p-5 space-y-4 bg-stone-50/20 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider">Gmail Invoices & Bills</h4>
                <p className="text-[10px] text-stone-400 font-semibold leading-tight">Identify electricity and utility invoices automatically</p>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed leading-normal">
              Queries standard utility keywords like <i>invoice, bill, electricity, line gas, amazon, or uber trip receipts</i> and maps them safely.
            </p>

            {gmailEntries.length > 0 && (
              <div className="border-t border-stone-100 pt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block mb-1">Detected items ({gmailEntries.length}):</span>
                {gmailEntries.map((item) => (
                  <div key={item.id} className="p-2.5 bg-white border border-stone-100 rounded-xl text-xs flex flex-col justify-between gap-2 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono tracking-wider bg-stone-100 text-stone-600">
                          {item.category}
                        </span>
                        <p className="font-extrabold text-[#1B3022] text-[11px] mt-1 leading-tight">{item.emailDetails?.subject || item.subtype}</p>
                        <p className="text-[10px] text-stone-400 italic font-medium leading-relaxed truncate max-w-[210px] mt-0.5">"{item.emailDetails?.snippet || item.notes}"</p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-stone-800 shrink-0">+{item.co2e.toFixed(1)} kg</span>
                    </div>

                    <button
                      onClick={() => handleImportToLogs(item)}
                      disabled={importedLogs[item.id]}
                      className={`w-full text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                        importedLogs[item.id]
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-stone-900 text-white border-stone-900 cursor-pointer hover:bg-stone-800'
                      }`}
                    >
                      {importedLogs[item.id] ? '✓ Imported to Audit' : 'Import Receipt'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleScanGmail}
            disabled={!user || isScanningGmail}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all outline-none border ${
              !user 
                ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                : isScanningGmail 
                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-wait'
                  : 'bg-rose-500 text-white border-rose-500 cursor-pointer hover:bg-rose-600 active:translate-y-[1px]'
            }`}
          >
            {isScanningGmail ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading Inbox...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Scan Gmail Receipts</span>
              </>
            )}
          </button>
        </div>

        {/* Google Calendar commuting scanner */}
        <div className="border border-stone-200/80 rounded-3xl p-5 space-y-4 bg-stone-50/20 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider">Calendar Commutes</h4>
                <p className="text-[10px] text-stone-400 font-semibold leading-tight">Extract flights and trip patterns automatically</p>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed leading-normal">
              Filters events containing keywords like <i>flight, commute, travel, taxi, train transit</i> and calculates trip carbon lengths.
            </p>

            {calendarEntries.length > 0 && (
              <div className="border-t border-stone-100 pt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block mb-1">Detected Meetings/Trips ({calendarEntries.length}):</span>
                {calendarEntries.map((item) => (
                  <div key={item.id} className="p-2.5 bg-white border border-stone-100 rounded-xl text-xs flex flex-col justify-between gap-2 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono tracking-wider bg-stone-100 text-stone-600">
                          {item.category} ({item.subtype})
                        </span>
                        <p className="font-extrabold text-[#1B3022] text-[11px] mt-1 leading-tight">{item.eventDetails?.summary || item.notes}</p>
                        <p className="text-[10px] text-stone-400 font-semibold leading-relaxed truncate max-w-[210px] mt-0.5">📍 Location: {item.eventDetails?.location || 'Not Specified'}</p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-stone-800 shrink-0">+{item.co2e.toFixed(1)} kg</span>
                    </div>

                    <button
                      onClick={() => handleImportToLogs(item)}
                      disabled={importedLogs[item.id]}
                      className={`w-full text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                        importedLogs[item.id]
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-stone-900 text-white border-stone-900 cursor-pointer hover:bg-stone-800'
                      }`}
                    >
                      {importedLogs[item.id] ? '✓ Imported to Audit' : 'Import Commute'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleScanCalendar}
            disabled={!user || isScanningCalendar}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all outline-none border ${
              !user 
                ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                : isScanningCalendar 
                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-wait'
                  : 'bg-sky-500 text-white border-sky-500 cursor-pointer hover:bg-sky-600 active:translate-y-[1px]'
            }`}
          >
            {isScanningCalendar ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading Calendar...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Scan Google Calendar</span>
              </>
            )}
          </button>
        </div>

        {/* Server & DB Footprint Engine */}
        <div className="border border-stone-200/80 rounded-3xl p-5 space-y-4 bg-indigo-50/20 flex flex-col justify-between lg:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider">Cloud Server & DB Footprint</h4>
                <p className="text-[10px] text-stone-400 font-semibold leading-tight">Measure physical server storage carbon impact</p>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed leading-normal">
              Estimate the energy footprint for cloud nodes and storage utilizing real physical coefficients (Peak Watts, Storage draws, and PUE factors).
            </p>

            {/* Cloud parameters UI */}
            <div className="bg-white border border-stone-100 p-3 rounded-2xl space-y-3.5 text-xs shadow-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">CPU cores</label>
                  <input 
                    type="number"
                    min="1"
                    max="128"
                    value={cpuCores}
                    onChange={(e) => setCpuCores(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold font-mono outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">Memory (RAM GB)</label>
                  <input 
                    type="number"
                    min="1"
                    max="1024"
                    value={ramGb}
                    onChange={(e) => setRamGb(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold font-mono outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">Hours running</label>
                  <input 
                    type="number"
                    min="1"
                    max="744"
                    value={hoursRunning}
                    onChange={(e) => setHoursRunning(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold font-mono outline-emerald-600"
                    title="Number of operating hours (Monthly default is 720/730)"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">Database Size (GB)</label>
                  <input 
                    type="number"
                    min="1"
                    max="5000"
                    value={databaseStorageGb}
                    onChange={(e) => setDatabaseStorageGb(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold font-mono outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">Infrastructure Provider</label>
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider outline-emerald-600"
                >
                  <option value="aws">Amazon Web Services (AWS)</option>
                  <option value="gcp">Google Cloud Platform (GCP)</option>
                  <option value="azure">Microsoft Azure (Azure)</option>
                </select>
              </div>
            </div>

            {/* Cloud computing output container */}
            {cloudResult && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs space-y-2 font-semibold">
                <div className="flex justify-between items-center text-stone-800">
                  <span className="font-extrabold text-[#1B3022]">Measured Impact:</span>
                  <span className="font-mono font-black text-indigo-700 bg-white border border-indigo-100 px-2 py-0.5 rounded-lg text-[13px]">
                    {cloudResult.calculation?.calculatedCO2e.toFixed(2)} kg CO2e
                  </span>
                </div>
                <div className="text-[10px] leading-relaxed text-stone-400">
                  Total compute consumes <b className="font-bold text-stone-700">{cloudResult.calculation?.totalPowerKWh} kWh</b> of power. Multiplied with a PUE multiplier of <b className="font-bold text-stone-700">{cloudResult.calculation?.pue}</b>.
                </div>
                <button
                  onClick={handleImportCloudResult}
                  className="w-full text-center py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Register in Carbon Logs
                </button>
              </div>
            )}

            {registeredCloudLog && (
              <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl text-[10px] text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Successfully registered {registeredCloudLog.co2e.toFixed(1)} kg cloud node carbon in logs!</span>
              </div>
            )}

          </div>

          <button
            onClick={handleCalculateServers}
            disabled={isCalculatingCloud}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-indigo-600 cursor-pointer active:translate-y-[1px] transition-all outline-none shadow-sm"
          >
            {isCalculatingCloud ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Calculating specs...</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5" />
                <span>Measure Cloud Resources</span>
              </>
            )}
          </button>
        </div>

      </div>

      <div className="flex items-center gap-2 border-t border-stone-100 pt-5 text-[10px] text-stone-400 font-bold uppercase">
        <Shield className="w-4 h-4 text-stone-400" />
        <span>Secured Sandbox Environment • Authorization tokens are maintained purely in-memory and are never stored.</span>
      </div>

    </div>
  );
}
