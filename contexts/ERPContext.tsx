import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  bulkAddTransactions: (txs: Transaction[]) => void;
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

// --- DATABASE MAPPING UTILITIES ---
const mapToDb = (table: string, data: any) => {
    if (table === 'customers') return {
        id: data.id, name: data.name, email: data.email, phone: data.phone, address: data.address,
        lifetime_value: data.lifetimeValue, joined_date: data.joinedDate, visits: data.visits,
        is_premium: data.isPremium, vehicles: data.vehicles
    };
    if (table === 'jobs') return {
        id: data.id, ticket_number: data.ticketNumber, date: data.date, time_in: data.timeIn,
        customer_id: data.customerId, segment: data.segment, service_ids: data.serviceIds,
        assigned_staff_ids: data.assignedStaffIds, status: data.status, total: data.total,
        tax: data.tax, notes: data.notes, payment_status: data.paymentStatus
    };
    if (table === 'staff') return {
        id: data.id, name: data.name, role: data.role, email: data.email, phone: data.phone,
        base_salary: data.baseSalary, active: data.active, joined_date: data.joinedDate,
        current_advance: data.currentAdvance, loan_balance: data.loanBalance
    };
    if (table === 'transactions') return {
        id: data.id, date: data.date, type: data.type, category: data.category,
        amount: data.amount, method: data.method, description: data.description, reference_id: data.referenceId
    };
    if (table === 'inventory') return {
        id: data.id, sku: data.sku, name: data.name, category: data.category, unit: data.unit,
        quantity_on_hand: data.quantityOnHand, reorder_point: data.reorderPoint,
        cost_per_unit: data.costPerUnit, supplier: data.supplier, last_restocked: data.lastRestocked
    };
    if (table === 'purchases') return {
        id: data.id, date: data.date, doc_number: data.docNumber, vendor_name: data.vendorName,
        item_name: data.itemName, quantity: data.quantity, unit: data.unit, rate: data.rate,
        amount: data.amount, status: data.status, category: data.category
    };
    if (table === 'services') return {
        id: data.id, sku: data.sku, name: data.name, category: data.category, 
        duration_minutes: data.durationMinutes, base_price: data.basePrice, prices: data.prices
    };
    return data;
};

