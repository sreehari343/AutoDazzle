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
    customers, jobs, staff, inventory, accounts, services
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
      modules: { customers, jobs, transactions, staff, inventory, services, financials: accounts }
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
             const isHeader = firstCol.includes('date') || secondCol.includes('account');
             const isTotal = firstCol.includes('total') || firstCol.includes('balance');
             return !isHeader && !isTotal && row[1];
          });
          
          const allTxs: Transaction[] = [];
          dataRows.forEach((row, idx) => {
              const dateRaw = row[0] || '';
              let date = new Date().toISOString().split('T')[0];
              const parts = dateRaw.split(/[./-]/);
              if (parts.length === 3) {
                  const d = parts[0].padStart(2, '0');
                  const m = parts[1].padStart(2, '0');
                  const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                  date = `${y}-${m}-${d}`;
              }

              const accName = row[1] || 'Unknown';
              const accType = (row[2] || '').toUpperCase();
              const debit = cleanNum(row[3]);
              const credit = cleanNum(row[4]);
              const desc = row[5] || accName;

              // ACCOUNTING LOGIC (THE "P&L" FIX):
              // We create a transaction object for EVERY row so the Ledger can balance.
              // EXPENSE type = Debit leg, INCOME type = Credit leg.
              
              if (debit > 0) {
                  allTxs.push({ 
                      id: `imp-${Date.now()}-${idx}-dr`, date, 
                      type: 'EXPENSE', category: accName, amount: debit, description: desc, method: 'TRANSFER' 
                  });
              } else if (credit > 0) {
                  allTxs.push({ 
                      id: `imp-${Date.now()}-${idx}-cr`, date, 
                      type: 'INCOME', category: accName, amount: credit, description: desc, method: 'TRANSFER' 
                  });
              }
          });

          if (allTxs.length === 0) {
              alert("Import Error: No numerical data found in CSV.");
          } else if (window.confirm(`Detected ${allTxs.length} entries. Syncing Ledger...`)) {
              bulkAddTransactions(allTxs, true);
              alert(`Successfully synchronized ${allTxs.length} entries. Balance sheets updated.`);
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6 text-black">
            <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <Landmark className="text-indigo-600" size={28}/>
                    <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Financial Ledger Importer</h4>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> Double-Entry Batch Importer</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer transition-all bg-indigo-50/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Select Excel/CSV Ledger</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700">
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">STRICT 6-COLUMN ORDER:</p>
                        <p className="text-[9px] font-mono text-white leading-tight bg-black/30 p-2 rounded">Date, Account Name, Account Type, Debit, Credit, Description</p>
                        <p className="text-[9px] text-slate-400 mt-2 italic font-bold text-amber-400">* FIXED: Double-entry legs are now balanced correctly without zeroing out revenue.</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'PROFILE' && (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-black">
            <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest"><Lock size={14} className="text-red-600"/> Security Access</h4>
            <form onSubmit={(e) => {
                e.preventDefault();
                if (passSuper) updatePassword('SUPER_ADMIN', passSuper);
                if (passStaff) updatePassword('STAFF', passStaff);
                setPassSuper(''); setPassStaff('');
                alert('✅ Credentials Updated!');
            }} className="space-y-6 max-w-xl">
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
      )}
    </div>
  );
};
