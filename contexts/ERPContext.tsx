
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
  connectToCloud: (url: string, key: string) => Promise<boolean>;
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
  bulkAddTransactions: (txs: Transaction[]) => void;
  executePayroll: (month: string, payrollData: any[]) => void;
  bulkAddServices: (services: Service[]) => void;
  restoreData: (data: any) => void;
  resetToFactory: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

// Helper for lazy initialization
const getInitialData = <T,>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error loading ${key} from storage`, e);
  }
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
  
  // Initialize state from localStorage immediately to prevent data loss on refresh/update
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
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_key');
    if (savedUrl && savedKey) initSupabase(savedUrl, savedKey);
    
    const sessionRole = sessionStorage.getItem('erp_session_role');
    if (sessionRole) {
      setCurrentUserRole(sessionRole as UserRole);
      setIsAuthenticated(true);
    }
  }, []);

  // Persist Ledger Accounts specifically whenever they change (Critical Fix)
  useEffect(() => {
    localStorage.setItem('erp_accounts', JSON.stringify(accounts));
  }, [accounts]);

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

  const persist = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const initSupabase = async (url: string, key: string) => {
    try {
      setSyncStatus('SYNCING');
      const client = createClient(url, key);
      const { error } = await client.from('staff').select('*').limit(1);
      if (error) throw error;
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
    } catch (err) {
      setSyncStatus('ERROR');
      setIsCloudConnected(false);
    }
  };

  const updateLogo = (url: string) => {
    setLogoUrl(url);
    localStorage.setItem('erp_logo', url);
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
          // 1. Create Financial Transaction
          const tx: Transaction = {
            id: `tx-sale-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'INCOME',
            category: 'Service Sales',
            amount: j.total,
            method: paymentMethod,
            referenceId: j.id,
            description: `Invoice ${j.ticketNumber} Payment (${paymentMethod})`
          };
          addTransaction(tx);

          // 2. Link: Update Customer Stats (LTV & Visits)
          setCustomers(prevCustomers => {
            const updatedCusts = prevCustomers.map(c => {
               if (c.id === j.customerId) {
                 return {
                   ...c,
                   visits: c.visits + 1,
                   lifetimeValue: c.lifetimeValue + j.total,
                 };
               }
               return c;
            });
            persist('erp_customers', updatedCusts);
            return updatedCusts;
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

  const addCustomer = (customer: Customer) => {
    const updated = [...customers, customer];
    setCustomers(updated);
    persist('erp_customers', updated);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    const updated = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
    setCustomers(updated);
    persist('erp_customers', updated);
  };

  const addPurchase = (purchase: PurchaseOrder) => {
    const updatedPurchases = [...purchases, purchase];
    setPurchases(updatedPurchases);
    persist('erp_purchases', updatedPurchases);

    if (purchase.category === 'INVENTORY') {
       const existingItem = inventory.find(i => i.name === purchase.itemName);
       if(existingItem) {
          setInventory(currentInventory => {
             const updatedInv = currentInventory.map(i => {
                if (i.id === existingItem.id) {
                   return { ...i, quantityOnHand: i.quantityOnHand + purchase.quantity, lastRestocked: purchase.date };
                }
                return i;
             });
             persist('erp_inventory', updatedInv);
             return updatedInv;
          });

          const log: StockTransaction = {
             id: `stx-${Date.now()}`,
             itemId: existingItem.id,
             date: purchase.date,
             type: 'RESTOCK',
             quantity: purchase.quantity,
             notes: `PO: ${purchase.docNumber}`
          };
          setStockLogs(prev => {
              const newLogs = [...prev, log];
              persist('erp_stock_logs', newLogs);
              return newLogs;
          });
       }
    }

    const tx: Transaction = {
      id: `tx-pur-${Date.now()}`,
      date: purchase.date,
      type: 'EXPENSE',
      category: purchase.category === 'INVENTORY' ? 'Inventory Purchase' : 'Operating Expense',
      amount: purchase.amount,
      method: 'TRANSFER',
      referenceId: purchase.id,
      description: `Purchase: ${purchase.itemName} from ${purchase.vendorName}`
    };
    addTransaction(tx);
  };

  const addTransaction = (tx: Transaction) => {
    const newTx = [...transactions, tx];
    setTransactions(newTx);
    persist('erp_transactions', newTx);
    updateLedger([tx]);
  };

  const bulkAddTransactions = (txs: Transaction[]) => {
    const newTx = [...transactions, ...txs];
    setTransactions(newTx);
    persist('erp_transactions', newTx);
    updateLedger(txs);
  };

  const updateLedger = (newTransactions: Transaction[]) => {
    setAccounts(prev => {
      let updatedAccounts = [...prev];
      newTransactions.forEach(tx => {
         updatedAccounts = updatedAccounts.map(acc => {
            if (acc.code === '1000') {
              if (tx.type === 'INCOME') return { ...acc, balance: acc.balance + tx.amount };
              if (tx.type === 'EXPENSE') return { ...acc, balance: acc.balance - tx.amount };
            }
            if (tx.type === 'INCOME' && acc.code === '4000') {
               return { ...acc, balance: acc.balance + tx.amount };
            } 
            if (tx.type === 'EXPENSE') {
               const cat = tx.category.toLowerCase();
               if (acc.code === '1200' && (cat.includes('inventory') || cat.includes('stock'))) {
                  return { ...acc, balance: acc.balance + tx.amount };
               }
               else if (acc.code === '5100' && (cat.includes('labor') || cat.includes('payroll') || cat.includes('salary'))) {
                  return { ...acc, balance: acc.balance + tx.amount };
               }
               else if (acc.code === '5200' && cat.includes('rent')) {
                  return { ...acc, balance: acc.balance + tx.amount };
               }
               else if (acc.code === '5300' && (cat.includes('utility') || cat.includes('power') || cat.includes('water'))) {
                  return { ...acc, balance: acc.balance + tx.amount };
               }
               else if (acc.code === '5000' && !cat.includes('labor') && !cat.includes('rent') && !cat.includes('utility') && !cat.includes('inventory')) {
                  return { ...acc, balance: acc.balance + tx.amount };
               }
            }
            return acc;
         });
      });
      return updatedAccounts;
    });
  };

  const executePayroll = (month: string, payrollData: any[]) => {
    const totalPayroll = payrollData.reduce((sum, p) => sum + p.netPay, 0);
    
    // 1. Create Financial Transaction
    const tx: Transaction = {
      id: `tx-pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      category: 'Labor Expense',
      amount: totalPayroll,
      method: 'TRANSFER',
      description: `Staff Payroll Execution - ${payrollData.length} Employees (${month})`
    };
    addTransaction(tx);

    // 2. Update Staff Balances (Loans/Advances)
    setStaff(prevStaff => {
        const updatedStaff = prevStaff.map(s => {
            const record = payrollData.find((p: any) => p.id === s.id);
            if (!record || !record.deductionsObj) return s;

            const loanDeduction = record.deductionsObj.loan || 0;
            const advanceDeduction = record.deductionsObj.advance || 0;

            return {
                ...s,
                loanBalance: Math.max(0, s.loanBalance - loanDeduction),
                currentAdvance: Math.max(0, s.currentAdvance - advanceDeduction)
            };
        });
        persist('erp_staff', updatedStaff);
        return updatedStaff;
    });

    // 3. Save Payroll Snapshot (History)
    const runSnapshot: PayrollRun = {
      id: `pr-${month}-${Date.now()}`,
      month: month,
      dateGenerated: new Date().toISOString(),
      totalAmount: totalPayroll,
      records: payrollData,
      status: 'FINALIZED'
    };
    
    setPayrollHistory(prev => {
      // Remove existing for this month if any (re-run support)
      const filtered = prev.filter(p => p.month !== month);
      const updated = [...filtered, runSnapshot];
      persist('erp_payroll_history', updated);
      return updated;
    });
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
      setInventory(currentInventory => {
          const updated = currentInventory.map(i => {
              if (i.id === itemId) {
                  const currentQty = typeof i.quantityOnHand === 'number' ? i.quantityOnHand : 0;
                  const newQty = Math.max(0, currentQty - quantity);
                  return { ...i, quantityOnHand: newQty };
              }
              return i;
          });
          persist('erp_inventory', updated);
          return updated;
      });

      const log: StockTransaction = {
          id: `stx-${Date.now()}`,
          itemId,
          date: new Date().toISOString().split('T')[0],
          type: 'USAGE',
          quantity,
          notes
      };
      setStockLogs(prev => {
          const newLogs = [...prev, log];
          persist('erp_stock_logs', newLogs);
          return newLogs;
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

  const bulkAddServices = (newServices: Service[]) => {
    const updated = [...services, ...newServices];
    setServices(updated);
    persist('erp_services', updated);
  };

  const connectToCloud = async (url: string, key: string): Promise<boolean> => {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    await initSupabase(url, key);
    return true;
  };
  
  const restoreData = (data: any) => {
    if (data.modules) {
      setCustomers(data.modules.customers || []);
      setJobs(data.modules.jobs || []);
      setStaff(data.modules.staff || []);
      setTransactions(data.modules.transactions || []);
      setInventory(data.modules.inventory || []);
      setAccounts(data.modules.financials || MOCK_ACCOUNTS);
      setPayrollHistory(data.modules.payrollHistory || []);
      alert('System Data Restored Successfully.');
    }
  };

  const resetToFactory = () => {
    if (window.confirm("WARNING: Wipe all data? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <ERPContext.Provider value={{
      currentUserRole, isAuthenticated, login, logout, updatePassword,
      logoUrl, updateLogo,
      customers, jobs, inventory, staff, services, transactions, accounts, purchases, leads, appointments, stockLogs, payrollHistory,
      isCloudConnected, syncStatus, connectToCloud,
      addJob, updateJob, deleteJob, updateJobStatus, addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory,
      addService, updateService, deleteService, bulkAddServices, restoreData, resetToFactory, addCustomer, updateCustomer, addPurchase, addTransaction, bulkAddTransactions, executePayroll
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
