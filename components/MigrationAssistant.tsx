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
    bulkProcessJournal, restoreData, connectToCloud, updatePassword, accounts
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('MIGRATION');
  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const cleanNum = (val: string) => {
      if (!val || val.trim() === '' || val === '-' || val.includes('#')) return 0;
      const cleaned = val.replace(/[",\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isFinite(parsed) ? parsed : 0;
  };

  const getAccountType = (typeStr: string): AccountType => {
      const s = typeStr.toUpperCase();
      if (s.includes('REVENUE') || s.includes('INCOME')) return AccountType.REVENUE;
      if (s.includes('EXPENSE') || s.includes('OVERHEAD')) return AccountType.EXPENSE;
      if (s.includes('ASSET') || s.includes('BANK') || s.includes('CASH')) return AccountType.ASSET;
      if (s.includes('EQUITY') || s.includes('CAPITAL')) return AccountType.EQUITY;
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

          const dataRows = rows.filter(row => {
             if (row.length < 5) return false;
             const firstCol = (row[0] || '').toLowerCase();
             const isHeader = firstCol.includes('date') || firstCol.includes('account');
             const isTotal = firstCol.includes('total') || firstCol.includes('balance');
             return !isHeader && !isTotal && row[1];
          });
          
          const journalEntries: any[] = [];

          // PAIRING LOGIC: Iterate in steps of 2 for Double-Entry pairing
          for (let i = 0; i < dataRows.length; i += 2) {
              const row1 = dataRows[i];
              const row2 = dataRows[i+1];
              if (!row1 || !row2) break;

              // Row 1 Data
              const d1 = cleanNum(row1[3]);
              const c1 = cleanNum(row1[4]);
              const acc1 = row1[1];
              const type1 = getAccountType(row1[2] || '');
              
              // Row 2 Data
              const d2 = cleanNum(row2[3]);
              const c2 = cleanNum(row2[4]);
              const acc2 = row2[1];
              const type2 = getAccountType(row2[2] || '');

              const date = row1[0];
              const desc = row1[5] || `${acc1} - ${acc2}`;

              const entry = {
                  legs: [
                      { accountName: acc1, amount: d1 || c1, isDebit: d1 > 0, accountType: type1 },
                      { accountName: acc2, amount: d2 || c2, isDebit: d2 > 0, accountType: type2 }
                  ],
                  historyTx: undefined as any
              };

              // Determine P&L side for Dashboard History
              // A P&L transaction is defined by a Revenue or Expense leg.
              const plLeg = (type1 === AccountType.REVENUE || type1 === AccountType.EXPENSE) ? { acc: acc1, type: type1, amt: d1 || c1 } :
                           (type2 === AccountType.REVENUE || type2 === AccountType.EXPENSE) ? { acc: acc2, type: type2, amt: d2 || c2 } : null;

              if (plLeg) {
                  entry.historyTx = {
                      id: `imp-${Date.now()}-${i}`,
                      date: date,
                      type: plLeg.type === AccountType.REVENUE ? 'INCOME' : 'EXPENSE',
                      category: plLeg.acc,
                      amount: plLeg.amt,
                      description: desc,
                      method: 'TRANSFER'
                  };
              }

              journalEntries.push(entry);
          }

          if (journalEntries.length === 0) {
              alert("Import Error: No valid paired entries found.");
          } else if (window.confirm(`Found ${journalEntries.length} Transactions. Synchronize General Ledger?`)) {
              bulkProcessJournal(journalEntries);
              alert(`Success: ${journalEntries.length} paired transactions imported. Ledger balanced.`);
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
                    <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Double-Entry CSV Importer</h4>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> Automatic Journal Pairing Engine</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer transition-all bg-indigo-50/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 group-hover:text-indigo-600 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Drop Master Ledger CSV</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-700 shadow-inner">
                        <p className="text-[10px] font-black text-amber-400 uppercase mb-1">PRO-PAIRED MODE ACTIVE:</p>
                        <p className="text-[9px] text-slate-300 leading-relaxed font-bold">This importer now correctly pairs consecutive rows (e.g., Municipality Charge + Owner's Investment) to prevent zeroing out your revenue. The P&L side is extracted for history, while the balancing leg updates your bank/cash balances.</p>
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
