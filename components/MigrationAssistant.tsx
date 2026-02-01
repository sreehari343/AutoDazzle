import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Copy, Sparkles, X, Code, Landmark, AlertCircle, FileSpreadsheet, FileJson
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    customers, jobs, transactions, staff, inventory, accounts, purchases, services,
    restoreData, connectToCloud, isCloudConnected, 
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

  const cleanNum = (val: string) => {
      if (!val || val.trim() === '-' || val.trim() === '') return 0;
      const cleaned = val.replace(/[^0-9.-]+/g, '');
      return parseFloat(cleaned) || 0;
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

          // Filter header row (usually contains words like "Date" or "Account")
          const dataRows = (rows[0][0]?.toLowerCase().includes('date') || rows[0][1]?.toLowerCase().includes('acc')) ? rows.slice(1) : rows;
          
          const newTxs: Transaction[] = [];
          dataRows.forEach((row, idx) => {
              // STRICT 6 COLS: [0]Date, [1]Acc Name, [2]Acc Type, [3]Debit, [4]Credit, [5]Description
              if (row.length < 5) return;

              const date = row[0] || new Date().toISOString().split('T')[0];
              const accName = row[1] || 'Imported Account';
              const debit = cleanNum(row[3]);
              const credit = cleanNum(row[4]);
              const desc = row[5] || accName;

              if (debit > 0) {
                  newTxs.push({ 
                      id: `imp-dr-${Date.now()}-${idx}`, 
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
                      id: `imp-cr-${Date.now()}-${idx}`, 
                      date, 
                      type: 'INCOME', 
                      category: accName, 
                      amount: credit, 
                      description: desc, 
                      method: 'TRANSFER' 
                  });
              }
          });

          if (newTxs.length > 0 && window.confirm(`Import ${newTxs.length} financial entries?`)) {
              bulkAddTransactions(newTxs);
              alert(`Successfully imported ${newTxs.length} records.`);
          } else if (newTxs.length === 0) {
              alert("No valid data found in those 6 columns.");
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Setup & Migration</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Landmark className="text-indigo-600" size={28}/>
                    <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Master Ledger Importer</h4>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> 6-Column CSV/Excel Only</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer transition-all bg-indigo-50/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Select Financial File</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Strict Sequence:</p>
                        <p className="text-[9px] font-mono text-slate-600 leading-tight uppercase">Date, Acc Name, Acc Type, Debit, Credit, Description</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Sparkles size={14} className="text-amber-500"/> AI Schema Generator</h4>
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-medium">Paste custom legacy data below for Gemini AI to propose a SQL mapping.</p>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste rows here..." className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <div className="flex justify-end">
                        <button onClick={() => {
                            if (!inputText.trim()) return;
                            setLoading(true);
                            analyzeDataStructure(inputText).then(res => { setResult(res); setLoading(false); }).catch(() => setLoading(false));
                        }} disabled={loading} className="px-8 py-3 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black flex items-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />} Analyze
                        </button>
                    </div>
                </div>
            </div>
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-xl overflow-hidden">
                        <h5 className="text-amber-500 font-black text-[10px] uppercase mb-4 tracking-widest">Proposed Schema</h5>
                        <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-60">{result.proposedSchema}</pre>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                         <h5 className="text-slate-800 font-black text-[10px] uppercase mb-4 tracking-widest">Migration Steps</h5>
                         <div className="text-xs text-slate-600 whitespace-pre-wrap overflow-y-auto">{result.migrationPlan}</div>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto"><FileJson size={32} /></div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Export Ledger</h4>
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
    </div>
  );
};
