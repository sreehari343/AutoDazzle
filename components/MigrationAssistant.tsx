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
    bulkProcessJournal, updatePassword
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'MIGRATION' | 'PROFILE'>('MIGRATION');
  const [importLoading, setImportLoading] = useState(false);

  const cleanNum = (val: string) => {
      if (!val) return 0;
      // Handle parentheses for negative numbers e.g. (38,000)
      let cleaned = val.replace(/[",\s]/g, '');
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
          cleaned = '-' + cleaned.slice(1, -1);
      }
      const parsed = parseFloat(cleaned);
      return isFinite(parsed) ? Math.abs(parsed) : 0;
  };

  const getAccountType = (typeStr: string, name: string): AccountType => {
      const s = (typeStr || name).toUpperCase();
      if (s.includes('REVENUE') || s.includes('INCOME') || s.includes('SALES')) return AccountType.REVENUE;
      if (s.includes('EXPENSE') || s.includes('OVERHEAD') || s.includes('CHARGE') || s.includes('FEES')) return AccountType.EXPENSE;
      if (s.includes('ASSET') || s.includes('BANK') || s.includes('CASH')) return AccountType.ASSET;
      if (s.includes('EQUITY') || s.includes('CAPITAL') || s.includes('INVESTMENT')) return AccountType.EQUITY;
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

          // Skip headers and empty rows
          const dataRows = rows.filter(row => {
             if (row.length < 4) return false;
             const firstCol = (row[0] || '').toLowerCase();
             return !firstCol.includes('date') && !firstCol.includes('account') && !firstCol.includes('total');
          });
          
          const journalEntries: any[] = [];

          // PAIRING ENGINE: Processes Row A (Debit) + Row B (Credit) as ONE EVENT
          for (let i = 0; i < dataRows.length; i += 2) {
              const row1 = dataRows[i];
              const row2 = dataRows[i+1];
              if (!row1 || !row2) break;

              const acc1 = row1[1];
              const acc2 = row2[1];
              const type1 = getAccountType(row1[2], acc1);
              const type2 = getAccountType(row2[2], acc2);
              
              const val1 = cleanNum(row1[3]) || cleanNum(row1[4]);
              const val2 = cleanNum(row2[3]) || cleanNum(row2[4]);

              const date = row1[0];
              const desc = row1[5] || `${acc1} funded by ${acc2}`;

              // SMART MERGER:
              // If Row 1 and Row 2 have the SAME account name (e.g. Municipality Charge),
              // we treat the first one as the actual Expense/Income and the second as just the 'Source' label.
              // This prevents the 100 - 100 = 0 zero-out bug.
              const isSameAccount = acc1.toLowerCase() === acc2.toLowerCase();
              
              const entry = {
                  legs: [
                      { accountName: acc1, amount: val1, isDebit: true, accountType: type1 }
                  ],
                  historyTx: {
                      id: `imp-${Date.now()}-${i}`,
                      date: date,
                      type: type1 === AccountType.REVENUE ? 'INCOME' : 'EXPENSE',
                      category: acc1,
                      amount: val1,
                      description: desc,
                      method: acc2.toUpperCase().includes('CASH') ? 'CASH' : 'TRANSFER'
                  }
              };

              // Only add the balancing leg to the ledger if it's actually a different account
              if (!isSameAccount) {
                  entry.legs.push({ accountName: acc2, amount: val2, isDebit: false, accountType: type2 });
              }

              journalEntries.push(entry);
          }

          if (journalEntries.length > 0) {
              bulkProcessJournal(journalEntries);
              alert(`Import Complete: Processed ${journalEntries.length} merged transactions.`);
          } else {
              alert("Error: No valid transaction pairs found in CSV.");
          }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter">System Migration</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Accounting Protocol 4.0</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'MIGRATION' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-50'}`}>Importer</button>
             <button onClick={() => setActiveTab('PROFILE')} className={`px-6 py-3 text-xs font-black uppercase rounded-xl border-4 border-black transition-all ${activeTab === 'PROFILE' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-50'}`}>Security</button>
        </div>
      </div>

      {activeTab === 'MIGRATION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[32px] border-4 border-black shadow-[12px_12px_0px_0px_rgba(79,70,229,1)]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg"><Landmark size={32}/></div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tight">Master Ledger Import</h4>
                </div>
                
                <label className="flex flex-col items-center justify-center border-4 border-dashed border-indigo-200 rounded-[32px] p-12 hover:border-indigo-600 cursor-pointer transition-all bg-indigo-50/30 group mb-8">
                    {importLoading ? <Loader2 className="animate-spin text-indigo-600" size={48} /> : <Upload className="text-indigo-600 mb-4" size={48}/>}
                    <span className="text-xl font-black text-indigo-900 uppercase">Drop CSV File</span>
                    <p className="text-xs font-bold text-indigo-400 mt-2 uppercase">Paired Row Mode Active</p>
                    <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                </label>

                <div className="bg-black text-white p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-amber-400">
                        <AlertCircle size={16}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Logic: Circular Fix Active</span>
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-slate-300">
                        If your CSV lists the same account name twice (once for Debit, once for Credit), the system will now correctly interpret the first row as the Balance Increase and the second as the Funding Source. This prevents the "Zero Revenue" error.
                    </p>
                </div>
            </div>

            <div className="bg-slate-50 p-10 rounded-[32px] border-4 border-black border-dashed flex flex-col justify-center items-center text-center">
                 <Database size={64} className="text-slate-300 mb-6"/>
                 <h4 className="text-xl font-black text-slate-400 uppercase mb-2">Cloud Sync Terminal</h4>
                 <p className="text-xs font-bold text-slate-400 max-w-xs uppercase leading-loose">Real-time database mirroring is currently offline. All data is saved to Local Secure Storage.</p>
            </div>
        </div>
      )}
    </div>
  );
};
