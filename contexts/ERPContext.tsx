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
  bulkAddServices: (newServices: Service[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  addPurchase: (purchase: PurchaseOrder) => void;
  addTransaction: (tx: Transaction) => void;
  bulkAddTransactions: (txs: Transaction[]) => void;
  bulkProcessJournal: (journalEntries: { historyTx?: Transaction, legs: LedgerLeg[] }[]) => void;
  bulkAddPurchases: (pos: PurchaseOrder[]) => void;
  executePayroll: (month: string, payrollData: any[]) => void;
  restoreData: (data: any) => void;
  resetToFactory: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const getInitialData = <T,>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) { 
    console.error(`Error loading ${key}`, e); 
  }
  return defaultData;
};

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwords, setPasswords] = useState<Record<UserRole, string>>(() => ({
    SUPER_ADMIN: localStorage.getItem('pass_super_admin') || 'admin',
    STAFF: localStorage.getItem('pass_staff') || 'staff'
  }));

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR'>('OFFLINE');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

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

  useEffect(() => {
    localStorage.setItem('erp_customers', JSON.stringify(customers));
    localStorage.setItem('erp_jobs', JSON.stringify(jobs));
    localStorage.setItem('erp_inventory', JSON.stringify(inventory));
    localStorage.setItem('erp_staff', JSON.stringify(staff));
    localStorage.setItem('erp_services', JSON.stringify(services));
    localStorage.setItem('erp_transactions', JSON.stringify(transactions));
    localStorage.setItem('erp_accounts', JSON.stringify(accounts));
    localStorage.setItem('erp_purchases', JSON.stringify(purchases));
    localStorage.setItem('erp_payroll_history', JSON.stringify(payrollHistory));
    localStorage.setItem('erp_logo', logoUrl);
  }, [customers, jobs, inventory, staff, services, transactions, accounts, purchases, payrollHistory, logoUrl]);

  const connectToCloud = async (url: string, key: string) => {
    setSyncStatus('SYNCING');
    try {
      const client = createClient(url, key);
      const { data, error } = await client.from('customers').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
      localStorage.setItem('erp_cloud_url', url);
      localStorage.setItem('erp_cloud_key', key);
      return true;
    } catch (err: any) {
      console.error("Cloud Connection Failed:", err);
      setSyncStatus('ERROR');
      setLastSyncError(err.message);
      return false;
    }
  };

  const cloudUpsert = async (table: string, data: any[]) => {
    if (!supabase) return;
    try {
      setSyncStatus('SYNCING');
      const { error } = await supabase.from(table).upsert(data);
      if (error) throw error;
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      setLastSyncError(`Table ${table}: ${err.message}`);
    }
  };

  const syncAllLocalToCloud = async () => {
    if (!supabase) return;
    setSyncStatus('SYNCING');
    try {
      await cloudUpsert('customers', customers);
      await cloudUpsert('jobs', jobs);
      await cloudUpsert('inventory', inventory);
      await cloudUpsert('staff', staff);
      await cloudUpsert('services', services);
      await cloudUpsert('transactions', transactions);
      await cloudUpsert('accounts', accounts);
      await cloudUpsert('payroll_history', payrollHistory);
      setSyncStatus('SYNCED');
    } catch (err) {
      setSyncStatus('ERROR');
    }
  };

  // Auto-sync whenever local data changes (Debounced potentially in future)
  useEffect(() => {
    if (isCloudConnected) {
       const timer = setTimeout(() => syncAllLocalToCloud(), 2000);
       return () => clearTimeout(timer);
    }
  }, [customers, jobs, inventory, staff, services, transactions, accounts, payrollHistory, isCloudConnected]);

  const updateBalances = (legs: LedgerLeg[]) => {
    setAccounts(prev => {
      let updated = [...prev];
      legs.forEach(leg => {
        if (!leg.accountName) return;
        let acc = updated.find(a => a.name.toLowerCase() === leg.accountName.toLowerCase());
        
        if (!acc) {
          acc = {
            id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            code: (1000 + updated.length).toString(),
            name: leg.accountName,
            type: leg.accountType || AccountType.EXPENSE,
            balance: 0
          };
          updated.push(acc);
        }

        const isDebitNature = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
        if (isDebitNature) {
          acc.balance += (leg.isDebit ? leg.amount : -leg.amount);
        } else {
          acc.balance += (!leg.isDebit ? leg.amount : -leg.amount);
        }
      });
      return updated;
    });
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    updateBalances([
      { accountName: tx.category, amount: tx.amount, isDebit: tx.type === 'EXPENSE' },
      { accountName: 'Cash on Hand', amount: tx.amount, isDebit: tx.type === 'INCOME' }
    ]);
  };

  const bulkAddTransactions = (txs: Transaction[]) => {
    setTransactions(prev => [...prev, ...txs]);
    const allLegs: LedgerLeg[] = [];
    txs.forEach(tx => {
        allLegs.push({ accountName: tx.category, amount: tx.amount, isDebit: tx.type === 'EXPENSE' });
        allLegs.push({ accountName: 'Cash on Hand', amount: tx.amount, isDebit: tx.type === 'INCOME' });
    });
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

  const addJob = (job: JobCard) => setJobs(prev => [...prev, job]);
  const updateJob = (job: JobCard) => setJobs(prev => prev.map(j => j.id === job.id ? job : j));
  const deleteJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

  const updateJobStatus = (id: string, status: JobCard['status'], paymentMethod: Transaction['method'] = 'CASH') => {
    setJobs(prev => prev.map(j => {
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
    }));
  };

  const addStaff = (member: Staff) => setStaff(prev => [...prev, member]);
  const removeStaff = (id: string) => setStaff(prev => prev.filter(s => s.id !== id));
  const updateStaff = (updatedStaff: Staff) => setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

  const addInventoryItem = (item: InventoryItem) => setInventory(prev => [...prev, item]);
  const deleteInventoryItem = (id: string) => setInventory(prev => prev.filter(i => i.id !== id));
  const recordStockUsage = (itemId: string, quantity: number, notes: string) => {
      setInventory(prev => prev.map(i => i.id === itemId ? { ...i, quantityOnHand: Math.max(0, i.quantityOnHand - quantity) } : i));
  };
  const bulkAddInventory = (items: InventoryItem[]) => setInventory(prev => [...prev, ...items]);

  const addService = (service: Service) => setServices(prev => [...prev, service]);
  const updateService = (service: Service) => setServices(prev => prev.map(s => s.id === service.id ? service : s));
  const deleteService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));
  const bulkAddServices = (newServices: Service[]) => setServices(prev => [...prev, ...newServices]);

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
    setPayrollHistory(prev => [
      ...prev, 
      { id: `pr-${Date.now()}`, month, dateGenerated: new Date().toISOString(), totalAmount: total, records: payrollData, status: 'FINALIZED' }
    ]);
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
      updateLogo: setLogoUrl,
      customers, jobs, inventory, staff, services, transactions, accounts, purchases, leads, appointments, stockLogs, payrollHistory,
      isCloudConnected, syncStatus, lastSyncError, connectToCloud, syncAllLocalToCloud,
      addJob, updateJob, deleteJob, updateJobStatus, addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory,
      addService, updateService, deleteService, bulkAddServices, restoreData, resetToFactory, 
      addCustomer: (c) => setCustomers(prev => [...prev, c]),
      updateCustomer: (c) => setCustomers(prev => prev.map(x => x.id === c.id ? x : x)),
      addPurchase: (p) => setPurchases(prev => [...prev, p]), 
      addTransaction, bulkAddTransactions, bulkProcessJournal: () => {}, bulkAddPurchases: () => {}, executePayroll
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
