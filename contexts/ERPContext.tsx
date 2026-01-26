import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  MOCK_ACCOUNTS, MOCK_CUSTOMERS, MOCK_INVENTORY, MOCK_JOB_CARDS, 
  MOCK_LEADS, MOCK_PURCHASES, MOCK_SERVICES, MOCK_STAFF, MOCK_TRANSACTIONS, MOCK_APPOINTMENTS,
  LOGO_URL as DEFAULT_LOGO
} from '../constants.ts';
import { 
  Customer, JobCard, InventoryItem, Staff, Service, Transaction, 
  LedgerAccount, PurchaseOrder, Lead, Appointment, AccountType, StockTransaction, UserRole, PayrollRun
} from '../types.ts';

interface LedgerLeg {
  accountName: string;
  amount: number;
  isDebit: boolean;
  accountType?: AccountType;
}

interface ERPContextType {
  currentUserRole: UserRole | null;
  isAuthenticated: boolean;
  login: (role: UserRole, password: string) => boolean;
  logout: () => void;
  updatePassword: (role: UserRole, newPass: string) => void;
  logoUrl: string;
  updateLogo: (url: string) => void;
  customers: Customer[];
  jobs: JobCard[];
  inventory: InventoryItem[];
  staff: Staff[];
  services: Service[];
  transactions: Transaction[];
  accounts: LedgerAccount[];
  purchases: PurchaseOrder[];
  leads: Lead[];
  appointments: Appointment[];
  stockLogs: StockTransaction[]; 
  payrollHistory: PayrollRun[];
  isCloudConnected: boolean;
  syncStatus: 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR';
  lastSyncError: string | null;
  connectToCloud: (url: string, key: string) => Promise<boolean>;
  syncAllLocalToCloud: () => Promise<void>;
  addJob: (job: JobCard) => void;
  updateJob: (job: JobCard) => void; 
  deleteJob: (id: string) => void; 
  updateJobStatus: (id: string, status: JobCard['status'], paymentMethod?: Transaction['method']) => void;
  addStaff: (member: Staff) => void;
  removeStaff: (id: string) => void;
  updateStaff: (updatedStaff: Staff) => void;
  addInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  recordStockUsage: (itemId: string, quantity: number, notes: string) => void; 
  bulkAddInventory: (items: InventoryItem[]) => void; 
  addService: (service: Service) => void;
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  addPurchase: (purchase: PurchaseOrder) => void;
  addTransaction: (tx: Transaction) => void;
  bulkProcessJournal: (journalEntries: { historyTx?: Transaction, legs: LedgerLeg[] }[]) => void;
  bulkAddPurchases: (pos: PurchaseOrder[]) => void;
  executePayroll: (month: string, payrollData: any[]) => void;
  bulkAddServices: (services: Service[]) => void;
  bulkAddTransactions: (txs: Transaction[]) => void;
  restoreData: (data: any) => void;
  resetToFactory: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const getInitialData = <T,>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error(`Error loading ${key}`, e); }
  return defaultData;
};

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwords, setPasswords] = useState<Record<UserRole, string>>({
    SUPER_ADMIN: localStorage.getItem('pass_super_admin') || 'admin',
    STAFF: localStorage.getItem('pass_staff') || 'staff'
  });

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR'>('OFFLINE');
  
  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem('erp_logo') || DEFAULT_LOGO);
  const [customers, setCustomers] = useState<Customer[]>(() => getInitialData('erp_customers', MOCK_CUSTOMERS));
  const [jobs, setJobs] = useState<JobCard[]>(() => getInitialData('erp_jobs', MOCK_JOB_CARDS));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getInitialData('erp_inventory', MOCK_INVENTORY));
  const [staff, setStaff] = useState<Staff[]>(() => getInitialData('erp_staff', MOCK_STAFF));
  const [services, setServices] = useState<Service[]>(() => getInitialData('erp_services', MOCK_SERVICES));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getInitialData('erp_transactions', MOCK_TRANSACTIONS));
  const [accounts, setAccounts] = useState<LedgerAccount[]>(() => getInitialData('erp_accounts', MOCK_ACCOUNTS)); 
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() => getInitialData('erp_purchases', MOCK_PURCHASES));
  const [leads, setLeads] = useState<Lead[]>(() => getInitialData('erp_leads', MOCK_LEADS));
  const [appointments, setAppointments] = useState<Appointment[]>(() => getInitialData('erp_appointments', MOCK_APPOINTMENTS));
  const [stockLogs, setStockLogs] = useState<StockTransaction[]>(() => getInitialData('erp_stock_logs', []));
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>(() => getInitialData('erp_payroll_history', []));

  const persist = (key: string, data: any) => { localStorage.setItem(key, JSON.stringify(data)); };

  const updateBalances = (legs: LedgerLeg[]) => {
    setAccounts(prev => {
      let updated = [...prev];
      legs.forEach(leg => {
        let acc = updated.find(a => a.name.toLowerCase() === leg.accountName.toLowerCase());
        if (!acc) {
          acc = { id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, code: (1000 + updated.length).toString(), name: leg.accountName, type: leg.accountType || AccountType.EXPENSE, balance: 0 };
          updated.push(acc);
        }
        const isDebitNature = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
        if (isDebitNature) {
          acc.balance += (leg.isDebit ? leg.amount : -leg.amount);
        } else {
          acc.balance += (!leg.isDebit ? leg.amount : -leg.amount);
        }
      });
      persist('erp_accounts', updated);
      return updated;
    });
  };

  const addTransaction = (tx: Transaction) => {
    const newList = [...transactions, tx];
    setTransactions(newList);
    persist('erp_transactions', newList);
    const legs: LedgerLeg[] = [
      { accountName: tx.category, amount: tx.amount, isDebit: tx.type === 'EXPENSE' },
      { accountName: 'Cash on Hand', amount: tx.amount, isDebit: tx.type === 'INCOME' }
    ];
    updateBalances(legs);
  };

  const bulkAddTransactions = (txs: Transaction[]) => {
    const updated = [...transactions, ...txs];
    setTransactions(updated);
    persist('erp_transactions', updated);
    // Simple bulk balance update logic
    txs.forEach(tx => {
       updateBalances([
          { accountName: tx.category, amount: tx.amount, isDebit: tx.type === 'EXPENSE' },
          { accountName: 'Cash on Hand', amount: tx.amount, isDebit: tx.type === 'INCOME' }
       ]);
    });
  };

  const bulkProcessJournal = (entries: { historyTx?: Transaction, legs: LedgerLeg[] }[]) => {
    const newTxs = entries.filter(e => e.historyTx).map(e => e.historyTx!);
    const updatedHistory = [...transactions, ...newTxs];
    setTransactions(updatedHistory);
    persist('erp_transactions', updatedHistory);
    const allLegs = entries.flatMap(e => e.legs);
    updateBalances(allLegs);
  };

  const login = (role: UserRole, password: string) => {
    if (passwords[role] === password) {
      setCurrentUserRole(role);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUserRole(null);
    setIsAuthenticated(false);
  };

  const updatePassword = (role: UserRole, newPass: string) => {
    setPasswords(prev => ({ ...prev, [role]: newPass }));
    localStorage.setItem(`pass_${role.toLowerCase()}`, newPass);
  };

  const connectToCloud = async (url: string, key: string): Promise<boolean> => {
    try {
      const client = createClient(url, key);
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
      return true;
    } catch (err: any) {
      setSyncStatus('ERROR');
      return false;
    }
  };

  const syncAllLocalToCloud = async () => {
    if (!supabase || !isCloudConnected) return;
    setSyncStatus('SYNCING');
    try {
      await supabase.from('customers').upsert(customers);
      await supabase.from('staff').upsert(staff);
      await supabase.from('services').upsert(services);
      await supabase.from('transactions').upsert(transactions);
      await supabase.from('jobs').upsert(jobs);
      setSyncStatus('SYNCED');
      alert("✅ All local modules synced to Cloud successfully!");
    } catch (err) {
      console.error("Sync Error:", err);
      setSyncStatus('ERROR');
      alert("❌ Cloud Sync Failed. Check Supabase credentials.");
    }
  };

  const addJob = (job: JobCard) => {
    const updated = [...jobs, job];
    setJobs(updated);
    persist('erp_jobs', updated);
  };

  const updateJob = (job: JobCard) => {
    const updated = jobs.map(j => j.id === job.id ? job : j);
    setJobs(updated);
    persist('erp_jobs', updated);
  };

  const deleteJob = (id: string) => {
    const updated = jobs.filter(j => j.id !== id);
    setJobs(updated);
    persist('erp_jobs', updated);
  };

  const updateJobStatus = (id: string, status: JobCard['status'], paymentMethod: Transaction['method'] = 'CASH') => {
    const updatedJobs = jobs.map(j => {
      if (j.id === id) {
        if (status === 'INVOICED' && j.status !== 'INVOICED') {
          addTransaction({
            id: `tx-sale-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'INCOME',
            category: 'Service Revenue',
            amount: j.total,
            method: paymentMethod,
            description: `Invoice ${j.ticketNumber} Payment`
          });
        }
        return { ...j, status };
      }
      return j;
    });
    setJobs(updatedJobs);
    persist('erp_jobs', updatedJobs);
  };

  const addStaff = (member: Staff) => {
    const updated = [...staff, member];
    setStaff(updated);
    persist('erp_staff', updated);
  };

  const removeStaff = (id: string) => {
    const updated = staff.filter(s => s.id !== id);
    setStaff(updated);
    persist('erp_staff', updated);
  };

  const updateStaff = (updatedStaff: Staff) => {
    const updated = staff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaff(updated);
    persist('erp_staff', updated);
  };

  const addInventoryItem = (item: InventoryItem) => {
    const updated = [...inventory, item];
    setInventory(updated);
    persist('erp_inventory', updated);
  };

  const deleteInventoryItem = (id: string) => {
    const updated = inventory.filter(i => i.id !== id);
    setInventory(updated);
    persist('erp_inventory', updated);
  };

  const recordStockUsage = (itemId: string, quantity: number, notes: string) => {
    setInventory(prev => {
        const updated = prev.map(i => i.id === itemId ? { ...i, quantityOnHand: Math.max(0, i.quantityOnHand - quantity) } : i);
        persist('erp_inventory', updated);
        return updated;
    });
  };

  const bulkAddInventory = (items: InventoryItem[]) => {
    setInventory(prev => {
        const updated = [...prev, ...items];
        persist('erp_inventory', updated);
        return updated;
    });
  };

  const addService = (service: Service) => {
    const updated = [...services, service];
    setServices(updated);
    persist('erp_services', updated);
  };

  const updateService = (service: Service) => {
    const updated = services.map(s => s.id === service.id ? service : s);
    setServices(updated);
    persist('erp_services', updated);
  };

  const deleteService = (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    persist('erp_services', updated);
  };

  const bulkAddServices = (svcs: Service[]) => {
    const updated = [...services, ...svcs];
    setServices(updated);
    persist('erp_services', updated);
  };

  const executePayroll = (month: string, payrollData: any[]) => {
    const total = payrollData.reduce((sum, p) => sum + p.netPay, 0);
    addTransaction({
      id: `tx-pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      category: 'Labor Expense',
      amount: total,
      method: 'TRANSFER',
      description: `Payroll ${month}`
    });
    setPayrollHistory(prev => {
      const snap = { id: `pr-${Date.now()}`, month, dateGenerated: new Date().toISOString(), totalAmount: total, records: payrollData, status: 'FINALIZED' as const };
      const updated = [...prev, snap];
      persist('erp_payroll_history', updated);
      return updated;
    });
  };

  const restoreData = (data: any) => {
    if (data.modules) {
      setCustomers(data.modules.customers || []);
      setJobs(data.modules.jobs || []);
      setStaff(data.modules.staff || []);
      setTransactions(data.modules.transactions || []);
      setInventory(data.modules.inventory || []);
      setServices(data.modules.services || []);
      setAccounts(data.modules.financials || MOCK_ACCOUNTS);
      setPayrollHistory(data.modules.payrollHistory || []);
    }
  };

  const resetToFactory = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <ERPContext.Provider value={{
      currentUserRole, isAuthenticated, login, logout, updatePassword, logoUrl, 
      updateLogo: (u) => { setLogoUrl(u); localStorage.setItem('erp_logo', u); },
      customers, jobs, inventory, staff, services, transactions, accounts, purchases, leads, appointments, stockLogs, payrollHistory,
      isCloudConnected, syncStatus, lastSyncError: null, connectToCloud, syncAllLocalToCloud,
      addJob, updateJob, deleteJob, updateJobStatus, addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory,
      addService, updateService, deleteService, bulkAddServices, bulkAddTransactions, restoreData, resetToFactory, 
      addCustomer: (c) => { const u = [...customers, c]; setCustomers(u); persist('erp_customers', u); },
      updateCustomer: (c) => { const u = customers.map(x => x.id === c.id ? c : x); setCustomers(u); persist('erp_customers', u); },
      addPurchase: (p) => {}, addTransaction, bulkProcessJournal, bulkAddPurchases: (p) => {}, executePayroll
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (context === undefined) throw new Error('useERP must be used within an ERPProvider');
  return context;
};
