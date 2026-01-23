import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, FileText, CheckCircle, Loader2, AlertTriangle, 
  Download, ShieldCheck, Server, Lock, RefreshCcw, Trash2, Cloud, 
  Wifi, Smartphone, Laptop, Image as ImageIcon, Building, Key, 
  ShieldAlert, Copy, CheckCircle2, AlertCircle, Sparkles, X, Info,
  ArrowRightLeft, Code, HardDriveUpload
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    customers, jobs, transactions, staff, inventory, accounts, purchases,
    restoreData, resetToFactory, connectToCloud, isCloudConnected, syncStatus, lastSyncError,
    logoUrl, updateLogo, currentUserRole, updatePassword, bulkAddTransactions, syncAllLocalToCloud
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('PROFILE');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transaction Import State
  const [txImportText, setTxImportText] = useState('');

  // Profile Form State
  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');

  // Cloud Form State
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleConnect = async () => {
      setIsConnecting(true);
      await connectToCloud(cloudUrl, cloudKey);
      setIsConnecting(false);
  };

  const handleForceSync = async () => {
      if (!isCloudConnected) return;
      setIsSyncingAll(true);
      await syncAllLocalToCloud();
      setIsSyncingAll(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    if (passSuper) updatePassword('SUPER_ADMIN', passSuper);
    if (passStaff) updatePassword('STAFF', passStaff);
    setPassSuper('');
    setPassStaff('');
    alert('✅ Credentials Updated Successfully!');
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeDataStructure(inputText);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to analyze data structure. Please verify environment configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTxImport = () => {
      if (!txImportText.trim()) return;
      
      const lines = txImportText.split('\n').filter(l => l.trim());
      const newTxs: Transaction[] = lines.map((line, idx) => {
          const [date, type, cat, amt, desc, method] = line.split(',').map(s => s.trim());
          
          return {
              id: `tx-hist-${Date.now()}-${idx}`,
              date: date || new Date().toISOString().split('T')[0],
              type: (type?.toUpperCase() === 'EXPENSE' ? 'EXPENSE' : 'INCOME'),
              category: cat || 'General',
              amount: parseFloat(amt) || 0,
              description: desc || 'Imported Transaction',
              method: (method as any) || 'CASH'
          };
      });

      if (window.confirm(`Ready to import ${newTxs.length} historical transactions?`)) {
          bulkAddTransactions(newTxs);
          setTxImportText('');
          alert("Historical data imported successfully!");
      }
  };

  const copyTxTemplate = () => {
      const tpl = "2024-11-01, INCOME, Service Sales, 5000, Daily Sales, CASH\n2024-11-02, EXPENSE, Rent, 15000, Shop Rent Nov, TRANSFER";
      navigator.clipboard.writeText(tpl);
      alert("Template copied to clipboard!");
  };

  const copySupabaseSql = () => {
      const sql = `-- AUTO DAZZLE ERP FULL SCHEMA
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, lifetime_value NUMERIC DEFAULT 0, joined_date DATE DEFAULT CURRENT_DATE, visits INTEGER DEFAULT 0, is_premium BOOLEAN DEFAULT FALSE, vehicles JSONB DEFAULT '[]'::jsonb);
CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT, email TEXT, phone TEXT, base_salary NUMERIC DEFAULT 0, active BOOLEAN DEFAULT TRUE, joined_date DATE DEFAULT CURRENT_DATE, current_advance NUMERIC DEFAULT 0, loan_balance NUMERIC DEFAULT 0);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL, date DATE DEFAULT CURRENT_DATE, time_in TEXT, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL, segment TEXT, service_ids TEXT[], assigned_staff_ids TEXT[], status TEXT, total NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, notes TEXT, payment_status TEXT);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, type TEXT, category TEXT, amount NUMERIC DEFAULT 0, method TEXT, description TEXT, reference_id TEXT);
CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, sku TEXT, name TEXT, category TEXT, unit TEXT, quantity_on_hand NUMERIC DEFAULT 0, reorder_point NUMERIC DEFAULT 0, cost_per_unit NUMERIC DEFAULT 0, supplier TEXT, last_restocked DATE);
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, doc_number TEXT, vendor_name TEXT, item_name TEXT, quantity NUMERIC, unit TEXT, rate NUMERIC, amount NUMERIC, status TEXT, category TEXT);`;
      navigator.clipboard.writeText(sql);
      alert("Full SQL Schema copied! Paste this into Supabase SQL Editor.");
  };

  const handleFullSystemBackup = () => {
    const systemData = {
        timestamp: new Date().toISOString(),
        version: "2.0",
        company: "Auto Dazzle Spa",
        modules: {
            customers,
            jobs,
            financials: accounts,
            transactions,
            staff,
            inventory,
            purchases
        }
    };
    const dataStr = JSON.stringify(systemData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `AutoDazzle_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        if (e.target?.result) {
          try {
            const parsedData = JSON.parse(e.target.result as string);
            restoreData(parsedData);
          } catch (err) {
            alert("Error parsing backup file.");
          }
        }
      };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Settings & Access</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 w-full text-left tracking-widest">Brand Identity</h4>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6 bg-slate-50 group relative">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <ImageIcon size={32} className="text-slate-300" />
                    )}
                </div>
                <label className="w-full">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <div className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] text-center cursor-pointer hover:bg-black transition-all shadow-md">
                        Update Logo
                    </div>
                </label>
                <p className="text-[10px] text-slate-400 mt-4 text-center font-medium">Auto-scales for Invoices & Reports.</p>
            </div>
            
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest">
                        <Lock size={14} className="text-red-600"/> Security & Access Control
                    </h4>
                    
                    <form onSubmit={handleUpdatePasswords} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Master Admin Passcode</label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter new Master pass"
                                        value={passSuper}
                                        onChange={e => setPassSuper(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-600/20 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Staff Portal Passcode</label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter new Staff pass"
                                        value={passStaff}
                                        onChange={e => setPassStaff(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-600/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase">
                                SECURITY ALERT: ONLY THE SUPER ADMIN CAN ACCESS THIS TAB. CHANGING THESE CODES WILL IMMEDIATELY REQUIRE RE-AUTHENTICATION FOR RELEVANT ROLES.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="px-8 py-3 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">
                                Save Credentials
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'CLOUD' && (
         <div className="space-y-6">
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10"><Cloud size={120} /></div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cloud Persistence Engine</h4>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-8">PostgreSQL / Supabase Integration</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Endpoint URL</label>
                            <input 
                                type="text" 
                                value={cloudUrl}
                                onChange={e => setCloudUrl(e.target.value)}
                                placeholder="https://your-project.supabase.co"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Role API Key</label>
                            <input 
                                type="password" 
                                value={cloudKey}
                                onChange={e => setCloudKey(e.target.value)}
                                placeholder="service-role-secret-key"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-6">
                        <button 
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="px-10 py-4 bg-red-600 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all flex items-center gap-3 disabled:bg-slate-700"
                        >
                            {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />}
                            {isConnecting ? 'Establishing Link...' : 'Establish Cloud Link'}
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isCloudConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                Status: {isCloudConnected ? 'CONNECTED' : 'OFFLINE'}
                            </span>
                        </div>
                        
                        {syncStatus === 'SYNCING' && (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                <RefreshCcw size={10} className="animate-spin"/> Syncing Global State...
                            </div>
                        )}
                    </div>

                    {lastSyncError && (
                        <div className="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex gap-3 max-w-4xl">
                            <AlertTriangle className="text-red-500 shrink-0" size={18} />
                            <div>
                                <p className="text-xs font-black text-red-400 uppercase tracking-widest">Connection Diagnostics</p>
                                <p className="text-[11px] text-red-200 mt-1 font-mono">{lastSyncError}</p>
                                <p className="text-[10px] text-slate-500 mt-2 italic font-medium uppercase tracking-tight">Solution: Ensure you have run the SQL Schema in your Supabase SQL Editor and disabled Row-Level Security policies or used the 'service_role' key.</p>
                            </div>
                        </div>
                    )}
                </div>
             </div>

             {isCloudConnected && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
                            <HardDriveUpload size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Populate Cloud Database</h4>
                            <p className="text-xs text-emerald-700 font-medium max-w-md">Push all current local records (Customers, Jobs, Staff, Transactions, Inventory) to the Supabase database. Use this for initial setup.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleForceSync}
                        disabled={isSyncingAll}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:bg-slate-400"
                    >
                        {isSyncingAll ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14}/>}
                        Push Local to Cloud
                    </button>
                </div>
             )}

             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Code size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Database Initialization</h4>
                        <p className="text-xs text-slate-500 font-medium">Copy the required SQL schema to set up your Supabase project.</p>
                    </div>
                </div>
                <button 
                    onClick={copySupabaseSql}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                    <Copy size={12} /> Copy Schema SQL
                </button>
             </div>
         </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Download size={32} />
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Export Local Database</h4>
                <p className="text-sm text-slate-500 mb-8 max-w-xs">Download a full JSON snapshot of your customers, financials, and inventory for safe keeping.</p>
                <button 
                    onClick={handleFullSystemBackup}
                    className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg"
                >
                    Generate Backup File
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <RefreshCcw size={32} />
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Restore from Backup</h4>
                <p className="text-sm text-slate-500 mb-8 max-w-xs">Upload a previously generated .json file to overwrite the current local database.</p>
                <label className="w-full">
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-black uppercase text-xs tracking-widest text-center cursor-pointer hover:bg-slate-50 transition-all">
                        Upload & Restore
                    </div>
                </label>
            </div>

            <div className="md:col-span-2 p-6 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <AlertTriangle className="text-red-600" size={24} />
                    <div>
                        <p className="text-sm font-black text-red-900 uppercase">Factory Reset</p>
                        <p className="text-xs text-red-700 font-bold uppercase">This will permanently delete ALL local data records.</p>
                    </div>
                </div>
                <button 
                    onClick={resetToFactory}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                    Wipe System
                </button>
            </div>
        </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest">
                    <Sparkles size={14} className="text-amber-500"/> AI Migration Assistant
                </h4>
                
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Paste a sample of your legacy data (CSV, Excel rows, or SQL DDL) below. 
                        Gemini AI will analyze the structure and propose a mapping plan to our modular ERP schema.
                    </p>
                    
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste data snippet here..."
                        className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />

                    <div className="flex justify-end">
                        <button 
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="px-8 py-3 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black flex items-center gap-2 disabled:bg-slate-400"
                        >
                            {loading ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
                            {loading ? 'AI Analyzing...' : 'Analyze Structure'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-600 shrink-0" size={18} />
                    <p className="text-xs font-bold text-red-800 uppercase leading-relaxed">{error}</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-xl">
                        <h5 className="text-amber-500 font-black uppercase text-[10px] mb-4 tracking-widest">Proposed SQL Schema</h5>
                        <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap h-[300px] overflow-y-auto custom-scrollbar">
                            {result.proposedSchema}
                        </pre>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-[300px] overflow-y-auto custom-scrollbar">
                            <h5 className="text-slate-800 font-black uppercase text-[10px] mb-4 tracking-widest">Migration Plan</h5>
                            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {result.migrationPlan}
                            </div>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <h5 className="text-amber-800 font-black uppercase text-[9px] mb-2 tracking-widest flex items-center gap-2">
                                <Info size={12}/> Integrity Warnings
                            </h5>
                            <p className="text-[10px] text-amber-900 font-medium">
                                {result.dataIntegrityNotes}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Historical Transaction Import */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <ArrowRightLeft size={14} className="text-blue-600"/> Batch Transaction Import
                    </h4>
                    <button onClick={copyTxTemplate} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Copy Template</button>
                </div>
                
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium">
                        Directly inject historical income/expense records into the Ledger. 
                        Format: <code className="bg-slate-100 px-1 rounded">YYYY-MM-DD, TYPE, Category, Amount, Description, Method</code>
                    </p>
                    <textarea 
                        value={txImportText}
                        onChange={(e) => setTxImportText(e.target.value)}
                        placeholder="2024-11-01, INCOME, Service Sales, 5000, Day Sales, CASH"
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={handleBulkTxImport}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                        >
                            Process Batch Upload
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
