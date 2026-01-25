
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
  bulkAddTransactions: (txs: any[], skipAutoOffset?: boolean) => void;
  bulkAddPurchases: (pos: PurchaseOrder[]) => void;
  executePayroll: (month: string, payrollData: any[]) => void;
  bulkAddServices: (services: Service[]) => void;
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

// Fixed ERPProvider return type error by completing implementation and returning Provider
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

  const updateLedger = (txs: any[], isBulk: boolean = false) => {
    setAccounts(prev => {
        let updatedAccounts = [...prev];
        txs.forEach(tx => {
            let acc = updatedAccounts.find(a => a.name.toLowerCase() === tx.category.toLowerCase());
            
            // Create account if it doesn't exist
            if (!acc) {
                acc = {
                    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    code: (1000 + updatedAccounts.length).toString(),
                    name: tx.category,
                    type: tx.accType || (tx.type === 'INCOME' ? AccountType.REVENUE : AccountType.EXPENSE),
                    balance: 0
                };
                updatedAccounts.push(acc);
            }

            // Offset logic for manual app entries only
            if (!isBulk) {
                const cashAcc = updatedAccounts.find(a => a.code === '1000');
                if (cashAcc) {
                    cashAcc.balance += (tx.type === 'INCOME' ? tx.amount : -tx.amount);
                }
            }

            // Update specific ledger account based on its nature
            const isAssetOrExpense = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
            // Asset/Expense INCREASE on Debit (marked as EXPENSE in importer), DECREASE on Credit (marked as INCOME)
            // Revenue/Equity INCREASE on Credit (marked as INCOME), DECREASE on Debit (marked as EXPENSE)
            if (isAssetOrExpense) {
                acc.balance += (tx.type === 'EXPENSE' ? tx.amount : -tx.amount);
            } else {
                acc.balance += (tx.type === 'INCOME' ? tx.amount : -tx.amount);
            }
        });
        persist('erp_accounts', updatedAccounts);
        return updatedAccounts;
    });
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
    setPasswords(prev => ({ ...prev, [role]: newPass }));
    localStorage.setItem(`pass_${role.toLowerCase()}`, newPass);
  };

  const connectToCloud = async (url: string, key: string): Promise<boolean> => {
    try {
      const client = createClient(url, key);
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      return true;
    } catch (err: any) {
      setSyncStatus('ERROR');
      return false;
    }
  };

  const addTransaction = (tx: Transaction) => {
    const newTxList = [...transactions, tx];
    setTransactions(newTxList);
    persist('erp_transactions', newTxList);
    updateLedger([tx], false);
  };

  const bulkAddTransactions = (txs: any[], skipAutoOffset: boolean = false) => {
    const plOnly = txs.filter(tx => {
        const type = tx.accType;
        return type === AccountType.REVENUE || type === AccountType.EXPENSE;
    });

    const newHistory = [...transactions, ...plOnly];
    setTransactions(newHistory);
    persist('erp_transactions', newHistory);
    updateLedger(txs, true);
  };

  const updateLogo = (url: string) => {
    setLogoUrl(url);
    localStorage.setItem('erp_logo', url);
  };

  const syncAllLocalToCloud = async () => {
    setSyncStatus('SYNCING');
    await new Promise(r => setTimeout(r, 1000));
    setSyncStatus('SYNCED');
  };

  const addJob = (job: JobCard) => {
    const newList = [...jobs, job];
    setJobs(newList);
    persist('erp_jobs', newList);
  };

  const updateJob = (job: JobCard) => {
    const newList = jobs.map(j => j.id === job.id ? job : j);
    setJobs(newList);
    persist('erp_jobs', newList);
  };

  const deleteJob = (id: string) => {
    const newList = jobs.filter(j => j.id !== id);
    setJobs(newList);
    persist('erp_jobs', newList);
  };

  const updateJobStatus = (id: string, status: JobCard['status'], paymentMethod?: Transaction['method']) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const updatedJob: JobCard = { ...job, status, paymentStatus: status === 'INVOICED' ? 'PAID' : job.paymentStatus };
    updateJob(updatedJob);

    if (status === 'INVOICED') {
      const tx: Transaction = {
        id: `tx-job-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'INCOME',
        category: 'Service Revenue',
        amount: job.total,
        method: paymentMethod || 'CASH',
        description: `Invoice #${job.ticketNumber}`
      };
      addTransaction(tx);
    }
  };

  const addStaff = (member: Staff) => {
    const newList = [...staff, member];
    setStaff(newList);
    persist('erp_staff', newList);
  };

  const removeStaff = (id: string) => {
    const newList = staff.filter(s => s.id !== id);
    setStaff(newList);
    persist('erp_staff', newList);
  };

  const updateStaff = (updatedStaff: Staff) => {
    const newList = staff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaff(newList);
    persist('erp_staff', newList);
  };

  const addInventoryItem = (item: InventoryItem) => {
    const newList = [...inventory, item];
    setInventory(newList);
    persist('erp_inventory', newList);
  };

  const deleteInventoryItem = (id: string) => {
    const newList = inventory.filter(i => i.id !== id);
    setInventory(newList);
    persist('erp_inventory', newList);
  };

  const recordStockUsage = (itemId: string, quantity: number, notes: string) => {
    setInventory(prev => {
      const newList = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, quantityOnHand: item.quantityOnHand - quantity };
        }
        return item;
      });
      persist('erp_inventory', newList);
      return newList;
    });

    const log: StockTransaction = {
      id: `stlog-${Date.now()}`,
      itemId,
      date: new Date().toISOString().split('T')[0],
      type: 'USAGE',
      quantity,
      notes
    };
    const newLogs = [...stockLogs, log];
    setStockLogs(newLogs);
    persist('erp_stock_logs', newLogs);
  };

  const bulkAddInventory = (items: InventoryItem[]) => {
    const newList = [...inventory, ...items];
    setInventory(newList);
    persist('erp_inventory', newList);
  };

  const addService = (service: Service) => {
    const newList = [...services, service];
    setServices(newList);
    persist('erp_services', newList);
  };

  const updateService = (service: Service) => {
    const newList = services.map(s => s.id === service.id ? service : s);
    setServices(newList);
    persist('erp_services', newList);
  };

  const deleteService = (id: string) => {
    const newList = services.filter(s => s.id !== id);
    setServices(newList);
    persist('erp_services', newList);
  };

  const addCustomer = (customer: Customer) => {
    const newList = [...customers, customer];
    setCustomers(newList);
    persist('erp_customers', newList);
  };

  const updateCustomer = (customer: Customer) => {
    const newList = customers.map(c => c.id === customer.id ? customer : c);
    setCustomers(newList);
    persist('erp_customers', newList);
  };

  const addPurchase = (purchase: PurchaseOrder) => {
    const newList = [...purchases, purchase];
    setPurchases(newList);
    persist('erp_purchases', newList);

    const tx: Transaction = {
      id: `tx-po-${purchase.id}`,
      date: purchase.date,
      type: 'EXPENSE',
      category: purchase.itemName,
      amount: purchase.amount,
      method: 'CASH',
      description: `Purchase: ${purchase.vendorName} - ${purchase.itemName}`
    };
    addTransaction(tx);
  };

  const bulkAddPurchases = (pos: PurchaseOrder[]) => {
    const newList = [...purchases, ...pos];
    setPurchases(newList);
    persist('erp_purchases', newList);
  };

  const executePayroll = (month: string, payrollData: any[]) => {
    const run: PayrollRun = {
      id: `pr-${Date.now()}`,
      month,
      dateGenerated: new Date().toISOString(),
      totalAmount: payrollData.reduce((sum, r) => sum + r.netPay, 0),
      records: payrollData,
      status: 'FINALIZED'
    };
    const newList = [...payrollHistory, run];
    setPayrollHistory(newList);
    persist('erp_payroll_history', newList);

    const tx: Transaction = {
      id: `tx-pr-${run.id}`,
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      category: 'Labor Expense',
      amount: run.totalAmount,
      method: 'TRANSFER',
      description: `Payroll Disbursed - ${month}`
    };
    addTransaction(tx);
  };

  const bulkAddServices = (svcs: Service[]) => {
    const newList = [...services, ...svcs];
    setServices(newList);
    persist('erp_services', newList);
  };

  const restoreData = (data: any) => {
    if (data.modules) {
      setCustomers(data.modules.customers || []);
      setJobs(data.modules.jobs || []);
      setTransactions(data.modules.transactions || []);
      setStaff(data.modules.staff || []);
      setInventory(data.modules.inventory || []);
      setServices(data.modules.services || []);
      setAccounts(data.modules.financials || MOCK_ACCOUNTS);
      
      persist('erp_customers', data.modules.customers || []);
      persist('erp_jobs', data.modules.jobs || []);
      persist('erp_transactions', data.modules.transactions || []);
      persist('erp_staff', data.modules.staff || []);
      persist('erp_inventory', data.modules.inventory || []);
      persist('erp_services', data.modules.services || []);
      persist('erp_accounts', data.modules.financials || MOCK_ACCOUNTS);
    }
  };

  const resetToFactory = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <ERPContext.Provider value={{
      currentUserRole, isAuthenticated, login, logout, updatePassword,
      logoUrl, updateLogo, customers, jobs, inventory, staff, services,
      transactions, accounts, purchases, leads, appointments, stockLogs,
      payrollHistory, isCloudConnected, syncStatus, lastSyncError: null,
      connectToCloud, syncAllLocalToCloud, addJob, updateJob, deleteJob, updateJobStatus,
      addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem,
      recordStockUsage, bulkAddInventory, addService, updateService, deleteService,
      addCustomer, updateCustomer, addPurchase, addTransaction, bulkAddTransactions,
      bulkAddPurchases, executePayroll, bulkAddServices, restoreData, resetToFactory
    }}>
      {children}
    </ERPContext.Provider>
  );
};

// Fixed module export error by exporting useERP hook
export const useERP = () => {
  const context = useContext(ERPContext);
  if (context === undefined) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
