
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { AccountType, Transaction } from '../types.ts';
import { LOGO_URL } from '../constants.ts';
import { Plus, Download, ArrowUpRight, ArrowDownLeft, PieChart, Landmark, History, FileText, Printer, Minus, X, Info } from 'lucide-react';

export const Financials: React.FC = () => {
  const { accounts, transactions, addTransaction } = useERP();
  const [activeTab, setActiveTab] = useState<'GL' | 'PL' | 'TRANSACTIONS'>('GL');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const [txForm, setTxForm] = useState({
     date: new Date().toISOString().split('T')[0],
     amount: 0,
     category: '',
     description: '',
     method: 'CASH' as const
  });

  const handleTxSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newTx: Transaction = {
          id: `tx-man-${Date.now()}`,
          date: txForm.date,
          type: txType,
          category: txForm.category,
          amount: txForm.amount,
          method: txForm.method,
          description: txForm.description
      };
      addTransaction(newTx);
      setIsTxModalOpen(false);
      setTxForm({ date: new Date().toISOString().split('T')[0], amount: 0, category: '', description: '', method: 'CASH' });
  };

  const stats = useMemo(() => {
    const assets = accounts.filter(a => a.type === AccountType.ASSET).reduce((sum, a) => sum + a.balance, 0);
    const liabilities = accounts.filter(a => a.type === AccountType.LIABILITY).reduce((sum, a) => sum + a.balance, 0);
    const revenue = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    return { assets, liabilities, equity: assets - liabilities, revenue, expenses, netIncome: revenue - expenses };
  }, [accounts, transactions]);

  const handlePrint = () => {
      window.print();
  };

  const handleDownload = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "financial_report.csv";

    if (activeTab === 'GL') {
        filename = "account_balances.csv";
        csvContent += "Code,Account Name,Type,Balance\n";
        accounts.forEach(acc => {
            csvContent += `${acc.code},${acc.name},${acc.type},${acc.balance}\n`;
        });
    } else if (activeTab === 'TRANSACTIONS') {
        filename = "transactions.csv";
        csvContent += "Date,Type,Category,Description,Amount,Method\n";
        transactions.forEach(tx => {
            csvContent += `${tx.date},${tx.type},${tx.category},"${tx.description}",${tx.amount},${tx.method}\n`;
        });
    } else if (activeTab === 'PL') {
        filename = "profit_loss.csv";
        csvContent += "Metric,Value\n";
        csvContent += `Revenue,${stats.revenue}\n`;
        csvContent += `Expenses,${stats.expenses}\n`;
        csvContent += `Net Income,${stats.netIncome}\n`;
        csvContent += `Assets,${stats.assets}\n`;
        csvContent += `Liabilities,${stats.liabilities}\n`;
        csvContent += `Equity,${stats.equity}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase transition-all border ${
        activeTab === id 
        ? 'bg-slate-900 text-white border-slate-900' 
        : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="hidden print:flex flex-col items-center mb-8 border-b-2 border-black pb-4">
         <img src={LOGO_URL} className="w-24 mb-2" alt="Logo" />
         <h1 className="text-2xl font-black uppercase">Auto Dazzle Detailing Spa</h1>
         <p className="text-sm font-bold text-slate-600">Official Financial Record</p>
         <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Financial Ledger</h2>
          <p className="text-xs text-slate-500 font-medium">Double-Entry Accounting System</p>
        </div>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
             <button onClick={handleDownload} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-bold uppercase shadow-sm hover:bg-slate-50 flex items-center transition-all">
                <Download size={14} className="mr-2"/> Download CSV
             </button>
             <button onClick={handlePrint} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-bold uppercase shadow-sm hover:bg-slate-50 flex items-center transition-all">
                <Printer size={14} className="mr-2"/> Print View
             </button>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 print:hidden">
          <Info className="text-blue-600 shrink-0" size={24} />
          <div>
              <h4 className="text-sm font-bold text-blue-900 uppercase">How the General Ledger (GL) Works</h4>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  This system uses automatic double-entry accounting. 
                  When you record an <strong>Income</strong> (Receipt), it increases 'Cash on Hand' (Asset) and 'Service Revenue' (Revenue).
                  When you record an <strong>Expense</strong> (Payment), it decreases 'Cash on Hand' and increases the specific Expense account (e.g., Labor, Rent).
                  Everything is tracked in real-time below.
              </p>
          </div>
      </div>
      
      <div className="flex gap-2 print:hidden mb-2">
          <TabButton id="GL" label="Account Balances" icon={Landmark} />
          <TabButton id="PL" label="Profit & Loss" icon={PieChart} />
          <TabButton id="TRANSACTIONS" label="Transactions" icon={History} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
          <p className="text-2xl font-black text-emerald-700">₹{stats.assets.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Liabilities</p>
          <p className="text-2xl font-black text-rose-700">₹{stats.liabilities.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Owner's Equity</p>
          <p className="text-2xl font-black text-blue-700">₹{stats.equity.toLocaleString()}</p>
        </div>
      </div>

      {activeTab === 'GL' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
            <h3 className="font-bold text-slate-800 uppercase text-sm">Account Balances (General Ledger)</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200 print:text-black">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Code</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Account Name</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Type</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px] text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-500 font-bold text-xs">{account.code}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{account.name}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border print:border-black print:text-black print:bg-white
                      ${account.type === AccountType.ASSET ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                      ${account.type === AccountType.LIABILITY ? 'bg-rose-50 text-rose-700 border-rose-100' : ''}
                      ${account.type === AccountType.EQUITY ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                      ${account.type === AccountType.REVENUE ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                      ${account.type === AccountType.EXPENSE ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                    `}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    ₹{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'PL' && (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:w-full print:p-0">
           <div className="flex justify-between items-center mb-8 border-b pb-4 print:hidden">
              <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase">Profit & Loss Statement</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Period: Current Month</p>
              </div>
           </div>
           
           <div className="space-y-6">
              <section>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <h4 className="font-bold text-slate-700 uppercase text-xs">Revenue</h4>
                  <span className="font-black text-emerald-600 print:text-black">₹{stats.revenue.toLocaleString()}</span>
                </div>
                <div className="pl-4">
                   <div className="flex justify-between text-sm text-slate-500 font-medium print:text-black">
                      <span>Service Sales</span>
                      <span>₹{stats.revenue.toLocaleString()}</span>
                   </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <h4 className="font-bold text-slate-700 uppercase text-xs">Expenses</h4>
                  <span className="font-black text-rose-600 print:text-black">(₹{stats.expenses.toLocaleString()})</span>
                </div>
                <div className="pl-4 space-y-2">
                   {accounts.filter(a => a.type === AccountType.EXPENSE).map(exp => (
                     <div key={exp.id} className="flex justify-between text-sm text-slate-600 print:text-black">
                        <span>{exp.name}</span>
                        <span>₹{exp.balance.toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </section>

              <section className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4 print:bg-white print:border-t-2 print:border-b-2 print:border-black print:rounded-none">
                 <div className="flex justify-between items-center">
                    <div>
                       <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-black">Net Income</h4>
                       <p className="text-2xl font-black text-slate-900">₹{stats.netIncome.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-black">Margin</p>
                       <p className="text-2xl font-black text-amber-500 print:text-black">{stats.revenue > 0 ? ((stats.netIncome/(stats.revenue || 1))*100).toFixed(1) : 0}%</p>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
                <h3 className="font-bold text-slate-800 uppercase text-sm">Transaction History</h3>
                <div className="flex gap-2 print:hidden">
                  <button onClick={() => { setTxType('INCOME'); setIsTxModalOpen(true); }} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"><Plus size={12}/> Receipt (In)</button>
                  <button onClick={() => { setTxType('EXPENSE'); setIsTxModalOpen(true); }} className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 flex items-center gap-1"><Minus size={12}/> Payment (Out)</button>
                </div>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-200 print:text-black">
                    <tr>
                        <th className="px-6 py-3 font-bold uppercase text-[10px]">Date</th>
                        <th className="px-6 py-3 font-bold uppercase text-[10px]">Type</th>
                        <th className="px-6 py-3 font-bold uppercase text-[10px]">Description</th>
                        <th className="px-6 py-3 font-bold uppercase text-[10px] text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 text-slate-500 font-medium text-xs">{tx.date}</td>
                            <td className="px-6 py-3">
                                {tx.type === 'INCOME' ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase border border-green-200 print:border-black print:text-black print:bg-white">Revenue</span>
                                ) : (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase border border-red-200 print:border-black print:text-black print:bg-white">Expense</span>
                                )}
                            </td>
                            <td className="px-6 py-3 text-slate-800 font-medium">{tx.description}</td>
                            <td className={`px-6 py-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-slate-900'} print:text-black`}>
                                {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {isTxModalOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 print:hidden">
             <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-2xl text-black">
                 <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                     <h3 className="text-lg font-bold uppercase text-black">{txType === 'INCOME' ? 'Record Receipt' : 'Record Payment'}</h3>
                     <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                 </div>
                 
                 <form onSubmit={handleTxSubmit} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                             <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Date</label>
                             <input type="date" required value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white"/>
                        </div>
                        <div>
                             <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Amount (₹)</label>
                             <input type="number" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white"/>
                        </div>
                     </div>
                     <div>
                         <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Category</label>
                         <input type="text" placeholder="e.g. Rent, Sales" required value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-medium outline-none focus:border-blue-500 text-black bg-white"/>
                     </div>
                     <div>
                         <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Description</label>
                         <input type="text" required value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-medium outline-none focus:border-blue-500 text-black bg-white"/>
                     </div>
                     <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setIsTxModalOpen(false)} className="flex-1 py-2 text-slate-600 font-bold border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
                         <button type="submit" className={`flex-[2] py-2 text-white font-bold rounded shadow-sm ${txType === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Save Transaction</button>
                     </div>
                 </form>
             </div>
          </div>,
          document.body
      )}
    </div>
  );
};
