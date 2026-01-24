import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction, PurchaseOrder } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, FileText, CheckCircle, Loader2, AlertTriangle, 
  Download, ShieldCheck, Server, Lock, RefreshCcw, Trash2, Cloud, 
  Wifi, Smartphone, Laptop, Image as ImageIcon, Building, Key, 
  ShieldAlert, Copy, CheckCircle2, AlertCircle, Sparkles, X, Info,
  ArrowRightLeft, Code, HardDriveUpload, FileSpreadsheet, FileJson
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    customers, jobs, transactions, staff, inventory, accounts, purchases, services,
    restoreData, resetToFactory, connectToCloud, isCloudConnected, syncStatus, lastSyncError,
    logoUrl, updateLogo, currentUserRole, updatePassword, bulkAddTransactions, bulkAddPurchases, syncAllLocalToCloud,
    payrollHistory
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('PROFILE');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile Form State
  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');

  // Cloud Form State
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // File Import State
  const [importLoading, setImportLoading] = useState(false);

  // Added handleFullSystemBackup to fix Error on line 324
  const handleFullSystemBackup = () => {
    const backupData = {
      version: '2.2',
      timestamp: new Date().toISOString(),
      modules: {
        customers,
        jobs,
        transactions,
        staff,
        inventory,
        services,
        financials: accounts,
        payrollHistory,
        purchases
      }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto_dazzle_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Added handleRestore to fix Error on line 330
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("Warning: Restoring data will overwrite your current local database. Are you sure you want to proceed?")) {
           restoreData(data);
        }
      } catch (err) {
        console.error("Restore failed:", err);
        alert("Failed to parse backup file. Please ensure it is a valid Auto Dazzle JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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
      setError(err.message || "Failed to analyze data structure.");
    } finally {
      setLoading(false);
    }
  };

  const parseCsvFile = (file: File): Promise<string[][]> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const text = e.target?.result as string;
              const rows = text.split('\n').map(row => {
                  // Basic CSV parser that handles quoted strings with commas
                  const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                  if (matches) return matches.map(m => m.replace(/^"|"$/g, '').trim());
                  return row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
              });
              resolve(rows.filter(row => row.length > 1));
          };
          reader.readAsText(file);
      });
  };

  const cleanNum = (val: string) => {
      if (!val || val === '-' || val === '#ERROR!') return 0;
      return parseFloat(val.replace(/[^0-9.-]+/g, '')) || 0;
  };

  const handleMassImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'TX' | 'PO') => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportLoading(true);
      const allRows = await parseCsvFile(file);
      // Skip header if it contains "Date" or "Account"
      const dataRows = (allRows[0][0].toLowerCase().includes('date') || allRows[0][1].toLowerCase().includes('account')) 
        ? allRows.slice(1) 
        : allRows;
      
      try {
          if (type === 'TX') {
              // Expected user format (8 columns):
              // [0]Date, [1]AccountName, [2]AccountType, [3]AdjType, [4]Debit, [5]Credit, [6]Balance, [7]Description
              const newTxs: Transaction[] = [];
              
              dataRows.forEach((row, idx) => {
                  const date = row[0] || new Date().toISOString().split('T')[0];
                  const accName = row[1] || 'General';
                  const debit = cleanNum(row[4]);
                  const credit = cleanNum(row[5]);
                  const desc = row[7] || row[1] || 'Imported Record';

                  if (debit > 0) {
                      newTxs.push({
                          id: `tx-import-dr-${Date.now()}-${idx}`,
                          date,
                          type: 'EXPENSE',
                          category: accName,
                          amount: debit,
                          description: desc,
                          method: 'TRANSFER'
                      });
                  }
                  if (credit > 0) {
                      newTxs.push({
                          id: `tx-import-cr-${Date.now()}-${idx}`,
                          date,
                          type: 'INCOME',
                          category: accName,
                          amount: credit,
                          description: desc,
                          method: 'TRANSFER'
                      });
                  }
              });
              
              if (window.confirm(`Detected ${newTxs.length} accounting entries from your ledger. Import now?`)) {
                  bulkAddTransactions(newTxs);
                  alert(`Success! Imported ${newTxs.length} historical financial records.`);
              }
          } else {
              // Purchase Import Format: Date, DocNum, Vendor, Item, Qty, Unit, Rate, Category
              const newPos: PurchaseOrder[] = dataRows.map((row, idx) => {
                  const qty = cleanNum(row[4]) || 1;
                  const rate = cleanNum(row[6]) || 0;
                  return {
                      id: `po-mass-${Date.now()}-${idx}`,
                      date: row[0] || new Date().toISOString().split('T')[0],
                      docNumber: row[1] || 'IMP-REF',
                      vendorName: row[2] || 'Legacy Supplier',
                      itemName: row[3] || 'Operating Expense',
                      quantity: qty,
                      unit: row[5] || 'Units',
                      rate: rate,
                      amount: qty * rate,
                      status: 'PAID',
                      category: (row[7] as any) || 'GENERAL_EXPENSE'
                  };
              });
              
              if (window.confirm(`Found ${newPos.length} expense rows. Import to registry?`)) {
                  bulkAddPurchases(newPos);
                  alert(`Successfully imported ${newPos.length} purchase records!`);
              }
          }
      } catch (err) {
          console.error(err);
          alert("Import Error: Ensure the CSV columns match the required sequence.");
      } finally {
          setImportLoading(false);
          e.target.value = ''; 
      }
  };

  const copySupabaseSql = () => {
      const sql = `-- AUTO DAZZLE ERP FULL SCHEMA v2.2
-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, lifetime_value NUMERIC DEFAULT 0, joined_date DATE DEFAULT CURRENT_DATE, visits INTEGER DEFAULT 0, is_premium BOOLEAN DEFAULT FALSE, vehicles JSONB DEFAULT '[]'::jsonb);

-- 2. STAFF
CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT, email TEXT, phone TEXT, base_salary NUMERIC DEFAULT 0, active BOOLEAN DEFAULT TRUE, joined_date DATE DEFAULT CURRENT_DATE, current_advance NUMERIC DEFAULT 0, loan_balance NUMERIC DEFAULT 0);

-- 3. JOBS / TICKETS
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL, date DATE DEFAULT CURRENT_DATE, time_in TEXT, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL, segment TEXT, service_ids TEXT[], assigned_staff_ids TEXT[], status TEXT, total NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, notes TEXT, payment_status TEXT);

-- 4. TRANSACTIONS (LEDGER)
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, type TEXT, category TEXT, amount NUMERIC DEFAULT 0, method TEXT, description TEXT, reference_id TEXT);

-- 5. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, sku TEXT, name TEXT, category TEXT, unit TEXT, quantity_on_hand NUMERIC DEFAULT 0, reorder_point NUMERIC DEFAULT 0, cost_per_unit NUMERIC DEFAULT 0, supplier TEXT, last_restocked DATE);

-- 6. PURCHASES / EXPENSES
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, doc_number TEXT, vendor_name TEXT, item_name TEXT, quantity NUMERIC, unit TEXT, rate NUMERIC, amount NUMERIC, status TEXT, category TEXT);

-- 7. SERVICE MENU
CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, sku TEXT, name TEXT, category TEXT, duration_minutes INTEGER, base_price NUMERIC, prices JSONB);`;
      navigator.clipboard.writeText(sql);
      alert("Full SQL Schema v2.2 copied! Paste this into Supabase SQL Editor.");
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
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon size={32} className="text-slate-300" />}
                </div>
                <label className="w-full">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <div className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] text-center cursor-pointer hover:bg-black transition-all shadow-md">Update Logo</div>
                </label>
            </div>
            
            <div className="md:col-span-2">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Lock size={14} className="text-red-600"/> Security Access</h4>
                    <form onSubmit={handleUpdatePasswords} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Master Admin Passcode</label>
                                <input type="password" value={passSuper} onChange={e => setPassSuper(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Staff Portal Passcode</label>
                                <input type="password" value={passStaff} onChange={e => setPassStaff(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="px-8 py-3 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg transition-all">Save Credentials</button>
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
                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cloud Engine</h4>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-8">PostgreSQL / Supabase Sync</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                        <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Supabase URL" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                        <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="Service Role Key" className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white outline-none focus:border-red-600/50" />
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-6">
                        <button onClick={handleConnect} disabled={isConnecting} className="px-10 py-4 bg-red-600 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-xl flex items-center gap-3 disabled:bg-slate-700">
                            {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />} Establish Cloud Link
                        </button>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Status: {isCloudConnected ? 'CONNECTED' : 'OFFLINE'}</span>
                    </div>
                </div>
             </div>
             {isCloudConnected && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg"><HardDriveUpload size={24} /></div>
                        <div>
                            <h4 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Populate Cloud Database</h4>
                            <p className="text-xs text-emerald-700 font-medium max-w-md">Push all current local records (including Services and Pricing) to the cloud.</p>
                        </div>
                    </div>
                    <button onClick={handleForceSync} disabled={isSyncingAll} className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:bg-slate-400">
                        {isSyncingAll ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14}/>} Push Local to Cloud
                    </button>
                </div>
             )}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Code size={24} /></div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">SQL Schema v2.2</h4>
                        <p className="text-xs text-slate-500 font-medium">Includes <b>services</b> table for Cloud backup.</p>
                    </div>
                </div>
                <button onClick={copySupabaseSql} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase hover:bg-slate-200 flex items-center gap-2">
                    <Copy size={12} /> Copy Schema SQL
                </button>
             </div>
         </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6"><FileJson size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Export Local Database</h4>
                <button onClick={handleFullSystemBackup} className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg">Generate Backup</button>
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6"><RefreshCcw size={32} /></div>
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
            <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                    <FileSpreadsheet className="text-indigo-600" size={24}/>
                    <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Mass CSV Data Importer</h4>
                </div>
                <p className="text-sm text-indigo-700 mb-6">Import thousands of rows. The Ledger importer is now calibrated to your 8-column accounting format.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded border border-indigo-100 relative group">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Import Ledger (Accounting Format)</h5>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-blue-400 cursor-pointer transition-all">
                            {importLoading ? <Loader2 className="animate-spin text-blue-600" /> : <Upload className="text-slate-300 group-hover:text-blue-500 mb-2"/>}
                            <span className="text-xs font-bold text-slate-500">Select Accounting Ledger CSV</span>
                            <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={e => handleMassImport(e, 'TX')} />
                        </label>
                        <p className="text-[9px] text-slate-400 mt-3 font-mono leading-tight">Sequence: Date, Acc Name, Acc Type, Adj Type, Debit, Credit, Balance, Desc</p>
                    </div>
                    <div className="bg-white p-4 rounded border border-indigo-100 relative group">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Import Expenses (Purchases)</h5>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-indigo-400 cursor-pointer transition-all">
                            {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-slate-300 group-hover:text-indigo-500 mb-2"/>}
                            <span className="text-xs font-bold text-slate-500">Select Purchase CSV</span>
                            <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={e => handleMassImport(e, 'PO')} />
                        </label>
                        <p className="text-[9px] text-slate-400 mt-3 font-mono leading-tight">Sequence: Date, DocNum, Vendor, Item, Qty, Unit, Rate, Category</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Sparkles size={14} className="text-amber-500"/> AI Structure Analysis</h4>
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium">Analyze legacy data samples to generate a custom SQL migration plan.</p>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste a snippet of your data here..." className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" />
                    <div className="flex justify-end">
                        <button onClick={handleAnalyze} disabled={loading} className="px-8 py-3 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black flex items-center gap-2 disabled:bg-slate-400">
                            {loading ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />} Analyze Sample
                        </button>
                    </div>
                </div>
            </div>
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-xl">
                        <h5 className="text-amber-500 font-black uppercase text-[10px] mb-4 tracking-widest">Proposed Schema</h5>
                        <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap h-[300px] overflow-y-auto custom-scrollbar">{result.proposedSchema}</pre>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-[300px] overflow-y-auto custom-scrollbar">
                        <h5 className="text-slate-800 font-black uppercase text-[10px] mb-4 tracking-widest">Migration Plan</h5>
                        <div className="text-xs text-slate-600 whitespace-pre-wrap">{result.migrationPlan}</div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
