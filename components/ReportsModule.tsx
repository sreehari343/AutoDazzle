
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
  const [activeReport, setActiveReport] = useState<ReportID>('GL'); // Default to GL for quick access
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  
  // GL Filter State
  const [glFilter, setGlFilter] = useState<AccountType | 'ALL'>('ALL');
  const [glSearch, setGlSearch] = useState('');

  // Export State
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportTab, setExportTab] = useState<'SALES' | 'PURCHASE'>('SALES');

  const safeVal = (val: any) => {
      const num = parseFloat(val);
      return (val === null || val === undefined || isNaN(num)) ? 0 : num;
  };

  // --- Financial Calculations ---
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
    
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;
    
    const totalDebits = totalAssets + totalExpenses; 
    const totalCredits = totalLiabilities + totalEquity + totalRevenue;

    return {
      revenueAccounts, expenseAccounts, assetAccounts, liabilityAccounts, equityAccounts,
      totalRevenue, totalExpenses, netIncome,
      totalAssets, totalLiabilities, totalEquity,
      totalLiabilitiesAndEquity,
      totalDebits, totalCredits
    };
  }, [accounts]);

  // --- Cash Flow Logic (Direct Method) ---
  const cashFlow = useMemo(() => {
      // 1. Identify Cash Accounts (Asset - Cash/Bank). Assuming '1000' is Cash.
      const cashAccount = accounts.find(a => a.code === '1000');
      const closingBalance = cashAccount ? safeVal(cashAccount.balance) : 0;

      // 2. Calculate Net Flow from Transactions
      const inflows = transactions.filter(t => t.type === 'INCOME');
      const outflows = transactions.filter(t => t.type === 'EXPENSE');

      const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
      const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);
      const netCashFlow = totalInflow - totalOutflow;

      // 3. Derived Opening Balance (Closing - Net Movement)
      const openingBalance = closingBalance - netCashFlow;

      // Group by Category for Reporting
      const inflowCategories: Record<string, number> = {};
      inflows.forEach(t => {
          inflowCategories[t.category] = (inflowCategories[t.category] || 0) + t.amount;
      });

      const outflowCategories: Record<string, number> = {};
      outflows.forEach(t => {
          outflowCategories[t.category] = (outflowCategories[t.category] || 0) + t.amount;
      });

      return {
          openingBalance,
          closingBalance,
          netCashFlow,
          totalInflow,
          totalOutflow,
          inflowCategories,
          outflowCategories
      };
  }, [accounts, transactions]);

  // --- Aging Logic ---
  const getDaysDiff = (dateStr: string) => {
      const today = new Date();
      const date = new Date(dateStr);
      return Math.floor((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
  };

  const arAging = useMemo(() => {
      const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      const details: AgingDetail[] = [];

      // Calculate based on Unpaid Jobs
      jobs.filter(j => j.paymentStatus === 'UNPAID' || j.paymentStatus === 'PARTIAL').forEach(job => {
          const days = getDaysDiff(job.date);
          const amount = job.total; // Simplified
          const customer = customers.find(c => c.id === job.customerId);
          
          let bucket = '0-30';
          if (days > 90) bucket = '90+';
          else if (days > 60) bucket = '61-90';
          else if (days > 30) bucket = '31-60';

          buckets[bucket as keyof typeof buckets] += amount;
          details.push({
              name: customer?.name || 'Unknown',
              ref: job.ticketNumber,
              date: job.date,
              days,
              amount,
              bucket
          });
      });
      return { buckets, details };
  }, [jobs, customers]);

  const apAging = useMemo(() => {
      const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      const details: AgingDetail[] = [];

      purchases.filter(p => p.status === 'RECEIVED' || p.status === 'PENDING').forEach(po => {
          const days = getDaysDiff(po.date);
          const amount = po.amount;
          
          let bucket = '0-30';
          if (days > 90) bucket = '90+';
          else if (days > 60) bucket = '61-90';
          else if (days > 30) bucket = '31-60';

          buckets[bucket as keyof typeof buckets] += amount;
          details.push({
              name: po.vendorName,
              ref: po.docNumber,
              date: po.date,
              days,
              amount,
              bucket
          });
      });
      return { buckets, details };
  }, [purchases]);

  // --- Account Ledger Filter ---
  const getAccountTransactions = (account: LedgerAccount) => {
      return transactions.filter(tx => {
          const cat = tx.category.toLowerCase();
          
          if (account.code === '1000') {
             return tx.type === 'INCOME' || tx.type === 'EXPENSE';
          }
          if (account.code === '4000') {
             return tx.type === 'INCOME';
          }
          if (tx.type === 'EXPENSE' && account.type === AccountType.EXPENSE) {
              if (account.code === '5100') return cat.includes('labor') || cat.includes('payroll') || cat.includes('salary') || cat.includes('commission');
              if (account.code === '5200') return cat.includes('rent') || cat.includes('lease');
              if (account.code === '5300') return cat.includes('utility') || cat.includes('power') || cat.includes('water') || cat.includes('bill') || cat.includes('internet');
              if (account.code === '5000') {
                  const isOther = cat.includes('labor') || cat.includes('payroll') || cat.includes('salary') || cat.includes('commission') ||
                                  cat.includes('rent') || cat.includes('lease') ||
                                  cat.includes('utility') || cat.includes('power') || cat.includes('water') || cat.includes('bill');
                  return !isOther; 
              }
              return cat.includes(account.name.toLowerCase().split(' ')[0]);
          }
          return false;
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getLedgerDetails = (account: LedgerAccount | null) => {
      if (!account) return { openingBalance: 0, txs: [] };
      const txs = getAccountTransactions(account);
      let netChange = 0;
      txs.forEach(tx => {
          if (account.code === '1000') {
              if (tx.type === 'INCOME') netChange += tx.amount;
              else if (tx.type === 'EXPENSE') netChange -= tx.amount;
          } else if (account.type === AccountType.REVENUE) {
              if (tx.type === 'INCOME') netChange += tx.amount;
          } else if (account.type === AccountType.EXPENSE) {
              if (tx.type === 'EXPENSE') netChange += tx.amount;
          } else {
             if (tx.type === 'INCOME') netChange += tx.amount;
             if (tx.type === 'EXPENSE') netChange -= tx.amount;
          }
      });
      const openingBalance = account.balance - netChange;
      return { openingBalance, txs };
  };

  const filteredGLAccounts = accounts.filter(acc => {
      const matchesType = glFilter === 'ALL' || acc.type === glFilter;
      const matchesSearch = acc.name.toLowerCase().includes(glSearch.toLowerCase()) || acc.code.includes(glSearch);
      return matchesType && matchesSearch;
  });

  // --- Export Data Preparation ---
  const exportData = useMemo(() => {
     if (activeReport !== 'EXPORTS') return { sales: [], purchases: [] };

     const sales = jobs
        .filter(j => j.date >= exportStartDate && j.date <= exportEndDate && j.status === 'INVOICED')
        .map(j => {
            const cust = customers.find(c => c.id === j.customerId);
            const sNames = services.filter(s => j.serviceIds.includes(s.id)).map(s => s.name).join(', ');
            return {
                Date: j.date,
                Ticket: j.ticketNumber,
                Customer: cust?.name || 'Unknown',
                Phone: cust?.phone || '-',
                Vehicle: j.vehicleDetails ? `${j.vehicleDetails.make} ${j.vehicleDetails.model} (${j.vehicleDetails.licensePlate})` : j.segment,
                Services: sNames,
                Total: j.total,
                Payment: j.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'
            };
        });

     const purchaseList = purchases
        .filter(p => p.date >= exportStartDate && p.date <= exportEndDate)
        .map(p => ({
            Date: p.date,
            Ref: p.docNumber,
            Vendor: p.vendorName,
            Item: p.itemName,
            Qty: `${p.quantity} ${p.unit}`,
            Category: p.category,
            Amount: p.amount
        }));

     return { sales, purchases: purchaseList };
  }, [jobs, customers, purchases, services, exportStartDate, exportEndDate, activeReport]);


  const handlePrint = () => window.print();

  // --- Copy to Clipboard Function (Tab Separated for Excel) ---
  const handleCopyToClipboard = () => {
      const data = exportTab === 'SALES' ? exportData.sales : exportData.purchases;
      if (data.length === 0) {
          alert("No data to copy.");
          return;
      }

      const headers = Object.keys(data[0]);
      const headerRow = headers.join('\t');
      const bodyRows = data.map((row: any) => headers.map(h => row[h]).join('\t')).join('\n');
      
      const fullText = `${headerRow}\n${bodyRows}`;
      
      navigator.clipboard.writeText(fullText).then(() => {
          alert("✅ Data Copied! Open Excel and Press Ctrl+V (Paste).");
      });
  };

  // --- CSV Download Logic ---
  const handleDownload = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const reportName = activeReport === 'EXPORTS' ? `DayBook_${exportTab}` : activeReport;
    const filename = `AutoDazzle_${reportName}_${new Date().toISOString().slice(0,10)}.csv`;

    if (activeReport === 'EXPORTS') {
         const data = exportTab === 'SALES' ? exportData.sales : exportData.purchases;
         if (data.length === 0) return;
         const headers = Object.keys(data[0]);
         csvContent += headers.join(",") + "\n";
         data.forEach((row: any) => {
             const rowStr = headers.map(h => `"${row[h]}"`).join(",");
             csvContent += rowStr + "\n";
         });
    } else if (activeReport === 'GL') {
        csvContent += "Code,Account Name,Type,Balance\n";
        filteredGLAccounts.forEach(acc => {
            csvContent += `${acc.code},"${acc.name}",${acc.type},${acc.balance}\n`;
        });
    } else if (activeReport === 'PL') {
        csvContent += "Category,Line Item,Amount\n";
        csvContent += `REVENUE,Total Sales,${financials.totalRevenue}\n`;
        financials.revenueAccounts.forEach(a => csvContent += `REVENUE,"${a.name}",${a.balance}\n`);
        csvContent += `EXPENSE,Total Expenses,${financials.totalExpenses}\n`;
        financials.expenseAccounts.forEach(a => csvContent += `EXPENSE,"${a.name}",${a.balance}\n`);
        csvContent += `SUMMARY,Net Income,${financials.netIncome}\n`;
    } else if (activeReport === 'BS') {
        csvContent += "Section,Account,Balance\n";
        financials.assetAccounts.forEach(a => csvContent += `ASSET,"${a.name}",${a.balance}\n`);
        financials.liabilityAccounts.forEach(a => csvContent += `LIABILITY,"${a.name}",${a.balance}\n`);
        financials.equityAccounts.forEach(a => csvContent += `EQUITY,"${a.name}",${a.balance}\n`);
    } else if (activeReport === 'CF') {
        csvContent += "Flow Type,Category,Amount\n";
        csvContent += `Balance,Opening Cash,${cashFlow.openingBalance}\n`;
        Object.entries(cashFlow.inflowCategories).forEach(([cat, amt]) => csvContent += `Inflow,"${cat}",${amt}\n`);
        Object.entries(cashFlow.outflowCategories).forEach(([cat, amt]) => csvContent += `Outflow,"${cat}",${amt}\n`);
        csvContent += `Balance,Closing Cash,${cashFlow.closingBalance}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: ReportID, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveReport(id)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-bold uppercase transition-all mb-1 ${
        activeReport === id 
        ? 'bg-red-600 text-white shadow-md' 
        : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  const ReportHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-2 border-slate-800 pb-4">
      <div>
         <div className="hidden print:block mb-2">
            <img src={LOGO_URL} alt="Logo" className="w-12 h-12 object-contain" />
         </div>
         <h3 className="text-2xl font-black text-black uppercase tracking-tighter">{title}</h3>
         <p className="text-slate-600 text-xs font-bold uppercase mt-1 tracking-widest">{subtitle}</p>
      </div>
      <div className="flex gap-2 print:hidden mt-4 md:mt-0">
         {activeReport === 'EXPORTS' ? (
             <button onClick={handleCopyToClipboard} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white border border-green-700 rounded-md text-xs font-bold uppercase hover:bg-green-700 transition-all shadow-sm">
                <Copy size={14} /> Copy to Excel
             </button>
         ) : null}
         <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-black rounded-md text-xs font-bold uppercase hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> CSV
         </button>
         <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase hover:bg-black transition-all shadow-md">
            <Printer size={14} /> Print
         </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh] print:block print:min-h-0 print:gap-0">
      
      {/* Sidebar: Hidden on Print */}
      <div className="w-full lg:w-64 shrink-0 print:hidden">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Daily Backup</p>
          <SidebarItem id="EXPORTS" label="Excel Exports" icon={FileSpreadsheet} />

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mt-6 mb-3">Statements</p>
          <SidebarItem id="PL" label="Profit & Loss" icon={TrendingUp} />
          <SidebarItem id="BS" label="Balance Sheet" icon={Scale} />
          <SidebarItem id="TB" label="Trial Balance" icon={FileText} />
          <SidebarItem id="CF" label="Cash Flow" icon={ArrowRightLeft} />

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mt-6 mb-3">Ledgers</p>
          <SidebarItem id="GL" label="General Ledger" icon={FileText} />
          <SidebarItem id="AR" label="Receivables (AR)" icon={UserCheck} />
          <SidebarItem id="AP" label="Payables (AP)" icon={Truck} />
        </div>
      </div>

      {/* Main Report Area: Expanded on Print */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm p-8 overflow-x-auto print:border-none print:shadow-none print:p-0 print:overflow-visible print:block print:w-full">
        
        {/* EXCEL EXPORTS (DAY BOOK) */}
        {activeReport === 'EXPORTS' && (
             <div className="max-w-5xl mx-auto print:max-w-none print:w-full">
                <ReportHeader title="Day Book & Backup" subtitle="Excel Compatible Transaction Export" />

                <div className="mb-6 bg-slate-50 p-4 rounded border border-slate-200 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">From Date</label>
                            <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">To Date</label>
                            <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => {
                                 const today = new Date().toISOString().split('T')[0];
                                 setExportStartDate(today);
                                 setExportEndDate(today);
                             }} className="flex-1 py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-100">Today</button>
                             <button onClick={() => {
                                 const today = new Date();
                                 const yest = new Date(today);
                                 yest.setDate(yest.getDate() - 1);
                                 setExportStartDate(yest.toISOString().split('T')[0]);
                                 setExportEndDate(yest.toISOString().split('T')[0]);
                             }} className="flex-1 py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-100">Yesterday</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 mb-0 border-b border-slate-200 print:hidden">
                    <button 
                        onClick={() => setExportTab('SALES')}
                        className={`px-6 py-3 text-xs font-black uppercase rounded-t-lg transition-all border-t border-l border-r ${exportTab === 'SALES' ? 'bg-white border-slate-200 text-blue-700 border-b-white translate-y-[1px]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        Customer Sales
                    </button>
                    <button 
                        onClick={() => setExportTab('PURCHASE')}
                        className={`px-6 py-3 text-xs font-black uppercase rounded-t-lg transition-all border-t border-l border-r ${exportTab === 'PURCHASE' ? 'bg-white border-slate-200 text-orange-700 border-b-white translate-y-[1px]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        Supplier Purchases
                    </button>
                </div>
                
                <div className="pt-6">
                    {exportTab === 'SALES' ? (
                        <>
                            <p className="text-xs text-slate-500 mb-4 italic print:hidden">
                                Showing completed invoices from <b>{exportStartDate}</b> to <b>{exportEndDate}</b>. <br/>
                                Click <b>"Copy to Excel"</b> above to copy this table and paste it into your daily Excel file.
                            </p>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase border border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 border border-slate-300">Date</th>
                                        <th className="px-4 py-2 border border-slate-300">Ticket #</th>
                                        <th className="px-4 py-2 border border-slate-300">Customer Name</th>
                                        <th className="px-4 py-2 border border-slate-300">Phone</th>
                                        <th className="px-4 py-2 border border-slate-300">Vehicle</th>
                                        <th className="px-4 py-2 border border-slate-300">Services</th>
                                        <th className="px-4 py-2 border border-slate-300 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exportData.sales.map((row: any, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 border border-slate-300">{row.Date}</td>
                                            <td className="px-4 py-2 border border-slate-300 font-mono text-xs">{row.Ticket}</td>
                                            <td className="px-4 py-2 border border-slate-300 font-bold">{row.Customer}</td>
                                            <td className="px-4 py-2 border border-slate-300 font-mono text-xs">{row.Phone}</td>
                                            <td className="px-4 py-2 border border-slate-300 text-xs">{row.Vehicle}</td>
                                            <td className="px-4 py-2 border border-slate-300 text-xs truncate max-w-[200px]">{row.Services}</td>
                                            <td className="px-4 py-2 border border-slate-300 text-right font-bold">₹{row.Total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {exportData.sales.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">No Sales Records Found for Selected Dates</td></tr>}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-slate-500 mb-4 italic print:hidden">
                                Showing purchase records from <b>{exportStartDate}</b> to <b>{exportEndDate}</b>. <br/>
                                Click <b>"Copy to Excel"</b> above to copy this table and paste it into your daily Excel file.
                            </p>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase border border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 border border-slate-300">Date</th>
                                        <th className="px-4 py-2 border border-slate-300">Ref #</th>
                                        <th className="px-4 py-2 border border-slate-300">Vendor</th>
                                        <th className="px-4 py-2 border border-slate-300">Item</th>
                                        <th className="px-4 py-2 border border-slate-300">Qty</th>
                                        <th className="px-4 py-2 border border-slate-300 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exportData.purchases.map((row: any, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 border border-slate-300">{row.Date}</td>
                                            <td className="px-4 py-2 border border-slate-300 font-mono text-xs">{row.Ref}</td>
                                            <td className="px-4 py-2 border border-slate-300 font-bold">{row.Vendor}</td>
                                            <td className="px-4 py-2 border border-slate-300">{row.Item}</td>
                                            <td className="px-4 py-2 border border-slate-300">{row.Qty}</td>
                                            <td className="px-4 py-2 border border-slate-300 text-right font-bold">₹{row.Amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {exportData.purchases.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No Purchase Records Found for Selected Dates</td></tr>}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
             </div>
        )}

        {/* PROFIT & LOSS */}
        {activeReport === 'PL' && (
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <ReportHeader title="Profit & Loss Statement" subtitle="Financial Performance" />
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-green-50 p-3 rounded border-l-4 border-green-500 print:bg-transparent print:border-green-500">
                   <h4 className="font-bold text-green-800 uppercase text-sm print:text-black">Total Revenue</h4>
                   <span className="font-black text-xl text-green-700 print:text-black">₹{financials.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-2">
                   {financials.revenueAccounts.map(acc => (
                     <div key={acc.id} className="flex justify-between border-b border-slate-100 pb-1 text-sm text-black">
                        <span className="font-medium">{acc.name} <span className="text-[10px] text-slate-400">({acc.code})</span></span>
                        <span className="font-bold">₹{safeVal(acc.balance).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-red-50 p-3 rounded border-l-4 border-red-500 print:bg-transparent print:border-red-500">
                   <h4 className="font-bold text-red-800 uppercase text-sm print:text-black">Total Expenses</h4>
                   <span className="font-black text-xl text-red-700 print:text-black">₹{financials.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-2">
                   {financials.expenseAccounts.map(acc => (
                     <div key={acc.id} className="flex justify-between border-b border-slate-100 pb-1 text-sm text-black">
                        <span className="font-medium">{acc.name} <span className="text-[10px] text-slate-400">({acc.code})</span></span>
                        <span className="font-bold">₹{safeVal(acc.balance).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="border-t-4 border-slate-800 pt-6 mt-8">
                 <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-2xl font-black text-black uppercase">Net Income</h4>
                    </div>
                    <div className="text-right">
                        <span className={`text-3xl font-black ${financials.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'} print:text-black`}>
                           ₹{financials.netIncome.toLocaleString()}
                        </span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* BALANCE SHEET */}
        {activeReport === 'BS' && (
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <ReportHeader title="Balance Sheet" subtitle="Financial Position" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="bg-slate-100 p-3 rounded flex justify-between items-center print:bg-transparent print:border-b print:border-black">
                    <h4 className="font-black text-black uppercase text-sm">Assets</h4>
                    <span className="font-black text-black">₹{financials.totalAssets.toLocaleString()}</span>
                </div>
                <div className="space-y-3 pl-2">
                   {financials.assetAccounts.map(acc => (
                     <div key={acc.id} className="flex justify-between border-b border-slate-100 pb-1 text-sm text-black">
                        <span className="font-medium">{acc.name}</span>
                        <span className="font-bold">₹{safeVal(acc.balance).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <div className="bg-slate-100 p-3 rounded flex justify-between items-center print:bg-transparent print:border-b print:border-black">
                        <h4 className="font-black text-black uppercase text-sm">Liabilities</h4>
                        <span className="font-black text-black">₹{financials.totalLiabilities.toLocaleString()}</span>
                    </div>
                    <div className="space-y-3 pl-2">
                       {financials.liabilityAccounts.map(acc => (
                         <div key={acc.id} className="flex justify-between border-b border-slate-100 pb-1 text-sm text-black">
                            <span className="font-medium">{acc.name}</span>
                            <span className="font-bold">₹{safeVal(acc.balance).toLocaleString()}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="bg-slate-100 p-3 rounded flex justify-between items-center print:bg-transparent print:border-b print:border-black">
                        <h4 className="font-black text-black uppercase text-sm">Equity</h4>
                        <span className="font-black text-black">₹{(financials.totalEquity + financials.netIncome).toLocaleString()}</span>
                    </div>
                    <div className="space-y-3 pl-2">
                       {financials.equityAccounts.map(acc => (
                         <div key={acc.id} className="flex justify-between border-b border-slate-100 pb-1 text-sm text-black">
                            <span className="font-medium">{acc.name}</span>
                            <span className="font-bold">₹{safeVal(acc.balance).toLocaleString()}</span>
                         </div>
                       ))}
                       <div className="flex justify-between border-b border-slate-100 pb-1 text-sm bg-blue-50 p-2 rounded print:bg-transparent">
                          <span className="text-blue-800 font-bold print:text-black">Net Income (Current Year)</span>
                          <span className="font-bold text-blue-800 print:text-black">₹{financials.netIncome.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* CASH FLOW STATEMENT */}
        {activeReport === 'CF' && (
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <ReportHeader title="Cash Flow Statement" subtitle="Direct Method Analysis" />
            
            <div className="space-y-8">
               {/* 1. Opening Balance */}
               <div className="bg-slate-50 p-4 rounded border border-slate-200 flex justify-between items-center print:bg-transparent print:border-b print:border-black">
                  <div>
                    <h4 className="font-bold text-slate-600 uppercase text-xs print:text-black">Opening Cash Balance</h4>
                    <p className="text-[10px] text-slate-400 print:hidden">(Calculated)</p>
                  </div>
                  <span className="font-black text-xl text-slate-800 print:text-black">₹{cashFlow.openingBalance.toLocaleString()}</span>
               </div>

               {/* 2. Cash Inflows */}
               <div className="space-y-3">
                  <h4 className="font-bold text-green-700 uppercase text-sm border-b-2 border-green-500 pb-1 flex items-center gap-2 print:text-black print:border-black">
                     <ArrowDown size={16}/> Cash Inflows (Receipts)
                  </h4>
                  {Object.entries(cashFlow.inflowCategories).length === 0 && <p className="text-xs text-slate-400 italic">No cash inflows recorded in current period.</p>}
                  {Object.entries(cashFlow.inflowCategories).map(([cat, amt]) => (
                     <div key={cat} className="flex justify-between text-sm border-b border-slate-100 pb-1 pl-4">
                        <span className="font-medium text-black">{cat}</span>
                        <span className="font-bold text-green-600 print:text-black">+₹{amt.toLocaleString()}</span>
                     </div>
                  ))}
                  <div className="flex justify-between text-sm font-black pt-2 bg-green-50 p-2 rounded print:bg-transparent">
                      <span className="text-green-800 uppercase text-xs print:text-black">Total Inflows</span>
                      <span className="text-green-800 print:text-black">₹{cashFlow.totalInflow.toLocaleString()}</span>
                  </div>
               </div>

               {/* 3. Cash Outflows */}
               <div className="space-y-3">
                  <h4 className="font-bold text-red-700 uppercase text-sm border-b-2 border-red-500 pb-1 flex items-center gap-2 print:text-black print:border-black">
                     <ArrowUp size={16}/> Cash Outflows (Payments)
                  </h4>
                  {Object.entries(cashFlow.outflowCategories).length === 0 && <p className="text-xs text-slate-400 italic">No cash outflows recorded in current period.</p>}
                  {Object.entries(cashFlow.outflowCategories).map(([cat, amt]) => (
                     <div key={cat} className="flex justify-between text-sm border-b border-slate-100 pb-1 pl-4">
                        <span className="font-medium text-black">{cat}</span>
                        <span className="font-bold text-red-600 print:text-black">-₹{amt.toLocaleString()}</span>
                     </div>
                  ))}
                   <div className="flex justify-between text-sm font-black pt-2 bg-red-50 p-2 rounded print:bg-transparent">
                      <span className="text-red-800 uppercase text-xs print:text-black">Total Outflows</span>
                      <span className="text-red-800 print:text-black">₹{cashFlow.totalOutflow.toLocaleString()}</span>
                  </div>
               </div>

               {/* 4. Net & Closing */}
               <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-slate-100 p-4 rounded text-center print:bg-transparent print:border print:border-slate-300">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">Net Cash Movement</p>
                      <p className={`text-xl font-black ${cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'} print:text-black`}>
                         {cashFlow.netCashFlow >= 0 ? '+' : ''}₹{cashFlow.netCashFlow.toLocaleString()}
                      </p>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded text-center shadow-lg print:bg-transparent print:text-black print:border-2 print:border-black print:shadow-none">
                      <p className="text-[10px] font-bold uppercase text-slate-400 print:text-black">Closing Cash Balance</p>
                      <p className="text-2xl font-black">₹{cashFlow.closingBalance.toLocaleString()}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TRIAL BALANCE */}
        {activeReport === 'TB' && (
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <ReportHeader title="Trial Balance" subtitle="Ledger Verification" />
            <table className="w-full text-left">
              <thead className="border-b-2 border-slate-800">
                <tr>
                  <th className="py-3 font-bold uppercase text-xs text-black">Account</th>
                  <th className="py-3 font-bold uppercase text-xs text-right w-32 text-black">Debit</th>
                  <th className="py-3 font-bold uppercase text-xs text-right w-32 text-black">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {accounts.sort((a,b) => parseInt(a.code) - parseInt(b.code)).map(acc => {
                  const isDebit = ['ASSET', 'EXPENSE'].includes(acc.type);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-3 text-black">
                        <span className="font-mono text-slate-500 mr-2 text-xs font-bold">{acc.code}</span>
                        <span className="font-bold">{acc.name}</span>
                        <span className="ml-2 text-[9px] text-slate-500 bg-slate-100 px-1 rounded uppercase print:border print:border-slate-400">{acc.type}</span>
                      </td>
                      <td className="py-3 text-right font-medium text-black bg-slate-50/50 print:bg-transparent">
                        {isDebit ? `₹${safeVal(acc.balance).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 text-right font-medium text-black">
                        {!isDebit ? `₹${safeVal(acc.balance).toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-800 font-black text-sm text-black">
                <tr className="bg-slate-100 print:bg-transparent">
                  <td className="py-4 px-2 uppercase">Total</td>
                  <td className="py-4 text-right">₹{financials.totalDebits.toLocaleString()}</td>
                  <td className="py-4 text-right">₹{financials.totalCredits.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* GENERAL LEDGER - WITH SEARCH & FILTER */}
        {activeReport === 'GL' && (
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <ReportHeader title="General Ledger" subtitle="Chart of Accounts & Detail" />
            
            {/* GL Toolbar - Hidden on Print */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded border border-slate-200 print:hidden">
               <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    placeholder="Search Account Name or Code..." 
                    value={glSearch}
                    onChange={(e) => setGlSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
               </div>
               <div className="w-full md:w-64">
                  <select 
                    value={glFilter} 
                    onChange={(e) => setGlFilter(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                     <option value="ALL">All Account Types</option>
                     <option value={AccountType.EXPENSE}>Expenses (Overheads)</option>
                     <option value={AccountType.ASSET}>Assets</option>
                     <option value={AccountType.LIABILITY}>Liabilities</option>
                     <option value={AccountType.REVENUE}>Revenue</option>
                     <option value={AccountType.EQUITY}>Equity</option>
                  </select>
               </div>
            </div>

            <div className="mb-4 text-xs text-slate-500 italic flex items-center gap-2 print:hidden">
                <Filter size={12} />
                Showing {filteredGLAccounts.length} accounts. Click any row to view the Individual Ledger Report.
            </div>

            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase border-b border-slate-300 print:bg-transparent">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGLAccounts.map(acc => (
                  <tr key={acc.id} onClick={() => setSelectedAccount(acc)} className="hover:bg-blue-50 cursor-pointer group transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 font-bold group-hover:text-blue-600">{acc.code}</td>
                    <td className="px-4 py-3 font-bold text-black group-hover:text-blue-800">{acc.name}</td>
                    <td className="px-4 py-3 text-black"><span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded uppercase print:border print:border-slate-300">{acc.type}</span></td>
                    <td className="px-4 py-3 text-right font-black text-black">₹{safeVal(acc.balance).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredGLAccounts.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No accounts match your filter.</td></tr>
                )}
              </tbody>
              {glFilter !== 'ALL' && (
                  <tfoot className="bg-slate-50 border-t border-slate-300 print:bg-transparent">
                      <tr>
                          <td colSpan={3} className="px-4 py-3 font-bold text-right text-slate-600 uppercase">Total</td>
                          <td className="px-4 py-3 text-right font-black text-black">
                              ₹{filteredGLAccounts.reduce((sum, acc) => sum + safeVal(acc.balance), 0).toLocaleString()}
                          </td>
                      </tr>
                  </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ACCOUNTS RECEIVABLE - AGING */}
        {activeReport === 'AR' && (
           <div className="max-w-5xl mx-auto print:max-w-none print:w-full">
             <ReportHeader title="Accounts Receivable Aging" subtitle="Customer Outstanding Analysis" />
             
             {/* Aging Buckets */}
             <div className="grid grid-cols-4 gap-4 mb-8">
                 {Object.entries(arAging.buckets).map(([bucket, amount]) => (
                     <div key={bucket} className="bg-white p-4 rounded border border-slate-200 shadow-sm text-center print:border-black">
                         <p className="text-xs font-bold text-slate-500 uppercase print:text-black">{bucket} Days</p>
                         <p className={`text-xl font-black ${(amount as number) > 0 ? 'text-red-600' : 'text-slate-400'} print:text-black`}>₹{(amount as number).toLocaleString()}</p>
                     </div>
                 ))}
             </div>

             <h4 className="font-bold text-black uppercase text-sm mb-4 border-b border-slate-300 pb-2">Customer Ledger (Unpaid Invoices)</h4>
             <table className="w-full text-left">
              <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase border-b border-slate-200 print:bg-transparent">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Job Ref</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Age (Days)</th>
                  <th className="px-4 py-3 text-right">Amount Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {arAging.details.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No outstanding receivables found.</td></tr>
                ) : (
                    arAging.details.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-black">{item.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.ref}</td>
                            <td className="px-4 py-3 text-black">{item.date}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white print:text-black print:border print:border-black ${
                                    item.days > 90 ? 'bg-red-600' : item.days > 60 ? 'bg-orange-500' : item.days > 30 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}>{item.days}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-black">₹{item.amount.toLocaleString()}</td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
           </div>
        )}

        {/* ACCOUNTS PAYABLE - AGING */}
        {activeReport === 'AP' && (
           <div className="max-w-5xl mx-auto print:max-w-none print:w-full">
             <ReportHeader title="Accounts Payable Aging" subtitle="Vendor Payment Schedule" />
             
             {/* Aging Buckets */}
             <div className="grid grid-cols-4 gap-4 mb-8">
                 {Object.entries(apAging.buckets).map(([bucket, amount]) => (
                     <div key={bucket} className="bg-white p-4 rounded border border-slate-200 shadow-sm text-center print:border-black">
                         <p className="text-xs font-bold text-slate-500 uppercase print:text-black">{bucket} Days</p>
                         <p className={`text-xl font-black ${(amount as number) > 0 ? 'text-red-600' : 'text-slate-400'} print:text-black`}>₹{(amount as number).toLocaleString()}</p>
                     </div>
                 ))}
             </div>

             <h4 className="font-bold text-black uppercase text-sm mb-4 border-b border-slate-300 pb-2">Vendor Ledger (Pending Bills)</h4>
             <table className="w-full text-left">
              <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase border-b border-slate-200 print:bg-transparent">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">PO Ref</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Age (Days)</th>
                  <th className="px-4 py-3 text-right">Amount Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {apAging.details.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No pending payables found.</td></tr>
                ) : (
                    apAging.details.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-black">{item.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.ref}</td>
                            <td className="px-4 py-3 text-black">{item.date}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white print:text-black print:border print:border-black ${
                                    item.days > 90 ? 'bg-red-600' : item.days > 60 ? 'bg-orange-500' : item.days > 30 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}>{item.days}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-black">₹{item.amount.toLocaleString()}</td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
           </div>
        )}

        {/* SINGLE LEDGER DETAIL MODAL */}
        {selectedAccount && createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4 print:bg-white print:static print:z-auto print:p-0 print:block">
                <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl flex flex-col text-black print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10 print:static print:bg-white print:border-b-2 print:border-black">
                        <div>
                            <div className="hidden print:block mb-4">
                               <img src={LOGO_URL} alt="Logo" className="w-16" />
                            </div>
                            <h3 className="text-xl font-black text-black uppercase">{selectedAccount.name} <span className="text-slate-500">({selectedAccount.code})</span></h3>
                            <p className="text-xs font-bold text-slate-500 uppercase">Individual Ledger Report (Verified)</p>
                        </div>
                        <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-red-600 print:hidden"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        {(() => {
                            const { openingBalance, txs } = getLedgerDetails(selectedAccount);
                            return (
                                <>
                                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-xs flex items-center gap-2 print:hidden">
                                  <AlertCircle size={16}/>
                                  <span>
                                    <strong>Audit Trace:</strong> 
                                    Opening ({openingBalance.toLocaleString()}) + Net Transactions ({txs.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0).toLocaleString()}) = Closing ({selectedAccount.balance.toLocaleString()}).
                                  </span>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-black font-bold text-[10px] uppercase print:bg-transparent">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-center">Type</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Opening Balance Row */}
                                        <tr className="bg-yellow-50/50 print:bg-transparent">
                                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">-</td>
                                            <td className="px-4 py-3 font-bold text-slate-600 italic">Opening Balance</td>
                                            <td className="px-4 py-3 text-center text-slate-400">-</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-600">₹{openingBalance.toLocaleString()}</td>
                                        </tr>
                                        {/* Transactions */}
                                        {txs.map(tx => (
                                            <tr key={tx.id}>
                                                <td className="px-4 py-3 text-slate-700">{tx.date}</td>
                                                <td className="px-4 py-3 font-medium text-black">{tx.description}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white print:text-black print:border print:border-black ${tx.type === 'INCOME' ? 'bg-green-600' : 'bg-red-600'}`}>{tx.type}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-black">
                                                    {/* Sign logic for display based on account type context */}
                                                    {tx.type === 'EXPENSE' && selectedAccount.code === '1000' ? '-' : 
                                                     tx.type === 'EXPENSE' && selectedAccount.type === 'EXPENSE' ? '+' : 
                                                     tx.type === 'EXPENSE' ? '-' : '+'}
                                                    ₹{tx.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {txs.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No recent transactions found. Balance is carried forward.</td></tr>
                                        )}
                                    </tbody>
                                    <tfoot className="border-t-2 border-black bg-slate-50 print:bg-transparent">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 font-bold text-black uppercase text-right">Closing Ledger Balance</td>
                                            <td className="px-4 py-4 font-black text-xl text-black text-right">₹{safeVal(selectedAccount.balance).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </>
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
