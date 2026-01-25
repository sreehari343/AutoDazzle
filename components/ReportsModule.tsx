import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { AccountType, Transaction, LedgerAccount } from '../types.ts';
import { LOGO_URL } from '../constants.ts';
import { 
  TrendingUp, Download, FileText, Scale, UserCheck, 
  Truck, ArrowRightLeft, Printer, X, Search, Filter, AlertCircle, ArrowUp, ArrowDown, FileSpreadsheet, Copy, Calendar
} from 'lucide-react';

type ReportID = 'PL' | 'BS' | 'TB' | 'CF' | 'GL' | 'AR' | 'AP' | 'EXPORTS';

interface AgingDetail {
  name: string;
  ref: string;
  date: string;
  days: number;
  amount: number;
  bucket: string;
}

export const ReportsModule: React.FC = () => {
  const { accounts, transactions, customers, purchases, jobs, services } = useERP();
  const [activeReport, setActiveReport] = useState<ReportID>('GL');
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  
  const [glFilter, setGlFilter] = useState<AccountType | 'ALL'>('ALL');
  const [glSearch, setGlSearch] = useState('');

  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportTab, setExportTab] = useState<'SALES' | 'PURCHASE'>('SALES');

  const safeVal = (val: any) => {
      const num = parseFloat(val);
      return (val === null || val === undefined || isNaN(num)) ? 0 : num;
  };

  const financials = useMemo(() => {
    const revenueAccounts = accounts.filter(a => a.type === AccountType.REVENUE);
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE);
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + safeVal(a.balance), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + safeVal(a.balance), 0);
    const netIncome = totalRevenue - totalExpenses;

    const assetAccounts = accounts.filter(a => a.type === AccountType.ASSET);
    const liabilityAccounts = accounts.filter(a => a.type === AccountType.LIABILITY);
    const equityAccounts = accounts.filter(a => a.type === AccountType.EQUITY);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + safeVal(a.balance), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + safeVal(a.balance), 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + safeVal(a.balance), 0);
    
    return {
      revenueAccounts, expenseAccounts, assetAccounts, liabilityAccounts, equityAccounts,
      totalRevenue, totalExpenses, netIncome,
      totalAssets, totalLiabilities, totalEquity,
      totalDebits: totalAssets + totalExpenses,
      totalCredits: totalLiabilities + totalEquity + totalRevenue
    };
  }, [accounts]);

  const cashFlow = useMemo(() => {
      const cashAccount = accounts.find(a => a.code === '1000');
      const closingBalance = cashAccount ? safeVal(cashAccount.balance) : 0;
      const inflows = transactions.filter(t => t.type === 'INCOME');
      const outflows = transactions.filter(t => t.type === 'EXPENSE');
      const netCashFlow = inflows.reduce((s, t) => s + t.amount, 0) - outflows.reduce((s, t) => s + t.amount, 0);
      return { openingBalance: closingBalance - netCashFlow, closingBalance, netCashFlow };
  }, [accounts, transactions]);

  const getAccountTransactions = (account: LedgerAccount) => {
      return transactions.filter(tx => tx.category.toLowerCase() === account.name.toLowerCase()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getLedgerDetails = (account: LedgerAccount | null) => {
      if (!account) return { openingBalance: 0, txs: [] };
      const txs = getAccountTransactions(account);
      let netChange = 0;
      txs.forEach(tx => {
          const isDebitNature = account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;
          if (isDebitNature) {
              netChange += (tx.type === 'EXPENSE' ? tx.amount : -tx.amount);
          } else {
              netChange += (tx.type === 'INCOME' ? tx.amount : -tx.amount);
          }
      });
      return { openingBalance: account.balance - netChange, txs };
  };

  const filteredGLAccounts = accounts.filter(acc => {
      const matchesType = glFilter === 'ALL' || acc.type === glFilter;
      const matchesSearch = acc.name.toLowerCase().includes(glSearch.toLowerCase()) || acc.code.includes(glSearch);
      return matchesType && matchesSearch;
  });

  const handlePrint = () => window.print();

  const SidebarItem = ({ id, label, icon: Icon }: { id: ReportID, label: string, icon: any }) => (
    <button onClick={() => setActiveReport(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all mb-2 ${activeReport === id ? 'bg-black text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={16} />{label}</button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh] print:block">
      <div className="w-full lg:w-64 shrink-0 print:hidden">
        <div className="bg-white rounded-3xl border-4 border-black p-4 sticky top-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Financial Intelligence</p>
          <SidebarItem id="EXPORTS" label="Day Book" icon={FileSpreadsheet} />
          <SidebarItem id="PL" label="Profit & Loss" icon={TrendingUp} />
          <SidebarItem id="BS" label="Balance Sheet" icon={Scale} />
          <SidebarItem id="TB" label="Trial Balance" icon={FileText} />
          <SidebarItem id="GL" label="General Ledger" icon={FileText} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[40px] border-4 border-black p-10 overflow-x-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] print:border-none print:p-0">
        {activeReport === 'PL' && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl font-black text-black uppercase tracking-tighter mb-10 border-b-8 border-slate-100 pb-6">Profit & Loss Statement</h3>
            <div className="space-y-10">
              <section>
                <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-3xl border-4 border-emerald-200 mb-6">
                   <h4 className="font-black text-emerald-800 uppercase text-lg">Total Revenue</h4>
                   <span className="font-black text-3xl text-emerald-700">₹{financials.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-6">
                   {financials.revenueAccounts.map(acc => (
                     <div key={acc.id} className="flex justify-between border-b-2 border-slate-50 py-3 text-lg text-black">
                        <span className="font-black uppercase text-slate-400 text-xs">{acc.name}</span>
                        <span className="font-black">₹{safeVal(acc.balance).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center bg-rose-50 p-6 rounded-3xl border-4 border-rose-200 mb-6">
                   <h4 className="font-black text-rose-800 uppercase text-lg">Total Expenses</h4>
                   <span className="font-black text-3xl text-rose-700">₹{financials.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-6">
                   {financials.expenseAccounts.map(acc => (
                     <div key={acc.id} className="flex justify-between border-b-2 border-slate-50 py-3 text-lg text-black">
                        <span className="font-black uppercase text-slate-400 text-xs">{acc.name}</span>
                        <span className="font-black text-slate-600">₹{safeVal(acc.balance).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </section>

              <div className="bg-black text-white p-10 rounded-[40px] flex justify-between items-center shadow-2xl">
                  <span className="text-2xl font-black uppercase tracking-widest">Net Profit</span>
                  <span className="text-5xl font-black">₹{financials.netIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'GL' && (
          <div className="max-w-5xl mx-auto">
             <h3 className="text-4xl font-black text-black uppercase tracking-tighter mb-10 border-b-8 border-slate-100 pb-6">General Ledger</h3>
             <div className="flex gap-4 mb-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={glSearch} onChange={e => setGlSearch(e.target.value)} placeholder="Search Ledger..." className="w-full pl-12 pr-6 py-4 border-4 border-black rounded-2xl font-black uppercase text-sm outline-none focus:ring-8 focus:ring-blue-100" />
                </div>
             </div>
             <table className="w-full text-left">
                <thead className="bg-black text-white text-[11px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="px-8 py-5">Code</th>
                        <th className="px-8 py-5">Account</th>
                        <th className="px-8 py-5 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody className="divide-y-4 divide-slate-50">
                    {filteredGLAccounts.map(acc => (
                        <tr key={acc.id} onClick={() => setSelectedAccount(acc)} className="hover:bg-blue-50 cursor-pointer transition-all">
                            <td className="px-8 py-5 font-mono font-black text-slate-400">{acc.code}</td>
                            <td className="px-8 py-5 font-black text-black text-lg uppercase">{acc.name}</td>
                            <td className="px-8 py-5 text-right font-black text-2xl">₹{safeVal(acc.balance).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        )}

        {selectedAccount && createPortal(
            <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-8">
                <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[48px] border-[12px] border-black flex flex-col">
                    <div className="p-12 border-b-8 border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div>
                            <h3 className="text-5xl font-black text-black uppercase tracking-tighter">{selectedAccount.name}</h3>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Individual Transaction Trace</p>
                        </div>
                        <button onClick={() => setSelectedAccount(null)} className="p-6 bg-slate-100 rounded-3xl border-4 border-black hover:bg-red-600 hover:text-white transition-all"><X size={40}/></button>
                    </div>
                    <div className="p-12">
                        {(() => {
                            const { openingBalance, txs } = getLedgerDetails(selectedAccount);
                            return (
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase text-slate-400 border-b-4 border-slate-100">
                                        <tr>
                                            <th className="py-4">Date</th>
                                            <th className="py-4">Event Description</th>
                                            <th className="py-4 text-right">Debit/Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-50">
                                        <tr className="bg-slate-50">
                                            <td className="py-6 px-4 font-black text-slate-300">OPENING</td>
                                            <td className="py-6 px-4 font-black text-slate-400 italic">Balance Brought Forward</td>
                                            <td className="py-6 px-4 text-right font-black text-slate-600">₹{openingBalance.toLocaleString()}</td>
                                        </tr>
                                        {txs.map(tx => (
                                            <tr key={tx.id}>
                                                <td className="py-6 font-bold text-slate-500">{tx.date}</td>
                                                <td className="py-6 font-black text-black uppercase">{tx.description}</td>
                                                <td className={`py-6 text-right font-black text-xl ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t-8 border-black pt-10 mt-10">
                                        <tr>
                                            <td colSpan={2} className="py-10 text-3xl font-black uppercase tracking-widest text-black">Closing Balance</td>
                                            <td className="py-10 text-right font-black text-5xl">₹{safeVal(selectedAccount.balance).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            );
                        })()}
                    </div>
                </div>
            </div>,
            document.body
        )}
      </div>
    </div>
  );
};
