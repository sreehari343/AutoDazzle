import React, { useState, useRef } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Download, ShieldCheck, Image as ImageIconLucide, Trash2, Code, Terminal, AlertTriangle, Check
} from 'lucide-react';
import { AccountType } from '../types.ts';

export const MigrationAssistant: React.FC = () => {
  const { 
    bulkProcessJournal, updatePassword, getSystemState, restoreData, resetToFactory, 
    updateLogo, logoUrl, syncStatus, isCloudConnected, connectToCloud, syncAllLocalToCloud, lastSyncError
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'MIGRATION' | 'PROFILE' | 'SYSTEM'>('MIGRATION');
  const [importLoading, setImportLoading] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSql, setShowSql] = useState(false);

  // --- LOGO UPLOAD (FIXED) ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          alert("❌ Please select a valid image file (PNG/JPG).");
          return;
      }
      if (file.size > 1024 * 1024) { // 1MB limit for localStorage safety
          alert("❌ Icon too large. Please select an image under 1MB.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          updateLogo(base64);
          alert("✅ Brand Identity Synchronized!");
      };
      reader.onerror = () => alert("❌ Error reading file. Try a different image.");
      reader.readAsDataURL(file);
  };

  // --- BACKUP LOGIC ---
  const handleDownloadBackup = () => {
      const state = getSystemState();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AutoDazzle_MasterBackup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (window.confirm("⚠️ SYSTEM RESTORE: This will overwrite ALL local data. Proceed?")) {
                  restoreData(data);
                  alert("✅ Database Restored.");
              }
          } catch (err) { alert("❌ Corrupt backup file."); }
      };
      reader.readAsText(file);
  };

  const triggerSync = async () => {
      if (!isCloudConnected) {
          alert("❌ Connect to Supabase first.");
          return;
      }
      setIsSyncing(true);
      await syncAllLocalToCloud();
      setIsSyncing(false);
      if (!lastSyncError) alert("✅ Cloud Mirror Successful!");
  };

  const generateSchemaSql = () => `
-- Auto Dazzle ERP Supabase Schema
-- Run this in your Supabase SQL Editor to enable Cloud Sync

CREATE TABLE IF NOT EXISTS erp_customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, "lifetimeValue" NUMERIC, "joinedDate" TEXT, "outstandingBalance" NUMERIC, "isPremium" BOOLEAN, vehicles JSONB);
CREATE TABLE IF NOT EXISTS erp_jobs (id TEXT PRIMARY KEY, "ticketNumber" TEXT, date TEXT, "timeIn" TEXT, "customerId" TEXT, segment TEXT, "serviceIds" TEXT[], "assignedStaffIds" TEXT[], status TEXT, total NUMERIC, "taxEnabled" BOOLEAN, "paymentStatus" TEXT);
CREATE TABLE IF NOT EXISTS erp_transactions (id TEXT PRIMARY KEY, date TEXT, type TEXT, category TEXT, amount NUMERIC, method TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS erp_accounts (id TEXT PRIMARY KEY, code TEXT, name TEXT, type TEXT, balance NUMERIC);
CREATE TABLE IF NOT EXISTS erp_inventory (id TEXT PRIMARY KEY, sku TEXT, name TEXT, category TEXT, "quantityOnHand" NUMERIC, "reorderPoint" NUMERIC, "costPerUnit" NUMERIC, supplier TEXT);
CREATE TABLE IF NOT EXISTS erp_staff (id TEXT PRIMARY KEY, name TEXT, role TEXT, email TEXT, phone TEXT, "baseSalary" NUMERIC, active BOOLEAN);
CREATE TABLE IF NOT EXISTS erp_services (id TEXT PRIMARY KEY, sku TEXT, name TEXT, prices JSONB, category TEXT);
`.trim();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Command Center</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Kernel v4.2 // Cloud Bridge Active</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'MIGRATION' ? 'bg-black text-white' : 'bg-white text-black'}`}>Ledger</button>
             <button onClick={() => setActiveTab('SYSTEM')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'SYSTEM' ? 'bg-black text-white' : 'bg-white text-black'}`}>Cloud & Icon</button>
             <button onClick={() => setActiveTab('PROFILE')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'PROFILE' ? 'bg-black text-white' : 'bg-white text-black'}`}>Access</button>
        </div>
      </div>

      {activeTab === 'SYSTEM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            {/* Branding */}
            <div className="bg-white p-10 rounded-[40px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(245,158,11,1)]">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-slate-50 pb-6">
                    <div className="p-4 bg-amber-500 rounded-2xl text-white shadow-lg"><ImageIconLucide size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">Identity Engine</h4>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="w-48 h-48 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[32px] mb-6 flex items-center justify-center relative overflow-hidden group">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-4" /> : <ImageIconLucide size={48} className="text-slate-300"/>}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <label className="cursor-pointer text-white font-black text-xs uppercase tracking-widest text-center px-4">
                                Click to Upload<br/>(Max 1MB)
                                <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center max-w-xs leading-relaxed">Identity is stored in persistent kernel memory. PNG or JPG only.</p>
                </div>
            </div>

            {/* Cloud Terminal */}
            <div className="bg-slate-900 p-10 rounded-[40px] border-4 border-black text-white relative">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-white/5 pb-6">
                    <div className={`p-4 rounded-2xl ${isCloudConnected ? 'bg-emerald-500' : 'bg-slate-700'} text-white shadow-lg`}><Cloud size={32}/></div>
                    <div>
                        <h4 className="text-2xl font-black uppercase tracking-tight">Cloud Mirror</h4>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{isCloudConnected ? 'Uplink Established' : 'Awaiting Connection'}</span>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <input placeholder="Supabase URL" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} className="w-full bg-black/50 border-2 border-slate-700 rounded-xl p-3 text-xs text-white focus:border-emerald-500 outline-none" />
                    <input placeholder="Service Role Key" type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} className="w-full bg-black/50 border-2 border-slate-700 rounded-xl p-3 text-xs text-white focus:border-emerald-500 outline-none" />
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => connectToCloud(cloudUrl, cloudKey).then(ok => ok ? alert("✅ Connected") : alert("❌ Failed"))}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] rounded-xl transition-all"
                        >Establish Link</button>
                        <button 
                            onClick={triggerSync}
                            disabled={!isCloudConnected || isSyncing}
                            className="flex-1 py-4 bg-indigo-600 disabled:bg-slate-800 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-xl flex items-center justify-center gap-2"
                        >
                            {isSyncing ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14}/>}
                            Push Local to Cloud
                        </button>
                    </div>

                    {lastSyncError && <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-[9px] text-red-200 font-bold uppercase"><AlertTriangle size={10} className="inline mr-1"/> {lastSyncError}</div>}

                    <button onClick={() => setShowSql(!showSql)} className="w-full py-2 text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors border border-slate-800 rounded-lg">View Supabase Prep SQL</button>
                    
                    {showSql && (
                        <div className="mt-4 bg-black rounded-xl p-4 border border-slate-700">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black text-indigo-400">SQL SCRIPT</span>
                                <button onClick={() => { navigator.clipboard.writeText(generateSchemaSql()); alert("SQL Copied!"); }} className="text-[9px] bg-slate-800 px-2 py-1 rounded text-white hover:bg-indigo-600">COPY</button>
                             </div>
                             <pre className="text-[8px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap">{generateSchemaSql()}</pre>
                        </div>
                    )}
                </div>
            </div>

            {/* Offline Backups */}
            <div className="bg-white p-10 rounded-[40px] border-4 border-black md:col-span-2 shadow-[12px_12px_0px_0px_rgba(16,185,129,1)]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-lg"><Download size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">Manual State Backups</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleDownloadBackup} className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-3xl hover:bg-black transition-all group">
                        <div className="text-left">
                            <p className="text-xl font-black uppercase">Export Full State</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Download System .JSON</p>
                        </div>
                        <Download className="group-hover:translate-y-1 transition-transform" size={32}/>
                    </button>

                    <label className="flex items-center justify-between p-6 bg-white border-4 border-slate-900 text-slate-900 rounded-3xl hover:bg-slate-50 cursor-pointer transition-all group">
                        <div className="text-left">
                            <p className="text-xl font-black uppercase">Restore ERP</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Upload .JSON Backup</p>
                        </div>
                        <RefreshCcw className="group-hover:rotate-180 transition-transform duration-500" size={32}/>
                        <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                    </label>
                </div>

                <div className="mt-8 flex justify-center">
                    <button onClick={() => { if(window.confirm("WIPE EVERYTHING? This is irreversible.")) resetToFactory(); }} className="px-10 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 border-red-200 hover:bg-red-600 hover:text-white transition-all">Destroy Local Kernel Storage</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
