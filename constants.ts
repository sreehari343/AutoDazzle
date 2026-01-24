import { LedgerAccount, AccountType, Service, Customer, InventoryItem, Staff, JobCard, PurchaseOrder, Lead, AttendanceRecord, Appointment, Transaction } from './types';

export const LOGO_URL = 'https://placehold.co/400x400/000000/F59E0B.png?text=AD&font=playfair'; 

export const MOCK_ACCOUNTS: LedgerAccount[] = [
  // 1XXX - ASSETS
  { id: '1', code: '1000', name: 'Cash on Hand', type: AccountType.ASSET, balance: 0 },
  { id: '2', code: '1010', name: 'Bank Account', type: AccountType.ASSET, balance: 0 },
  { id: '3', code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET, balance: 0 },
  { id: '4', code: '1200', name: 'Inventory Asset', type: AccountType.ASSET, balance: 0 },
  { id: '5', code: '1300', name: 'Furniture & Fixtures', type: AccountType.ASSET, balance: 0 },
  { id: '6', code: '1400', name: 'Car Wash Equipment', type: AccountType.ASSET, balance: 0 },
  { id: '7', code: '1500', name: 'Land & Leasehold', type: AccountType.ASSET, balance: 0 },
  { id: '8', code: '1600', name: 'Deposits & Advances', type: AccountType.ASSET, balance: 0 },
  
  // 2XXX - LIABILITIES
  { id: '9', code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, balance: 0 },
  { id: '10', code: '2100', name: 'Bank Loan (PMEGP)', type: AccountType.LIABILITY, balance: 0 },
  
  // 3XXX - EQUITY
  { id: '11', code: '3000', name: 'Owner\'s Capital', type: AccountType.EQUITY, balance: 0 },
  
  // 4XXX - REVENUE
  { id: '12', code: '4000', name: 'Washing Revenue', type: AccountType.REVENUE, balance: 0 },
  { id: '13', code: '4100', name: 'Wax & Polish Revenue', type: AccountType.REVENUE, balance: 0 },
  { id: '14', code: '4200', name: 'Detailing Revenue', type: AccountType.REVENUE, balance: 0 },
  
  // 5XXX - EXPENSES
  { id: '15', code: '5000', name: 'Chemicals & Consumables', type: AccountType.EXPENSE, balance: 0 },
  { id: '16', code: '5100', name: 'Labor & Salaries', type: AccountType.EXPENSE, balance: 0 },
  { id: '17', code: '5200', name: 'Rent & Lease', type: AccountType.EXPENSE, balance: 0 },
  { id: '18', code: '5300', name: 'Water & Electricity', type: AccountType.EXPENSE, balance: 0 },
  { id: '19', code: '5400', name: 'Legal & Professional', type: AccountType.EXPENSE, balance: 0 },
  { id: '20', code: '5500', name: 'Staff Welfare', type: AccountType.EXPENSE, balance: 0 },
  { id: '21', code: '5600', name: 'Office Stationery', type: AccountType.EXPENSE, balance: 0 },
  { id: '22', code: '5700', name: 'Transportation Charges', type: AccountType.EXPENSE, balance: 0 },
  { id: '23', code: '5800', name: 'Loan Interest Expense', type: AccountType.EXPENSE, balance: 0 },
  { id: '24', code: '5900', name: 'Miscellaneous Expenses', type: AccountType.EXPENSE, balance: 0 },
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