const mapFromDb = (table: string, data: any) => {
    if (table === 'customers') return {
        ...data, lifetimeValue: data.lifetime_value, joinedDate: data.joined_date, isPremium: data.is_premium
    };
    if (table === 'jobs') return {
        ...data, ticketNumber: data.ticket_number, timeIn: data.time_in, customerId: data.customer_id,
        serviceIds: data.service_ids, assignedStaffIds: data.assigned_staff_ids, paymentStatus: data.payment_status
    };
    if (table === 'staff') return {
        ...data, baseSalary: data.base_salary, joinedDate: data.joined_date, 
        currentAdvance: data.current_advance, loanBalance: data.loan_balance
    };
    if (table === 'transactions') return {
        ...data, referenceId: data.reference_id
    };
    if (table === 'inventory') return {
        ...data, quantityOnHand: data.quantity_on_hand, reorderPoint: data.reorder_point,
        costPerUnit: data.cost_per_unit, lastRestocked: data.last_restocked
    };
    if (table === 'purchases') return {
        ...data, docNumber: data.doc_number, vendorName: data.vendor_name, itemName: data.item_name
    };
    if (table === 'services') return {
        ...data, durationMinutes: data.duration_minutes, basePrice: data.base_price
    };
    return data;
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

  // --- Cloud Sync Engine ---
  const pushToCloud = useCallback(async (table: string, data: any) => {
    if (!supabase || !isCloudConnected) return;
    try {
      setSyncStatus('SYNCING');
      const dbPayload = mapToDb(table, data);
      const { error } = await supabase.from(table).upsert(dbPayload);
      if (error) throw error;
      setSyncStatus('SYNCED');
      setLastSyncError(null);
    } catch (err: any) {
      console.error(`Supabase Push Error [${table}]:`, err.message);
      setSyncStatus('ERROR');
      setLastSyncError(`Push failed: ${err.message}`);
    }
  }, [supabase, isCloudConnected]);

  const removeFromCloud = useCallback(async (table: string, id: string) => {
    if (!supabase || !isCloudConnected) return;
    try {
      setSyncStatus('SYNCING');
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setSyncStatus('SYNCED');
      setLastSyncError(null);
    } catch (err: any) {
      console.error(`Supabase Delete Error [${table}]:`, err.message);
      setSyncStatus('ERROR');
    }
  }, [supabase, isCloudConnected]);

  const pullFromCloud = useCallback(async (client: SupabaseClient) => {
      try {
          setSyncStatus('SYNCING');
          const [cRes, jRes, sRes, tRes, iRes, pRes, svcRes] = await Promise.all([
              client.from('customers').select('*'),
              client.from('jobs').select('*'),
              client.from('staff').select('*'),
              client.from('transactions').select('*'),
              client.from('inventory').select('*'),
              client.from('purchases').select('*'),
              client.from('services').select('*')
          ]);

          if (cRes.data) {
              const mapped = cRes.data.map(d => mapFromDb('customers', d));
              setCustomers(mapped);
              persist('erp_customers', mapped);
          }
          if (jRes.data) {
              const mapped = jRes.data.map(d => mapFromDb('jobs', d));
              setJobs(mapped);
              persist('erp_jobs', mapped);
          }
          if (sRes.data) {
              const mapped = sRes.data.map(d => mapFromDb('staff', d));
              setStaff(mapped);
              persist('erp_staff', mapped);
          }
          if (tRes.data) {
              const mapped = tRes.data.map(d => mapFromDb('transactions', d));
              setTransactions(mapped);
              persist('erp_transactions', mapped);
          }
          if (iRes.data) {
              const mapped = iRes.data.map(d => mapFromDb('inventory', d));
              setInventory(mapped);
              persist('erp_inventory', mapped);
          }
          if (pRes.data) {
              const mapped = pRes.data.map(d => mapFromDb('purchases', d));
              setPurchases(mapped);
              persist('erp_purchases', mapped);
          }
          if (svcRes.data && svcRes.data.length > 0) {
              const mapped = svcRes.data.map(d => mapFromDb('services', d));
              setServices(mapped);
              persist('erp_services', mapped);
          }

          setSyncStatus('SYNCED');
          setLastSyncError(null);
      } catch (err: any) {
          console.error("Supabase Pull Error:", err.message);
          setSyncStatus('ERROR');
          setLastSyncError(`Pull failed: ${err.message}. Check SQL Schema.`);
      }
  }, []);

  const syncAllLocalToCloud = async () => {
      if (!supabase || !isCloudConnected) return;
      try {
          setSyncStatus('SYNCING');
          const cPayload = customers.map(c => mapToDb('customers', c));
          const jPayload = jobs.map(j => mapToDb('jobs', j));
          const sPayload = staff.map(s => mapToDb('staff', s));
          const tPayload = transactions.map(t => mapToDb('transactions', t));
          const iPayload = inventory.map(i => mapToDb('inventory', i));
          const pPayload = purchases.map(p => mapToDb('purchases', p));
          const svcPayload = services.map(s => mapToDb('services', s));

          await Promise.all([
            supabase.from('customers').upsert(cPayload),
            supabase.from('jobs').upsert(jPayload),
            supabase.from('staff').upsert(sPayload),
            supabase.from('transactions').upsert(tPayload),
            supabase.from('inventory').upsert(iPayload),
            supabase.from('purchases').upsert(pPayload),
            supabase.from('services').upsert(svcPayload)
          ]);
          
          setSyncStatus('SYNCED');
          alert("All local modules (including Services) have been successfully pushed to the Cloud Database.");
      } catch (err: any) {
          console.error("Manual Sync Error:", err);
          setSyncStatus('ERROR');
          setLastSyncError(`Manual push failed: ${err.message}`);
      }
  };

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

  const persist = (key: string, data: any) => { localStorage.setItem(key, JSON.stringify(data)); };

  const initSupabase = async (url: string, key: string) => {
    try {
      setSyncStatus('SYNCING');
      const client = createClient(url, key);
      
      const { error } = await client.from('staff').select('id').limit(1);
      if (error) throw error;
      
      setSupabase(client);
      setIsCloudConnected(true);
      setSyncStatus('SYNCED');
      
      await pullFromCloud(client);
    } catch (err: any) {
      console.error("Initialization failed:", err.message);
      setSyncStatus('ERROR');
      setLastSyncError(err.message);
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
    pushToCloud('jobs', job);
  };

  const updateJob = (job: JobCard) => {
    const updated = jobs.map(j => j.id === job.id ? job : j);
    setJobs(updated);
    persist('erp_jobs', updated);
    pushToCloud('jobs', job);
  };

  const deleteJob = (id: string) => {
    const updated = jobs.filter(j => j.id !== id);
    setJobs(updated);
    persist('erp_jobs', updated);
    removeFromCloud('jobs', id);
  };

  const updateJobStatus = (id: string, status: JobCard['status'], paymentMethod: Transaction['method'] = 'CASH') => {
    const updatedJobs = jobs.map(j => {
      if (j.id === id) {
        if (status === 'INVOICED' && j.status !== 'INVOICED') {
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
          setCustomers(prevCustomers => {
            const updatedCusts = prevCustomers.map(c => {
               if (c.id === j.customerId) {
                 const nc = { ...c, visits: c.visits + 1, lifetimeValue: c.lifetimeValue + j.total };
                 pushToCloud('customers', nc);
                 return nc;
               }
               return c;
            });
            persist('erp_customers', updatedCusts);
            return updatedCusts;
          });
        }
        const updatedJob = { ...j, status };
        pushToCloud('jobs', updatedJob);
        return updatedJob;
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
    pushToCloud('staff', member);
  };

  const removeStaff = (id: string) => {
    const updated = staff.filter(s => s.id !== id);
    setStaff(updated);
    persist('erp_staff', updated);
    removeFromCloud('staff', id);
  };

  const updateStaff = (updatedStaff: Staff) => {
    const updated = staff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaff(updated);
    persist('erp_staff', updated);
    pushToCloud('staff', updatedStaff);
  };

  const addCustomer = (customer: Customer) => {
    const updated = [...customers, customer];
    setCustomers(updated);
    persist('erp_customers', updated);
    pushToCloud('customers', customer);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    const updated = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
    setCustomers(updated);
    persist('erp_customers', updated);
    pushToCloud('customers', updatedCustomer);
  };

  const addPurchase = (purchase: PurchaseOrder) => {
    const updatedPurchases = [...purchases, purchase];
    setPurchases(updatedPurchases);
    persist('erp_purchases', updatedPurchases);
    pushToCloud('purchases', purchase);

    if (purchase.category === 'INVENTORY') {
       const existingItem = inventory.find(i => i.name === purchase.itemName);
       if(existingItem) {
          setInventory(currentInventory => {
             const updatedInv = currentInventory.map(i => {
                if (i.id === existingItem.id) {
                   const ni = { ...i, quantityOnHand: i.quantityOnHand + purchase.quantity, lastRestocked: purchase.date };
                   pushToCloud('inventory', ni);
                   return ni;
                }
                return i;
             });
             persist('erp_inventory', updatedInv);
             return updatedInv;
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

  const bulkAddPurchases = (pos: PurchaseOrder[]) => {
      const updated = [...purchases, ...pos];
      setPurchases(updated);
      persist('erp_purchases', updated);
      pos.forEach(p => pushToCloud('purchases', p));
  };

  const addTransaction = (tx: Transaction) => {
    const newTx = [...transactions, tx];
    setTransactions(newTx);
    persist('erp_transactions', newTx);
    updateLedger([tx]);
    pushToCloud('transactions', tx);
  };

  const bulkAddTransactions = (txs: Transaction[]) => {
    const newTx = [...transactions, ...txs];
    setTransactions(newTx);
    persist('erp_transactions', newTx);
    updateLedger(txs);
    txs.forEach(t => pushToCloud('transactions', t));
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
            if (tx.type === 'INCOME' && acc.code === '4000') return { ...acc, balance: acc.balance + tx.amount };
            if (tx.type === 'EXPENSE') {
               const cat = tx.category.toLowerCase();
               if (acc.code === '1200' && (cat.includes('inventory') || cat.includes('stock'))) return { ...acc, balance: acc.balance + tx.amount };
               else if (acc.code === '5100' && (cat.includes('labor') || cat.includes('payroll') || cat.includes('salary'))) return { ...acc, balance: acc.balance + tx.amount };
               else if (acc.code === '5200' && cat.includes('rent')) return { ...acc, balance: acc.balance + tx.amount };
               else if (acc.code === '5300' && (cat.includes('utility') || cat.includes('power') || cat.includes('water'))) return { ...acc, balance: acc.balance + tx.amount };
               else if (acc.code === '5000' && !cat.includes('labor') && !cat.includes('rent') && !cat.includes('utility') && !cat.includes('inventory')) return { ...acc, balance: acc.balance + tx.amount };
            }
            return acc;
         });
      });
      return updatedAccounts;
    });
  };

  const executePayroll = (month: string, payrollData: any[]) => {
    const totalPayroll = payrollData.reduce((sum, p) => sum + p.netPay, 0);
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
    setStaff(prevStaff => {
        const updatedStaff = prevStaff.map(s => {
            const record = payrollData.find((p: any) => p.id === s.id);
            if (!record || !record.deductionsObj) return s;
            const ns = {
                ...s,
                loanBalance: Math.max(0, s.loanBalance - (record.deductionsObj.loan || 0)),
                currentAdvance: Math.max(0, s.currentAdvance - (record.deductionsObj.advance || 0))
            };
            pushToCloud('staff', ns);
            return ns;
        });
        persist('erp_staff', updatedStaff);
        return updatedStaff;
    });
    const runSnapshot: PayrollRun = {
      id: `pr-${month}-${Date.now()}`,
      month: month,
      dateGenerated: new Date().toISOString(),
      totalAmount: totalPayroll,
      records: payrollData,
      status: 'FINALIZED'
    };
    setPayrollHistory(prev => {
      const updated = [...prev.filter(p => p.month !== month), runSnapshot];
      persist('erp_payroll_history', updated);
      return updated;
    });
  };

  const addInventoryItem = (item: InventoryItem) => {
    const updated = [...inventory, item];
    setInventory(updated);
    persist('erp_inventory', updated);
    pushToCloud('inventory', item);
  };

  const deleteInventoryItem = (id: string) => {
    const updated = inventory.filter(i => i.id !== id);
    setInventory(updated);
    persist('erp_inventory', updated);
    removeFromCloud('inventory', id);
  };

  const recordStockUsage = (itemId: string, quantity: number, notes: string) => {
      setInventory(currentInventory => {
          const updated = currentInventory.map(i => {
              if (i.id === itemId) {
                  const ni = { ...i, quantityOnHand: Math.max(0, (i.quantityOnHand || 0) - quantity) };
                  pushToCloud('inventory', ni);
                  return ni;
              }
              return i;
          });
          persist('erp_inventory', updated);
          return updated;
      });
      setStockLogs(prev => {
          const log = { id: `stx-${Date.now()}`, itemId, date: new Date().toISOString().split('T')[0], type: 'USAGE' as const, quantity, notes };
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
      items.forEach(i => pushToCloud('inventory', i));
  };

  const addService = (service: Service) => {
    const updated = [...services, service];
    setServices(updated);
    persist('erp_services', updated);
    pushToCloud('services', service);
  };

  const updateService = (service: Service) => {
    const updated = services.map(s => s.id === service.id ? service : s);
    setServices(updated);
    persist('erp_services', updated);
    pushToCloud('services', service);
  };

  const deleteService = (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    persist('erp_services', updated);
    removeFromCloud('services', id);
  };

  const bulkAddServices = (newServices: Service[]) => {
    const updated = [...services, ...newServices];
    setServices(updated);
    persist('erp_services', updated);
    newServices.forEach(s => pushToCloud('services', s));
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
      setServices(data.modules.services || []);
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
      isCloudConnected, syncStatus, lastSyncError, connectToCloud, syncAllLocalToCloud,
      addJob, updateJob, deleteJob, updateJobStatus, addStaff, removeStaff, updateStaff, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory,
      addService, updateService, deleteService, bulkAddServices, restoreData, resetToFactory, addCustomer, updateCustomer, addPurchase, addTransaction, bulkAddTransactions, bulkAddPurchases, executePayroll
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
