
import { LedgerAccount, AccountType, Service, Customer, InventoryItem, Staff, JobCard, PurchaseOrder, Lead, AttendanceRecord, Appointment, Transaction } from './types';

// UPDATED LOGO URL - Uses a reliable placeholder service with your Brand Colors (Black #000000 & Gold #F59E0B)
export const LOGO_URL = 'https://placehold.co/400x400/000000/F59E0B.png?text=AD&font=playfair'; 

export const MOCK_ACCOUNTS: LedgerAccount[] = [
  { id: '1', code: '1000', name: 'Cash on Hand', type: AccountType.ASSET, balance: 0 },
  { id: '2', code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET, balance: 0 },
  { id: '3', code: '1200', name: 'Inventory Asset', type: AccountType.ASSET, balance: 0 },
  { id: '4', code: '1500', name: 'Equipment', type: AccountType.ASSET, balance: 0 },
  { id: '5', code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, balance: 0 },
  { id: '6', code: '3000', name: 'Owner\'s Capital', type: AccountType.EQUITY, balance: 0 },
  { id: '7', code: '4000', name: 'Service Revenue', type: AccountType.REVENUE, balance: 0 },
  { id: '8', code: '5000', name: 'Chemical Expense', type: AccountType.EXPENSE, balance: 0 },
  { id: '9', code: '5100', name: 'Labor Expense', type: AccountType.EXPENSE, balance: 0 },
  { id: '10', code: '5200', name: 'Rent Expense', type: AccountType.EXPENSE, balance: 0 },
  { id: '11', code: '5300', name: 'Utilities', type: AccountType.EXPENSE, balance: 0 },
];

export const MOCK_SERVICES: Service[] = [];
export const MOCK_STAFF: Staff[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];
export const MOCK_INVENTORY: InventoryItem[] = [];
export const MOCK_JOB_CARDS: JobCard[] = [];
export const MOCK_PURCHASES: PurchaseOrder[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_LEADS: Lead[] = [];
export const MOCK_APPOINTMENTS: Appointment[] = [];
export const MOCK_ATTENDANCE: AttendanceRecord[] = [];
