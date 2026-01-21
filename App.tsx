
import React, { useState } from 'react';
import { ViewState, UserRole } from './types.ts';
import { Financials } from './components/Financials.tsx';
import { Operations } from './components/Operations.tsx';
import { MigrationAssistant } from './components/MigrationAssistant.tsx';
import { SalesModule } from './components/SalesModule.tsx';
import { PurchaseModule } from './components/PurchaseModule.tsx';
import { HRModule } from './components/HRModule.tsx';
import { ReportsModule } from './components/ReportsModule.tsx';
import { CRMModule } from './components/CRMModule.tsx';
import { InventoryModule } from './components/InventoryModule.tsx';
import { DashboardModule } from './components/DashboardModule.tsx';
import { ERPProvider, useERP } from './contexts/ERPContext.tsx';
import { 
  LayoutDashboard, 
  DollarSign, 
  Wrench, 
  Users, 
  Package, 
  ShieldCheck, 
  Menu, 
  Search,
  Bell,
  ClipboardList,
  ShoppingCart,
  BarChart3,
  Briefcase,
  ChevronRight,
  LogOut,
  Settings,
  Cloud,
  WifiOff,
  UserCircle,
  ChevronDown,
  ShieldAlert,
  Lock,
  Key
} from 'lucide-react';

const LoginPage = () => {
  const { login, logoUrl } = useERP();
  const [role, setRole] = useState<UserRole>('STAFF');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(role, password)) {
      setError('');
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-black p-8 text-center border-b-4 border-red-600">
           <img src={logoUrl} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
           <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none" style={{ fontFamily: '"Inter", sans-serif' }}>
              Auto<span className="text-red-600 ml-1">Dazzle</span>
           </h1>
           <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">Enterprise Resource Planning</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Access Level</label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                type="button"
                onClick={() => setRole('STAFF')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${role === 'STAFF' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Staff Portal
              </button>
              <button 
                type="button"
                onClick={() => setRole('SUPER_ADMIN')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${role === 'SUPER_ADMIN' ? 'bg-red-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Master Access
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Passcode</label>
            <div className="relative">
              <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-md border border-red-100 flex items-center gap-2"><ShieldAlert size={14}/> {error}</p>}

          <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black uppercase rounded-lg shadow-xl hover:bg-black transition-all transform hover:-translate-y-0.5 tracking-wider">
             Authorize Access
          </button>
          
          <div className="text-center pt-2">
             <p className="text-[10px] text-slate-400 font-medium">Secured by Auto Dazzle ERP v2.0</p>
          </div>
        </form>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, logout, currentUserRole, logoUrl } = useERP();
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setView(target)}
      className={`relative w-full flex items-center px-4 py-3 mb-1 transition-all duration-200
        ${view === target 
          ? 'bg-red-600 text-white shadow-lg z-10' 
          : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
    >
      <Icon size={18} strokeWidth={2} className={`${view === target ? 'text-white' : 'text-slate-400'} mr-3`} />
      {isSidebarOpen && <span className="font-bold text-xs tracking-wide uppercase">{label}</span>}
    </button>
  );

  const isModuleVisible = (module: ViewState) => {
    if (currentUserRole === 'STAFF') {
      return ['DASHBOARD', 'SALES', 'CRM', 'OPERATIONS', 'INVENTORY'].includes(module);
    }
    return true;
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-sans text-slate-900 print:block print:h-auto print:overflow-visible print:bg-white">
      
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-black text-white flex flex-col transition-all duration-300 shadow-2xl z-30 print:hidden`}
      >
        <div className="h-20 bg-black flex items-center justify-center p-4 border-b border-white/5">
           {isSidebarOpen ? (
              <div className="flex items-center gap-3 w-full">
                  <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
                  <h1 className="font-black text-white text-lg tracking-tighter uppercase leading-none" style={{ fontFamily: '"Inter", sans-serif' }}>
                    Auto<br/><span className="text-red-600">Dazzle</span>
                  </h1>
              </div>
           ) : (
              <img src={logoUrl} alt="AD" className="h-10 w-10 object-contain rounded" />
           )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {isModuleVisible('DASHBOARD') && <NavItem target="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />}
          
          <div className="mt-4 mb-2 px-4 text-[9px] uppercase text-slate-600 font-black tracking-[0.2em]">Management</div>
          {isModuleVisible('SALES') && <NavItem target="SALES" icon={ClipboardList} label="Job Card" />}
          {isModuleVisible('CRM') && <NavItem target="CRM" icon={Users} label="Customers" />}
          {isModuleVisible('OPERATIONS') && <NavItem target="OPERATIONS" icon={Wrench} label="Services" />}
          {isModuleVisible('INVENTORY') && <NavItem target="INVENTORY" icon={Package} label="Products" />}
          
          {currentUserRole === 'SUPER_ADMIN' && (
            <>
              <div className="mt-4 mb-2 px-4 text-[9px] uppercase text-slate-600 font-black tracking-[0.2em]">Back Office</div>
              {isModuleVisible('FINANCIALS') && <NavItem target="FINANCIALS" icon={DollarSign} label="Financials" />}
              {isModuleVisible('REPORTS') && <NavItem target="REPORTS" icon={BarChart3} label="Reports" />}
              {isModuleVisible('HR') && <NavItem target="HR" icon={Briefcase} label="Staff HR" />}
              {isModuleVisible('PURCHASE') && <NavItem target="PURCHASE" icon={ShoppingCart} label="Expenses" />}
              {isModuleVisible('MIGRATION') && <NavItem target="MIGRATION" icon={Settings} label="System" />}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
            <button onClick={logout} className="w-full flex items-center gap-3 p-3 text-slate-500 hover:text-red-500 transition-colors">
                <LogOut size={18} />
                {isSidebarOpen && <span className="text-xs font-black uppercase">Sign Out</span>}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative print:block print:overflow-visible print:h-auto print:static">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-slate-800 transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
               <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
               <h1 className="font-black text-slate-900 text-xl hidden md:block tracking-tighter uppercase">Auto <span className="text-red-600">Dazzle</span></h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
               <span className="text-[10px] font-black text-slate-500 uppercase">Status:</span>
               <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
               <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Active</span>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentUserRole === 'SUPER_ADMIN' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                     {currentUserRole === 'SUPER_ADMIN' ? <ShieldCheck size={18}/> : <UserCircle size={18}/>}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Access Level</p>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter leading-none mt-1">
                      {currentUserRole === 'SUPER_ADMIN' ? 'Master Admin' : 'Staff User'}
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-[#f1f5f9] print:block print:p-0 print:m-0 print:overflow-visible print:h-auto print:bg-white">
          <div className="max-w-[1600px] mx-auto animate-fade-in-up print:max-w-none print:w-full print:mx-0">
            {view === 'DASHBOARD' && <DashboardModule />}
            {view === 'SALES' && <SalesModule />}
            {view === 'PURCHASE' && <PurchaseModule />}
            {view === 'FINANCIALS' && <Financials />}
            {view === 'REPORTS' && <ReportsModule />}
            {view === 'HR' && <HRModule />}
            {view === 'OPERATIONS' && <Operations />}
            {view === 'MIGRATION' && <MigrationAssistant />}
            {view === 'CRM' && <CRMModule />}
            {view === 'INVENTORY' && <InventoryModule />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <AppContent />
    </ERPProvider>
  );
}
