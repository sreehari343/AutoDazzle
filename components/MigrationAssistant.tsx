import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Copy, Sparkles, X, Code, HardDriveUpload, 
  FileSpreadsheet, FileJson, Landmark, AlertCircle
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    customers, jobs, transactions, staff, inventory, accounts, purchases, services,
    restoreData, connectToCloud, isCloudConnected, 
    logoUrl, updateLogo, updatePassword, bulkAddTransactions, syncAllLocalToCloud,
    payrollHistory
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('PROFILE');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);

  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');

  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const handleFullSystemBackup = () => {
    const backupData = {
      version: '2.3',
      timestamp: new Date().toISOString(),
      modules: { customers, jobs, transactions, staff, inventory, services, financials: accounts, payrollHistory, purchases }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto_dazzle_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("Restore will overwrite current local data. Proceed?")) {
           restoreData(data);
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

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

  const cleanNum = (val: string) => {
      if (!val || val === '-' || val === '#ERROR!' || val.trim() === '') return 0;
      return parseFloat(val.replace(/[^0-9.-]+/g, '')) || 0;
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

          // Skip header if looks like labels
          const dataRows = (rows[0][0].toLowerCase().includes('date') || rows[0][1].toLowerCase().includes('acc')) ? rows.slice(1) : rows;
          
          const newTxs: Transaction[] = [];
          dataRows.forEach((row, idx) => {
              // EXPECTED 6 COLS: Date, Acc Name, Acc Type, Debit, Credit, Description
              if (row.length < 5) return;

              const date = row[0] || new Date().toISOString().split('T')[0];
              const accName = row[1] || 'Imported Entry';
              const debit = cleanNum(row[3]);
              const credit = cleanNum(row[4]);
              const desc = row[5] || accName;

              if (debit > 0) {
                  newTxs.push({ id: `imp-dr-${Date.now()}-${idx}`, date, type: 'EXPENSE', category: accName, amount: debit, description: desc, method: 'TRANSFER' });
              }
              if (credit > 0) {
                  newTxs.push({ id: `imp-cr-${Date.now()}-${idx}`, date, type: 'INCOME', category: accName, amount: credit, description: desc, method: 'TRANSFER' });
              }
          });

          if (window.confirm(`Detected ${newTxs.length} records. Confirm bulk import?`)) {
              bulkAddTransactions(newTxs);
              alert(`Successfully imported ${newTxs.length} financial records.`);
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  const copySupabaseSql = () => {
      const sql = `-- AUTO DAZZLE ERP SCHEMA v2.3
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, lifetime_value NUMERIC DEFAULT 0, joined_date DATE DEFAULT CURRENT_DATE, visits INTEGER DEFAULT 0, is_premium BOOLEAN DEFAULT FALSE, vehicles JSONB DEFAULT '[]'::jsonb);
CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT, email TEXT, phone TEXT, base_salary NUMERIC DEFAULT 0, active BOOLEAN DEFAULT TRUE, joined_date DATE DEFAULT CURRENT_DATE, current_advance NUMERIC DEFAULT 0, loan_balance NUMERIC DEFAULT 0);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL, date DATE DEFAULT CURRENT_DATE, time_in TEXT, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL, segment TEXT, service_ids TEXT[], assigned_staff_ids TEXT[], status TEXT, total NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, notes TEXT, payment_status TEXT);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, type TEXT, category TEXT, amount NUMERIC DEFAULT 0, method TEXT, description TEXT, reference_id TEXT);
CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, sku TEXT, name TEXT, category TEXT, duration_minutes INTEGER, base_price NUMERIC, prices JSONB);`;
      navigator.clipboard.writeText(sql);
      alert("SQL Schema copied!");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Setup & Migration</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm max-w-2xl mx-auto">
            <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Lock size={14} className="text-red-600"/> Security Access</h4>
            <form onSubmit={(e) => { e.preventDefault(); updatePassword('SUPER_ADMIN', passSuper); updatePassword('STAFF', passStaff); alert('Saved!'); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Master Admin Passcode</label>
                        <input type="password" value={passSuper} onChange={e => setPassSuper(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Staff Portal Passcode</label>
                        <input type="password" value={passStaff} onChange={e => setPassStaff(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
                    </div>
                </div>
                <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg transition-all">Update Database Access</button>
            </form>
        </div>
      )}

      {activeTab === 'CLOUD' && (
         <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl">
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cloud Engine</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-8">PostgreSQL / Supabase Sync</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Supabase URL" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                    <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="Service Role Key" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                </div>
                <div className="mt-8 flex items-center gap-6">
                    <button onClick={handleConnect} disabled={isConnecting} className="px-10 py-4 bg-red-600 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-xl flex items-center gap-3 disabled:bg-slate-700">
                        {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />} Establish Link
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Status: {isCloudConnected ? 'CONNECTED' : 'OFFLINE'}</span>
                </div>
             </div>
             {isCloudConnected && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Push Local modules to Cloud</h4>
                        <p className="text-xs text-emerald-700 font-medium max-w-md">Update cloud database with all local ledger records.</p>
                    </div>
                    <button onClick={handleForceSync} disabled={isSyncingAll} className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg flex items-center gap-2">
                        {isSyncingAll ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14}/>} Sync Modules Now
                    </button>
                </div>
             )}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Code size={24} /></div>
                    <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">SQL Schema v2.3</h4>
                </div>
                <button onClick={copySupabaseSql} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase hover:bg-slate-200 flex items-center gap-2"><Copy size={12} /> Copy SQL</button>
             </div>
         </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto"><FileJson size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Export JSON</h4>
                <button onClick={handleFullSystemBackup} className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-black shadow-lg">Generate Backup</button>
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto"><RefreshCcw size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Restore System</h4>
                <label className="w-full">
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-black uppercase text-xs tracking-widest text-center cursor-pointer hover:bg-slate-50 transition-all">Upload & Restore</div>
                </label>
            </div>
        </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Landmark className="text-indigo-600" size={28}/>
                    <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Financial Migration</h4>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm relative group max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest">Master Ledger Import (STRICT 6 COLS)</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer transition-all bg-indigo-50/50">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Select CSV Ledger</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <p className="text-[9px] text-slate-400 mt-4 font-mono leading-tight bg-slate-50 p-2 rounded text-center">Format: Date, Acc Name, Acc Type, Debit, Credit, Description</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Sparkles size={14} className="text-amber-500"/> AI Analysis</h4>
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium">Paste legacy data rows here for Gemini AI to map to SQL.</p>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste data snippets..." className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none" />
                    <div className="flex justify-end">
                        <button onClick={() => {
                            if (!inputText.trim()) return;
                            setLoading(true);
                            analyzeDataStructure(inputText).then(res => { setResult(res); setLoading(false); }).catch(() => setLoading(false));
                        }} disabled={loading} className="px-8 py-3 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black flex items-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />} Analyze Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
