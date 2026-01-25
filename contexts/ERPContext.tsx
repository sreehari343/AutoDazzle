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
  getSystemState: () => any;
  restoreData: (data: any) => void;
  resetToFactory: () => void;
  executePayroll: (month: string, records: any[]) => void;
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
      persist('erp_accounts', updated);
      return updated;
    });
  };

  const getSystemState = () => ({
    logoUrl,
    customers,
    jobs,
    inventory,
    staff,
    services,
    transactions,
    accounts,
    purchases,
    payrollHistory,
    stockLogs,
    passwords
  });

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
      sessionStorage.setItem('erp_session_role', role);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUserRole(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('erp_session_role');
  };

  const updatePassword = (role: UserRole, newPass: string) => {
    setPasswords(prev => {
        const u = { ...prev, [role]: newPass };
        localStorage.setItem(`pass_${role.toLowerCase()}`, newPass);
        return u;
    });
  };

  const connectToCloud = async (url: string, key: string): Promise<boolean> => {
    try {
      setSyncStatus('SYNCING');
      const client = createClient(url, key);
      const { error } = await client.from('erp_status').select('*').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      return true;
    } catch (err: any) {
      console.error(err);
      setSyncStatus('ERROR');
      return false;
    }
  };

  const restoreData = (data: any) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.transactions) setTransactions(data.transactions);
    if (data.customers) setCustomers(data.customers);
    if (data.jobs) setJobs(data.jobs);
    if (data.inventory) setInventory(data.inventory);
    if (data.staff) setStaff(data.staff);
    if (data.services) setServices(data.services);
    if (data.logoUrl) { setLogoUrl(data.logoUrl); localStorage.setItem('erp_logo', data.logoUrl); }
    
    // Persist all
    Object.keys(data).forEach(key => {
        localStorage.setItem(`erp_${key}`, JSON.stringify(data[key]));
    });
  };

  const resetToFactory = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Implement missing Job functions
  const addJob = (job: JobCard) => {
    const u = [...jobs, job];
    setJobs(u);
    persist('erp_jobs', u);
  };

  const updateJob = (job: JobCard) => {
    const u = jobs.map(j => j.id === job.id ? job : j);
    setJobs(u);
    persist('erp_jobs', u);
  };

  const deleteJob = (id: string) => {
    const u = jobs.filter(j => j.id !== id);
    setJobs(u);
    persist('erp_jobs', u);
  };

  const updateJobStatus = (id: string, status: JobCard['status'], paymentMethod?: Transaction['method']) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    
    const updatedJob: JobCard = { 
      ...job, 
      status, 
      paymentStatus: status === 'INVOICED' ? 'PAID' : job.paymentStatus 
    };
    
    updateJob(updatedJob);
    
    if (status === 'INVOICED') {
      const tx: Transaction = {
        id: `tx-job-${id}-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'INCOME',
        category: 'Service Revenue',
        amount: updatedJob.total,
        method: paymentMethod || 'CASH',
        description: `Invoice #${updatedJob.ticketNumber}`
      };
      addTransaction(tx);
    }
  };

  // Implement missing Staff functions
  const addStaff = (member: Staff) => {
    const u = [...staff, member];
    setStaff(u);
    persist('erp_staff', u);
  };

  const removeStaff = (id: string) => {
    const u = staff.filter(s => s.id !== id);
    setStaff(u);
    persist('erp_staff', u);
  };

  const updateStaff = (updatedStaff: Staff) => {
    const u = staff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaff(u);
    persist('erp_staff', u);
  };

  // Implement missing Inventory functions
  const addInventoryItem = (item: InventoryItem) => {
    const u = [...inventory, item];
    setInventory(u);
    persist('erp_inventory', u);
  };

  const deleteInventoryItem = (id: string) => {
    const u = inventory.filter(i => i.id !== id);
    setInventory(u);
    persist('erp_inventory', u);
  };

  const recordStockUsage = (itemId: string, quantity: number, notes: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const updatedInventory = inventory.map(i => 
      i.id === itemId ? { ...i, quantityOnHand: i.quantityOnHand - quantity } : i
    );
    setInventory(updatedInventory);
    persist('erp_inventory', updatedInventory);
    
    const log: StockTransaction = {
      id: `log-${Date.now()}`,
      itemId,
      date: new Date().toISOString().split('T')[0],
      type: 'USAGE',
      quantity,
      notes
    };
    const updatedLogs = [...stockLogs, log];
    setStockLogs(updatedLogs);
    persist('erp_stock_logs', updatedLogs);
  };

  const bulkAddInventory = (items: InventoryItem[]) => {
    const u = [...inventory, ...items];
    setInventory(u);
    persist('erp_inventory', u);
  };

  // Implement missing Service functions
  const addService = (service: Service) => {
    const u = [...services, service];
    setServices(u);
    persist('erp_services', u);
  };

  const updateService = (service: Service) => {
    const u = services.map(s => s.id === service.id ? service : s);
    setServices(u);
    persist('erp_services', u);
  };

  const deleteService = (id: string) => {
    const u = services.filter(s => s.id !== id);
    setServices(u);
    persist('erp_services', u);
  };

  // Implement missing Payroll and Purchase functions
  const executePayroll = (month: string, records: any[]) => {
    const total = records.reduce((sum, r) => sum + r.netPay, 0);
    const run: PayrollRun = {
      id: `pr-${Date.now()}`,
      month,
      dateGenerated: new Date().toISOString().split('T')[0],
      totalAmount: total,
      records: records,
      status: 'FINALIZED'
    };
    const updatedHistory = [...payrollHistory, run];
    setPayrollHistory(updatedHistory);
    persist('erp_payroll_history', updatedHistory);

    // Record as Expense in GL
    const tx: Transaction = {
      id: `tx-pr-${run.id}`,
      date: run.dateGenerated,
      type: 'EXPENSE',
      category: 'Labor Expense',
      amount: total,
      method: 'TRANSFER',
      description: `Payroll Disbursal - ${month}`
    };
    addTransaction(tx);
  };

  const addPurchase = (purchase: PurchaseOrder) => {
    const u = [...purchases, purchase];
    setPurchases(u);
    persist('erp_purchases', u);
    
    // Record as Expense in GL if paid
    if (purchase.status === 'PAID') {
       const tx: Transaction = {
          id: `tx-pur-${purchase.id}`,
          date: purchase.date,
          type: 'EXPENSE',
          category: purchase.category === 'INVENTORY' ? 'Inventory Asset' : 'Chemical Expense',
          amount: purchase.amount,
          method: 'TRANSFER',
          description: `Purchase: ${purchase.vendorName} - ${purchase.itemName}`
       };
       addTransaction(tx);
    }
  };

  return (
    <ERPContext.Provider value={{
      currentUserRole, isAuthenticated, login, logout, updatePassword, logoUrl, 
      updateLogo: (u) => { setLogoUrl(u); localStorage.setItem('erp_logo', u); },
      customers, jobs, inventory, staff, services, transactions, accounts, purchases, leads, appointments, stockLogs, payrollHistory,
      isCloudConnected, syncStatus, lastSyncError: null, connectToCloud, syncAllLocalToCloud: async () => {},
      addJob, updateJob, deleteJob, updateJobStatus, addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory,
      addService, updateService, deleteService, restoreData, resetToFactory, getSystemState,
      addCustomer: (c) => { const u = [...customers, c]; setCustomers(u); persist('erp_customers', u); },
      updateCustomer: (c) => { const u = customers.map(x => x.id === c.id ? c : x); setCustomers(u); persist('erp_customers', u); },
      addPurchase, addTransaction, bulkProcessJournal, executePayroll
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
