import React, { useMemo } from 'react';
import { 
  DollarSign, Wallet, ArrowUpRight, ArrowDownLeft, ClipboardList, Receipt
} from 'lucide-react';
import { useERP } from '../contexts/ERPContext.tsx';
import { useERP as useERPContext } from '../contexts/ERPContext.tsx'; // Alias to avoid conflict if needed

export const DashboardModule: React.FC = () => {
  const { jobs, transactions, accounts } = useERP();

  // Logic: Calculate Dynamic Stats
  const stats = useMemo(() => {
    // Current Month Filter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filterMonth = (dateString: string) => {
        const d = new Date(dateString);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const monthlyIncome = transactions
      .filter(t => t.type === 'INCOME' && filterMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = transactions
      .filter(t => t.type === 'EXPENSE' && filterMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);

    const cashInHand = accounts.find(a => a.code === '1000')?.balance || 0;
    // Assuming 'Bank' is represented by Accounts Receivable or a specific bank account. 
    // For demo, let's sum Bank accounts or use Capital as proxy if Bank not explicit.
    // Let's use a specific logic: Sum of all Assets minus Cash in Hand roughly for demo liquidity
    const cashInBank = accounts.filter(a => a.type === 'ASSET' && a.code !== '1000').reduce((s, a) => s + a.balance, 0); 

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s,t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s,t) => s + t.amount, 0);

    return { monthlyIncome, monthlyExpense, cashInHand, cashInBank, totalIncome, totalExpense };
  }, [jobs, transactions, accounts]);

  // UI Component for the Top Cards
  const InfoCard = ({ title, value, icon: Icon, colorClass, iconBgClass }: { title: string, value: number, icon: any, colorClass: string, iconBgClass: string }) => (
    <div className={`${colorClass} rounded-lg p-4 text-white shadow-md relative overflow-hidden min-h-[140px] flex flex-col justify-between`}>
       <div className="flex justify-between items-start">
          <div className={`${iconBgClass} p-3 rounded-md bg-opacity-20 bg-black`}>
             <Icon size={28} className="text-white opacity-90" />
          </div>
          <h3 className="text-sm font-medium uppercase tracking-wide opacity-90 text-right">{title}</h3>
       </div>
       <div className="mt-4">
          <span className="text-3xl font-bold tracking-tight">{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
       </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard 
          title="CASH IN HAND" 
          value={stats.cashInHand} 
          icon={Wallet} 
          colorClass="bg-[#E91E63]" // Pink
          iconBgClass="bg-pink-800"
        />
        <InfoCard 
          title="CASH IN BANK" 
          value={stats.cashInBank} 
          icon={DollarSign} 
          colorClass="bg-[#43A047]" // Green
          iconBgClass="bg-green-800"
        />
        <InfoCard 
          title="MONTHLY INCOME" 
          value={stats.monthlyIncome} 
          icon={ArrowDownLeft} 
          colorClass="bg-[#FB8C00]" // Orange
          iconBgClass="bg-orange-800"
        />
        <InfoCard 
          title="MONTHLY EXPENSE" 
          value={stats.monthlyExpense} 
          icon={ArrowUpRight} 
          colorClass="bg-[#00ACC1]" // Cyan
          iconBgClass="bg-cyan-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left Column: Action Buttons */}
         <div className="space-y-6">
            {/* Job Card Button */}
            <button className="w-full bg-[#1A237E] text-white rounded-lg p-6 shadow-md hover:bg-[#151b60] transition-colors flex items-center gap-6 group">
                <div className="p-4 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                   <ClipboardList size={40} />
                </div>
                <div className="text-left">
                   <h3 className="text-xl font-bold uppercase tracking-wider">JOB CARD</h3>
                   <p className="text-indigo-200 text-sm">Create & Manage Services</p>
                </div>
            </button>

            {/* Payment & Receipt Button */}
            <button className="w-full bg-[#FFA000] text-white rounded-lg p-6 shadow-md hover:bg-[#e69100] transition-colors flex items-center gap-6 group">
                <div className="p-4 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                   <Receipt size={40} />
                </div>
                <div className="text-left">
                   <h3 className="text-xl font-bold uppercase tracking-wider">PAYMENT & RECEIPT</h3>
                   <p className="text-orange-100 text-sm">Record Financials</p>
                </div>
            </button>
         </div>

         {/* Right Column: Chart */}
         <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center relative">
            <h3 className="text-xl text-slate-500 font-light mb-8 uppercase tracking-widest">TOTAL <span className="text-green-500 font-bold">INCOME</span> VS <span className="text-red-500 font-bold">EXPENSES</span></h3>
            
            {/* CSS Only Donut Chart */}
            <div className="relative w-64 h-64">
               <div 
                 className="w-full h-full rounded-full"
                 style={{
                    background: `conic-gradient(#16A34A 0% 75%, #EF4444 75% 100%)` // Hardcoded ratio for visual demo roughly matching image
                 }}
               ></div>
               <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-slate-900 font-black text-2xl">INCOME</span>
                  <span className="text-slate-600 font-bold text-xl">{stats.totalIncome.toLocaleString()}</span>
               </div>
            </div>

            <div className="flex gap-8 mt-8">
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-sm"></div>
                  <span className="font-bold text-slate-600">INCOME: {stats.totalIncome.toLocaleString()}</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                  <span className="font-bold text-slate-600">EXPENSE: {stats.totalExpense.toLocaleString()}</span>
               </div>
            </div>

            {/* Welcome Toast */}
            <div className="absolute bottom-4 right-4 bg-[#16A34A] text-white px-6 py-3 rounded shadow-lg font-medium flex items-center gap-4 animate-bounce">
               Welcome Back Admin
               <span className="cursor-pointer text-green-200 hover:text-white">×</span>
            </div>
         </div>
      </div>

    </div>
  );
};