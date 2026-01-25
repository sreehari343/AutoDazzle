import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction, AccountType } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Copy, Sparkles, X, Code, Landmark, AlertCircle
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    transactions, restoreData, connectToCloud, isCloudConnected, 
    logoUrl, updateLogo, updatePassword, bulkAddTransactions, syncAllLocalToCloud,
    customers, jobs, staff, inventory, accounts, purchases, services, payrollHistory
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('MIGRATION');
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
      version: '2.2',
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    if (passSuper) updatePassword('SUPER_ADMIN', passSuper);
    if (passStaff) updatePassword('STAFF', passStaff);
    setPassSuper(''); setPassStaff('');
    alert('✅ Credentials Updated!');
  };

  const cleanNum = (val: string) => {
      if (!val || val.trim() === '' || val === '-' || val.includes('#')) return 0;
      const cleaned = val.replace(/[",\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isFinite(parsed) ? parsed : 0;
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

          const dataRows = rows.filter(row => {
             if (row.length < 5) return false;
             const firstCol = (row[0] || '').toLowerCase();
             const secondCol = (row[1] || '').toLowerCase();
             const isHeader = firstCol.includes('date') || secondCol.includes('account') || secondCol.includes('acc');
             const isTotal = firstCol.includes('total') || secondCol.includes('total') || firstCol.includes('balance');
             return !isHeader && !isTotal && row[1];
          });
          
          const newTxs: Transaction[] = [];
          dataRows.forEach((row, idx) => {
              // CSV Columns: [0]Date, [1]Account Name, [2]Account Type, [3]Debit, [4]Credit, [5]Description
              const dateRaw = row[0] || '';
              // Normalize date from DD/MM/YYYY to YYYY-MM-DD
              let date = new Date().toISOString().split('T')[0];
              if (dateRaw.includes('/')) {
                  const parts = dateRaw.split('/');
                  if (parts.length === 3) {
                      date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                  }
              } else if (dateRaw.includes('.')) {
                  const parts = dateRaw.split('.');
                  if (parts.length === 3) {
                      date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                  }
              }

              const accName = row[1] || 'Unknown';
              const accType = (row[2] || '').toUpperCase();
              const debit = cleanNum(row[3]);
              const credit = cleanNum(row[4]);
              const desc = row[5] || accName;

              // ACCOUNTING LOGIC (THE FIX):
              // 1. Only 'Expense' or 'Revenue/Income' types go into the P&L Transaction History.
              // 2. Equity, Asset, Liability lines are BALANCING entries and should NOT be in the History List
              //    because they would double-count your revenue/expenses.
              
              if (accType.includes('EXPENSE')) {
                  newTxs.push({ 
                      id: `imp-exp-${Date.now()}-${idx}`, 
                      date, 
                      type: 'EXPENSE', 
                      category: accName, 
                      amount: debit || credit, // In your CSV, Expenses usually have a Debit value
                      description: desc, 
                      method: 'TRANSFER' 
                  });
              } else if (accType.includes('REVENUE') || accType.includes('INCOME')) {
                  newTxs.push({ 
                      id: `imp-rev-${Date.now()}-${idx}`, 
                      date, 
                      type: 'INCOME', 
                      category: accName, 
                      amount: credit || debit, // Revenues usually have a Credit value
                      description: desc, 
                      method: 'TRANSFER' 
                  });
              }
              // Skip adding Asset, Liability, Equity to History array to avoid the "Zeroing Out" Dashboard bug.
          });

          if (newTxs.length === 0) {
              alert("Import Error: No valid P&L rows (Expense/Revenue) found. Ensure 'Account Type' column contains these keywords.");
          } else if (window.confirm(`Detected ${newTxs.length} P&L entries. Proceed with import?`)) {
              // We pass true to 'skipAutoOffset' so the app doesn't manually guess the Cash leg.
              bulkAddTransactions(newTxs, true);
              alert(`Successfully imported ${newTxs.length} historical ledger entries.`);
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Settings</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
            <div className="md:col-span-1 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 w-full text-left tracking-widest">Business Logo</h4>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6 bg-slate-50 group relative">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon size={32} className="text-slate-300" />}
                </div>
                <label className="w-full">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <div className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] text-center cursor-pointer hover:bg-black transition-all">Update Logo</div>
                </label>
            </div>
            <div className="md:col-span-2">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Lock size={14} className="text-red-600"/> Security Access</h4>
                    <form onSubmit={handleUpdatePasswords} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Master Admin Password</label>
                                <input type="password" value={passSuper} onChange={e => setPassSuper(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Staff Portal Password</label>
                                <input type="password" value={passStaff} onChange={e => setPassStaff(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20" />
                            </div>
                        </div>
                        <button type="submit" className="px-8 py-3 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg">Save Credentials</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6 text-black">
            <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Landmark className="text-indigo-600" size={28}/>
                    <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Financial Ledger Importer</h4>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> True Double-Entry Importer</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer transition-all bg-indigo-50/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Select Excel/CSV Ledger</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">STRICT 6-COLUMN ORDER:</p>
                        <p className="text-[9px] font-mono text-white leading-tight bg-black/30 p-2 rounded">Date, Account Name, Account Type, Debit, Credit, Description</p>
                        <p className="text-[9px] text-slate-400 mt-2 italic">* Logic Fixed: Equity/Asset offsets are correctly excluded from P&L to stop zero-out bug.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Sparkles size={14} className="text-amber-500"/> AI Mapping Assistant</h4>
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium">Paste custom history rows here for Gemini AI to analyze and generate a direct SQL migration query.</p>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste legacy CSV rows here..." className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20" />
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
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-xl overflow-hidden">
                        <h5 className="text-amber-500 font-black text-[10px] uppercase mb-4 tracking-widest">Proposed SQL Schema</h5>
                        <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-60">{result.proposedSchema}</pre>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                         <h5 className="text-slate-800 font-black text-[10px] uppercase mb-4 tracking-widest">Migration Strategy</h5>
                         <div className="text-xs text-slate-600 whitespace-pre-wrap overflow-y-auto">{result.migrationPlan}</div>
                    </div>
                </div>
            )}
        </div>
      )}
      
      {activeTab === 'CLOUD' && (
         <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl">
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cloud Gateway</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-8">PostgreSQL / Supabase Sync</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Supabase URL" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                    <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="Service Role Key" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                </div>
                <div className="mt-8 flex items-center gap-6">
                    <button onClick={handleConnect} disabled={isConnecting} className="px-10 py-4 bg-red-600 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-xl flex items-center gap-3 disabled:bg-slate-700">
                        {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />} Connect Database
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Status: {isCloudConnected ? 'ONLINE' : 'LOCAL ONLY'}</span>
                </div>
             </div>
             {isCloudConnected && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Local-to-Cloud Overwrite</h4>
                        <p className="text-xs text-emerald-700 font-medium">Update cloud database with all local records immediately.</p>
                    </div>
                    <button onClick={handleForceSync} disabled={isSyncingAll} className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg flex items-center gap-2">
                        {isSyncingAll ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14}/>} Sync All Data
                    </button>
                </div>
             )}
         </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto"><Code size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Export JSON System</h4>
                <button onClick={handleFullSystemBackup} className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-black shadow-lg">Download Backup</button>
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto"><RefreshCcw size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">System Disaster Restore</h4>
                <label className="w-full">
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-black uppercase text-xs tracking-widest text-center cursor-pointer hover:bg-slate-50 transition-all">Upload JSON File</div>
                </label>
            </div>
        </div>
      )}
    </div>
  );
};
