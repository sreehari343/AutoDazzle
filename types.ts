
// Financials (GAAP)
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface JournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string; 
  amount: number;
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'UPI';
  referenceId?: string; 
  description: string;
}

// Operations & Pricing
export type VehicleSegment = 'HATCHBACK' | 'SEDAN' | 'SUV_MUV' | 'LUXURY' | 'AUTORICKSHAW' | 'AUTOTAXI' | 'PICKUP_SMALL' | 'PICKUP_LARGE' | 'BIKE' | 'SCOOTY' | 'BULLET';

export interface Service {
  id: string;
  sku: string;
  name: string;
  basePrice: number; // Base reference price
  prices: Record<VehicleSegment, number>; // Segment specific pricing
  durationMinutes: number;
  category: 'WASHING' | 'DETAILING' | 'PACKAGES' | 'ADDONS';
}

export interface Staff {
  id: string;
  name: string;
  role: 'Master Detailer' | 'Detailer' | 'Washer' | 'Ops Manager' | 'Admin';
  email: string;
  phone: string;
  commissionRate: number; 
  baseSalary: number;
  active: boolean;
  joinedDate: string;
  // Financial Tracking
  currentAdvance: number;
  loanBalance: number;
}

export interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  dateGenerated: string;
  totalAmount: number;
  records: any[]; // Stores the full calculated snapshot of that month
  status: 'FINALIZED';
}

export interface PayrollRecord {
  staffId: string;
  staffName: string;
  baseSalary: number;
  otHours: number;
  otAmount: number;
  incentives: number;
  commission: number;
  // Deductions
  advanceDeduction: number;
  loanEmi: number;
  lateFine: number;
  leaveFine: number;
  // Totals
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

export type JobStatus = 'RECEIVED' | 'IN_PROGRESS' | 'QC_CHECK' | 'READY' | 'INVOICED';

export interface JobCard {
  id: string;
  ticketNumber: string;
  date: string;
  timeIn: string; // Added for OT calc
  customerId: string;
  vehicleId: string; // ID or "New"
  vehicleDetails?: Vehicle; // For display/receipt
  segment: VehicleSegment;
  serviceIds: string[];
  assignedStaffIds: string[];
  referredBy?: string; // Staff ID for referral commission 
  status: JobStatus;
  subtotal: number;
  tax: number;
  total: number;
  taxInclusive?: boolean;
  taxEnabled?: boolean; // NEW: Master switch for tax
  notes: string;
  postedToGL: boolean;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
}

// CRM
export type PremiumTier = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  segment: VehicleSegment;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string; // Added Address
  lifetimeValue: number;
  joinedDate: string;
  outstandingBalance: number;
  isPremium: boolean;
  premiumTier: PremiumTier; 
  visits: number;
  vehicles: Vehicle[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  interest: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST';
  followUpDate: string;
  notes: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  date: string;
  time: string;
  serviceIds: string[];
  notes: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
}

// Inventory
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'CHEMICALS' | 'COMPOUNDS' | 'TOOLS' | 'CONSUMABLES';
  unit: string;
  quantityOnHand: number;
  reorderPoint: number;
  costPerUnit: number;
  supplier: string;
  lastRestocked?: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  date: string;
  type: 'USAGE' | 'RESTOCK' | 'ADJUSTMENT';
  quantity: number;
  notes: string;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  docNumber: string;
  vendorName: string;
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  status: 'PENDING' | 'RECEIVED' | 'PAID';
  category: 'INVENTORY' | 'GENERAL_EXPENSE' | 'ASSET';
}

// Shared
export type ViewState = 'DASHBOARD' | 'FINANCIALS' | 'OPERATIONS' | 'MIGRATION' | 'SALES' | 'PURCHASE' | 'HR' | 'REPORTS' | 'CRM' | 'INVENTORY';

export type UserRole = 'SUPER_ADMIN' | 'STAFF';

export interface AIAnalysisResult {
  proposedSchema: string;
  migrationPlan: string;
  dataIntegrityNotes: string;
}
