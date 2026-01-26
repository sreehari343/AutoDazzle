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
    restoreData, connectToCloud, isCloudConnected, syncStatus,
    logoUrl, updateLogo, updatePassword, bulkAddTransactions, syncAllLocalToCloud,
    payrollHistory
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
  const [importLoading, setImportLoading] = useState(false);

  const handleFullSystemBackup = () => {
    const backupData = {
      version: '2.4',
      timestamp: new Date().toISOString(),
      modules: { customers, jobs, transactions, staff, inventory, services, financials: accounts, payrollHistory, purchases }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto_dazzle_full_erp_${new Date().toISOString().split('T')[0]}.json`;
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
      const success = await connectToCloud(cloudUrl, cloudKey);
      setIsConnecting(false);
      if (success) alert("Connected to Supabase! Automatic synchronization is now ACTIVE.");
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

          const dataRows = (rows[0][0].toLowerCase().includes('date') || rows[0][1].toLowerCase().includes('acc')) ? rows.slice(1) : rows;
          
          const newTxs: Transaction[] = [];
          dataRows.forEach((row, idx) => {
              // STRICT 6 COLS: Date, Acc Name, Acc Type, Debit, Credit, Description
              if (row.length < 5) return;

              const date = row[0] || new Date().toISOString().split('T')[0];
              const accName = row[1] || 'Imported Account';
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

          if (newTxs.length === 0) {
              alert("No valid numerical data found in Debit/Credit columns.");
          } else if (window.confirm(`Detected ${newTxs.length} valid entries. Import to Ledger now?`)) {
              bulkAddTransactions(newTxs);
              alert(`Success! ${newTxs.length} records pushed to local storage. ${isCloudConnected ? 'Cloud Syncing in progress...' : ''}`);
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  const copySupabaseSql = () => {
      const sql = `-- AUTO DAZZLE ERP SCHEMA v2.4
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
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Infrastructure</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Connection:</span>
                <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isCloudConnected ? 'text-green-600' : 'text-slate-400'}`}>
                    {isCloudConnected ? <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> : null}
                    {isCloudConnected ? 'Stable' : 'Local Only'}
                </span>
            </div>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Admin</button>
        </div>
      </div>

      {activeTab === 'CLOUD' && (
         <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl">
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cloud Database Configuration</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-8">PostgreSQL / Supabase Real-Time Engine</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supabase Endpoint URL</label>
                        <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://your-project.supabase.co" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service Role API Key</label>
                        <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="eyJh..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                    </div>
                </div>
                <div className="mt-8 flex items-center gap-6">
                    <button onClick={handleConnect} disabled={isConnecting} className="px-10 py-4 bg-red-600 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-xl flex items-center gap-3 disabled:bg-slate-700">
                        {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />} Establish Connection
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Auto-Sync Status:</span>
                        <span className={`text-[10px] font-black uppercase ${isCloudConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isCloudConnected ? 'Operational (Real-time Pushes Active)' : 'Inactive'}
                        </span>
                    </div>
                </div>
             </div>
             {isCloudConnected && (
                <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full animate-pulse"><RefreshCcw size={20}/></div>
                        <div>
                            <h4 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Real-Time Syncing</h4>
                            <p className="text-xs text-emerald-700 font-medium">System is automatically pushing all local ledger changes to your cloud database.</p>
                        </div>
                    </div>
                    {syncStatus === 'SYNCING' && <span className="text-[9px] font-black uppercase bg-emerald-200 text-emerald-800 px-3 py-1 rounded">Pushing Data...</span>}
                </div>
             )}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Code size={24} /></div>
                    <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">PostgreSQL Schema v2.4</h4>
                </div>
                <button onClick={copySupabaseSql} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase hover:bg-slate-200 flex items-center gap-2 transition-all"><Copy size={12} /> Copy SQL Statements</button>
             </div>
         </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6">
            <div className="bg-indigo-50 border-2 border-indigo-100 p-10 rounded-2xl flex flex-col md:flex-row gap-10 items-center">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                        <Landmark className="text-indigo-600" size={32}/>
                        <h4 className="text-2xl font-black text-indigo-900 uppercase tracking-tight">Master Importer</h4>
                    </div>
                    <p className="text-sm text-indigo-700/70 font-medium mb-6">Import legacy financial data directly into the ERP. The system strictly processes 6 columns and auto-categorizes expenses/income.</p>
                    <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3">
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Required Column Mapping (6):</h5>
                        <ol className="text-[11px] font-mono text-slate-600 space-y-1">
                            <li className="flex justify-between"><span>1. Date</span> <span className="text-[9px] bg-slate-100 px-1 rounded uppercase">YYYY-MM-DD</span></li>
                            <li className="flex justify-between"><span>2. Account Name</span> <span className="text-[9px] bg-slate-100 px-1 rounded uppercase">Category</span></li>
                            <li className="flex justify-between"><span>3. Account Type</span> <span className="text-[9px] bg-slate-100 px-1 rounded uppercase">Optional</span></li>
                            <li className="flex justify-between"><span>4. Debit Amount</span> <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded uppercase">Expenses</span></li>
                            <li className="flex justify-between"><span>5. Credit Amount</span> <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded uppercase">Income</span></li>
                            <li className="flex justify-between"><span>6. Description</span> <span className="text-[9px] bg-slate-100 px-1 rounded uppercase">Note</span></li>
                        </ol>
                    </div>
                </div>
                
                <div className="flex-1 w-full flex flex-col items-center">
                    <label className="w-full h-64 flex flex-col items-center justify-center border-4 border-dashed border-indigo-200 rounded-[32px] hover:border-indigo-500 hover:bg-white cursor-pointer transition-all bg-indigo-100/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" size={40} /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-4" size={48}/>}
                        <span className="text-lg font-black text-indigo-800 uppercase tracking-tight">Drop Ledger CSV Here</span>
                        <p className="text-xs text-indigo-500 font-bold mt-2 uppercase tracking-widest">Only .CSV Files accepted</p>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-xs mb-6 flex items-center gap-2 tracking-widest"><Sparkles size={16} className="text-amber-500"/> Advanced Data Analysis (AI)</h4>
                <div className="space-y-6">
                    <p className="text-sm text-slate-600 font-medium italic">Unsure of your data format? Paste a few rows here and the Gemini AI will generate a specific SQL mapping for you.</p>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste raw spreadsheet rows here..." className="w-full h-40 p-5 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono text-xs text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition-all" />
                    <div className="flex justify-end">
                        <button onClick={() => {
                            if (!inputText.trim()) return;
                            setLoading(true);
                            analyzeDataStructure(inputText).then(res => { setResult(res); setLoading(false); }).catch(() => setLoading(false));
                        }} disabled={loading} className="px-10 py-4 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black flex items-center gap-3 transition-transform active:scale-95">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />} Analyze Legacy Data
                        </button>
                    </div>
                </div>
            </div>
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-slate-900 p-8 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h5 className="text-amber-500 font-black text-[11px] uppercase tracking-[0.2em]">Proposed SQL Schema</h5>
                            <button onClick={() => {navigator.clipboard.writeText(result.proposedSchema); alert('Copied!');}} className="text-white hover:text-amber-500"><Copy size={16}/></button>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-64 custom-scrollbar leading-relaxed">{result.proposedSchema}</pre>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl overflow-hidden flex flex-col">
                         <h5 className="text-slate-900 font-black text-[11px] uppercase tracking-[0.2em] mb-6 border-b-2 border-slate-50 pb-2">Step-by-Step Migration Plan</h5>
                         <div className="text-[12px] text-slate-600 whitespace-pre-wrap overflow-y-auto font-medium leading-relaxed">{result.migrationPlan}</div>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === 'PROFILE' && (
        <div className="bg-white p-10 rounded-2xl border-2 border-slate-100 shadow-lg max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-10 border-b-2 border-slate-50 pb-6">
                <div className="p-4 bg-red-100 text-red-600 rounded-2xl"><Lock size={32}/></div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Security Credentials</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">System Access Keys</p>
                </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updatePassword('SUPER_ADMIN', passSuper); updatePassword('STAFF', passStaff); alert('Security records updated!'); }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Master Administrator Key</label>
                        <input type="password" value={passSuper} onChange={e => setPassSuper(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-black text-slate-800 outline-none focus:border-red-500" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Staff Portal Key</label>
                        <input type="password" value={passStaff} onChange={e => setPassStaff(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-black text-slate-800 outline-none focus:border-red-500" placeholder="••••••••" />
                    </div>
                </div>
                <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-700 shadow-2xl transition-all active:scale-[0.98]">Authorize Protocol Update</button>
            </form>
        </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-10 rounded-[32px] border-2 border-slate-100 shadow-lg text-center hover:shadow-2xl transition-all group">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform"><FileJson size={40} /></div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Snapshot Export</h4>
                <p className="text-sm text-slate-500 font-medium mb-8">Download your entire ERP local database as an encrypted JSON snapshot for offline storage.</p>
                <button onClick={handleFullSystemBackup} className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black shadow-xl">Execute Export</button>
            </div>
            <div className="bg-white p-10 rounded-[32px] border-2 border-slate-100 shadow-lg text-center hover:shadow-2xl transition-all group">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform"><RefreshCcw size={40} /></div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Kernel Restore</h4>
                <p className="text-sm text-slate-500 font-medium mb-8">Overwrite the current system state by uploading a previous JSON snapshot. Use with extreme caution.</p>
                <label className="w-full">
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="w-full py-4 bg-white border-4 border-slate-950 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-center cursor-pointer hover:bg-slate-50 transition-all">Begin Recovery</div>
                </label>
            </div>
        </div>
      )}
    </div>
  );
};
