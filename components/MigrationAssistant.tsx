import React, { useState, useRef } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction, AccountType } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Copy, Sparkles, X, Code, Landmark, AlertCircle, Download, ShieldCheck, Image as ImageIconLucide, Trash2
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    bulkProcessJournal, updatePassword, getSystemState, restoreData, resetToFactory, updateLogo, logoUrl, syncStatus, isCloudConnected, connectToCloud
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'MIGRATION' | 'PROFILE' | 'SYSTEM'>('MIGRATION');
  const [importLoading, setImportLoading] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGO UPLOAD LOGIC ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          updateLogo(base64);
          alert("✅ Brand Identity Updated!");
      };
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
              if (window.confirm("⚠️ This will overwrite all current data. Proceed with system restore?")) {
                  restoreData(data);
                  alert("✅ System Restored Successfully!");
              }
          } catch (err) {
              alert("❌ Error: Invalid backup file format.");
          }
      };
      reader.readAsText(file);
  };

  // --- CSV IMPORT LOGIC (FROM PREVIOUS) ---
  const cleanNum = (val: string) => {
      if (!val) return 0;
      let cleaned = val.replace(/[",\s]/g, '');
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) cleaned = '-' + cleaned.slice(1, -1);
      const parsed = parseFloat(cleaned);
      return isFinite(parsed) ? Math.abs(parsed) : 0;
  };

  const getAccountType = (typeStr: string, name: string): AccountType => {
      const s = (typeStr || name).toUpperCase();
      if (s.includes('REVENUE') || s.includes('INCOME')) return AccountType.REVENUE;
      if (s.includes('EXPENSE') || s.includes('CHARGE')) return AccountType.EXPENSE;
      if (s.includes('ASSET') || s.includes('BANK') || s.includes('CASH')) return AccountType.ASSET;
      if (s.includes('EQUITY') || s.includes('INVESTMENT')) return AccountType.EQUITY;
      if (s.includes('LIABILITY') || s.includes('PAYABLE')) return AccountType.LIABILITY;
      return AccountType.EXPENSE;
  };

  const handleMasterImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n').filter(r => r.trim()).map(row => {
              const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
              return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : row.split(',').map(c => c.trim());
          });
          const dataRows = rows.filter(row => row.length >= 4 && !row[0].toLowerCase().includes('date'));
          const journalEntries: any[] = [];
          for (let i = 0; i < dataRows.length; i += 2) {
              const r1 = dataRows[i], r2 = dataRows[i+1];
              if (!r1 || !r2) break;
              const a1 = r1[1], a2 = r2[1];
              const t1 = getAccountType(r1[2], a1), t2 = getAccountType(r2[2], a2);
              const v1 = cleanNum(r1[3]) || cleanNum(r1[4]);
              journalEntries.push({
                  legs: [
                      { accountName: a1, amount: v1, isDebit: true, accountType: t1 },
                      { accountName: a2, amount: v1, isDebit: false, accountType: t2 }
                  ],
                  historyTx: (t1 === AccountType.REVENUE || t1 === AccountType.EXPENSE) ? {
                      id: `imp-${Date.now()}-${i}`, date: r1[0], type: t1 === AccountType.REVENUE ? 'INCOME' : 'EXPENSE',
                      category: a1, amount: v1, description: r1[5] || `${a1} funded by ${a2}`, method: 'TRANSFER'
                  } : undefined
              });
          }
          if (journalEntries.length > 0) bulkProcessJournal(journalEntries);
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter">System Console</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Readiness Status: Green</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'MIGRATION' ? 'bg-black text-white' : 'bg-white text-black'}`}>Import</button>
             <button onClick={() => setActiveTab('SYSTEM')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'SYSTEM' ? 'bg-black text-white' : 'bg-white text-black'}`}>Backups</button>
             <button onClick={() => setActiveTab('PROFILE')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'PROFILE' ? 'bg-black text-white' : 'bg-white text-black'}`}>Access</button>
        </div>
      </div>

      {activeTab === 'SYSTEM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            {/* System Branding */}
            <div className="bg-white p-10 rounded-[32px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-slate-50 pb-6">
                    <div className="p-4 bg-amber-500 rounded-2xl text-white shadow-lg"><ImageIconLucide size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">Brand Identity</h4>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="w-48 h-48 bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl mb-6 flex items-center justify-center relative overflow-hidden group">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-4" /> : <ImageIconLucide size={48} className="text-slate-300"/>}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <label className="cursor-pointer text-white font-black text-xs uppercase tracking-widest text-center">
                                Change Icon
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase text-center max-w-xs leading-relaxed">Your logo is stored locally as a Base64 string for zero-latency offline performance.</p>
                </div>
            </div>

            {/* Backup & Recovery */}
            <div className="bg-white p-10 rounded-[32px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(16,185,129,1)]">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-slate-50 pb-6">
                    <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg"><Download size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">System State</h4>
                </div>
                
                <div className="space-y-4">
                    <button onClick={handleDownloadBackup} className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all group">
                        <div className="text-left">
                            <p className="text-lg font-black uppercase leading-none">Export State</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Download JSON Ledger</p>
                        </div>
                        <Download className="group-hover:translate-y-1 transition-transform"/>
                    </button>

                    <label className="w-full flex items-center justify-between p-6 bg-white border-4 border-slate-900 text-slate-900 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group">
                        <div className="text-left">
                            <p className="text-lg font-black uppercase leading-none">Restore System</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Upload Master JSON</p>
                        </div>
                        <RefreshCcw className="group-hover:rotate-180 transition-transform duration-500"/>
                        <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                    </label>

                    <button onClick={() => { if(window.confirm("CRITICAL: This will wipe the entire database. Continue?")) resetToFactory(); }} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border-2 border-red-100">
                        Factory Reset System
                    </button>
                </div>
            </div>

            {/* Cloud Sync Status */}
            <div className="bg-slate-900 p-10 rounded-[40px] border-4 border-black md:col-span-2 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="shrink-0 flex flex-col items-center">
                        <div className={`p-8 rounded-[40px] border-4 ${isCloudConnected ? 'border-emerald-500 text-emerald-500' : 'border-slate-700 text-slate-700'} mb-4`}>
                            {isCloudConnected ? <Cloud size={64} className="animate-pulse"/> : <Wifi size={64}/>}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">{isCloudConnected ? 'Mirrored' : 'Local Only'}</span>
                    </div>

                    <div className="flex-1 space-y-6">
                        <h4 className="text-3xl font-black uppercase tracking-tighter">Cloud Synchronization Bridge</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input placeholder="Supabase Project URL" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all"/>
                            <input placeholder="Service Role Secret Key" type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all"/>
                        </div>
                        <button 
                            onClick={() => connectToCloud(cloudUrl, cloudKey).then(ok => ok ? alert("✅ Connection Established!") : alert("❌ Connection Failed."))}
                            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all"
                        >
                            Establish Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            <div className="bg-white p-10 rounded-[32px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(79,70,229,1)]">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-slate-50 pb-6">
                    <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg"><Landmark size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">Journal Importer</h4>
                </div>
                
                <label className="flex flex-col items-center justify-center border-4 border-dashed border-indigo-200 rounded-[32px] p-12 hover:border-indigo-600 cursor-pointer transition-all bg-indigo-50/30 group mb-8">
                    {importLoading ? <Loader2 className="animate-spin text-indigo-600" size={48} /> : <Upload className="text-indigo-600 mb-4" size={48}/>}
                    <span className="text-xl font-black text-indigo-900 uppercase">Drop Ledger CSV</span>
                    <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                </label>

                <div className="bg-black text-white p-6 rounded-2xl">
                    <p className="text-[11px] font-bold leading-relaxed text-slate-300">
                        Smart pairing engine active. Same-account pairs are automatically merged to preserve true revenue balances.
                    </p>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'PROFILE' && (
        <div className="bg-white p-10 rounded-[32px] border-4 border-black text-black">
            <h4 className="font-black text-slate-800 uppercase text-xs mb-8 flex items-center gap-2 tracking-[0.3em]"><ShieldCheck size={18} className="text-red-600"/> Security Firewall</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-2xl">
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Admin Passphrase</label>
                    <input type="password" placeholder="New Password" onBlur={e => e.target.value && updatePassword('SUPER_ADMIN', e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-black rounded-2xl text-sm font-bold text-black outline-none focus:ring-8 focus:ring-red-100" />
                </div>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Portal Passphrase</label>
                    <input type="password" placeholder="New Password" onBlur={e => e.target.value && updatePassword('STAFF', e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-black rounded-2xl text-sm font-bold text-black outline-none focus:ring-8 focus:ring-red-100" />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
