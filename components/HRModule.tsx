
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { Staff, JobCard, VehicleSegment, Service } from '../types.ts';
import { 
  Users, Clock, Plus, Trash2, X, Mail, Phone, Calendar, CheckCircle2, UserPlus, AlertCircle, Save, DollarSign, Calculator, Briefcase, Zap, Edit2, Wallet, AlertOctagon, Banknote, Printer, Lock, FileCheck, ShieldCheck
} from 'lucide-react';

const isBike = (seg: VehicleSegment) => ['BIKE', 'SCOOTY', 'BULLET'].includes(seg);

type DeductionBreakdown = {
    lateFine: number;
    leaveFine: number;
    advance: number;
    loan: number;
    other: number;
};

export const HRModule: React.FC = () => {
  const { staff, addStaff, removeStaff, executePayroll, jobs, services, logoUrl, payrollHistory } = useERP();
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'PAYROLL'>('MANAGEMENT');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [printingSlip, setPrintingSlip] = useState<any | null>(null);

  // Payroll Config
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Deduction Management
  const [deductionDetails, setDeductionDetails] = useState<Record<string, DeductionBreakdown>>({});
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);

  const [newStaff, setNewStaff] = useState({
    name: '', role: 'Washer', email: '', phone: '', baseSalary: 12000, commissionRate: 0.05
  });

  // Check if this month is already finalized
  const finalizedRun = useMemo(() => {
      return payrollHistory.find(r => r.month === selectedMonth);
  }, [payrollHistory, selectedMonth]);

  const updateDeduction = (id: string, field: keyof DeductionBreakdown, value: string) => {
      if (finalizedRun) return; // Prevent editing finalized deductions
      setDeductionDetails(prev => {
          const current = prev[id] || { lateFine: 0, leaveFine: 0, advance: 0, loan: 0, other: 0 };
          return {
              ...prev,
              [id]: { ...current, [field]: parseFloat(value) || 0 }
          };
      });
  };

  // --- REVISED CALCULATION ENGINE ---
  const livePayrollCalculation = useMemo(() => {
    // 1. Filter Jobs for the Month
    const monthlyJobs = jobs.filter(j => j.date.startsWith(selectedMonth) && j.status === 'INVOICED');
    
    // 2. Initialize Staff Buckets
    const staffStats: Record<string, {
      baseSalary: number,
      dailyLimitIncentive: number, // (1) 9am-6pm >10 limit
      eveningLimitIncentive: number, // (2) 6pm-9pm Per Car/Bike
      eveningProfitShare: number, // (3) 10% of 40% profit 6pm-9pm
      sundayProfitShare: number, // (4) 10% of 40% profit Sunday
      referralComm: number, // (5) 10% of bill
      premiumIncentive: number, // (6) Tiered
      workingBonus: number, // (7) 15+ or 20+ days OT
      washingPoolShare: number, // (8) 60/40 Split of Washing Profit
      eveningDays: Set<string>, // Track unique days worked in evening for Bonus
      jobCount: number,
      revGen: number
    }> = {};

    staff.forEach(s => {
      staffStats[s.id] = {
        baseSalary: s.baseSalary,
        dailyLimitIncentive: 0,
        eveningLimitIncentive: 0,
        eveningProfitShare: 0,
        sundayProfitShare: 0,
        referralComm: 0,
        premiumIncentive: 0,
        workingBonus: 0,
        washingPoolShare: 0,
        eveningDays: new Set(),
        jobCount: 0,
        revGen: 0
      };
    });

    // Helper: Time Checks
    const getHour = (time: string) => parseInt(time?.split(':')[0] || '0');
    const isEvening = (time: string) => getHour(time) >= 18; // 6 PM onwards
    const isNormalHours = (time: string) => getHour(time) >= 9 && getHour(time) < 18; // 9 AM to 6 PM
    const isSunday = (dateStr: string) => new Date(dateStr).getDay() === 0;

    // 3. Process Daily Logic (Iterate by Day)
    // Group jobs by date
    const jobsByDate: Record<string, JobCard[]> = {};
    monthlyJobs.forEach(j => {
      if(!jobsByDate[j.date]) jobsByDate[j.date] = [];
      jobsByDate[j.date].push(j);
    });

    Object.keys(jobsByDate).forEach(date => {
        const dayJobs = jobsByDate[date];
        
        // --- (1) DAILY LIMIT INCENTIVE (9 AM - 6 PM Only) ---
        const normalJobs = dayJobs.filter(j => isNormalHours(j.timeIn));
        let normalCarCount = 0;
        let normalBikeCount = 0;
        const normalStaffIds = new Set<string>();

        normalJobs.forEach(j => {
           if(isBike(j.segment)) normalBikeCount++; else normalCarCount++;
           j.assignedStaffIds.forEach(sid => normalStaffIds.add(sid));
        });

        // Threshold: > 10 Cars or > 10 Bikes
        let dailyPool = 0;
        if (normalCarCount > 10) dailyPool += (normalCarCount - 10) * 25; // ₹25 per extra car
        if (normalBikeCount > 10) dailyPool += (normalBikeCount - 10) * 10; // ₹10 per extra bike

        if (dailyPool > 0 && normalStaffIds.size > 0) {
            const share = dailyPool / normalStaffIds.size;
            normalStaffIds.forEach(sid => {
                if(staffStats[sid]) staffStats[sid].dailyLimitIncentive += share;
            });
        }

        // --- (2) EVENING LIMIT INCENTIVE (6 PM - 9 PM) ---
        // "Every car/bike washed 6-9 is treated as overtime"
        // Rate: 25 per car, 10 per bike. Distributed to evening staff.
        const eveningJobs = dayJobs.filter(j => isEvening(j.timeIn));
        
        if (eveningJobs.length > 0) {
            let eveningPieceRatePool = 0;
            const eveningStaffIds = new Set<string>();
            let eveningRevenue = 0;

            eveningJobs.forEach(j => {
                if(isBike(j.segment)) eveningPieceRatePool += 10; else eveningPieceRatePool += 25;
                eveningRevenue += j.total;
                j.assignedStaffIds.forEach(sid => {
                    eveningStaffIds.add(sid);
                    if(staffStats[sid]) staffStats[sid].eveningDays.add(date); // Track OT day for Bonus
                });
            });

            if (eveningStaffIds.size > 0) {
                // Distribute Piece Rate (Rule 2)
                const pieceShare = eveningPieceRatePool / eveningStaffIds.size;
                eveningStaffIds.forEach(sid => {
                    if(staffStats[sid]) staffStats[sid].eveningLimitIncentive += pieceShare;
                });

                // Distribute Evening Profit Share (Rule 3)
                // "10% of our profit (40% of bill) distributed equally"
                const eveningProfit = eveningRevenue * 0.40;
                const profitSharePool = eveningProfit * 0.10;
                const profitShare = profitSharePool / eveningStaffIds.size;
                
                eveningStaffIds.forEach(sid => {
                    if(staffStats[sid]) staffStats[sid].eveningProfitShare += profitShare;
                });
            }
        }

        // --- (4) SUNDAY OT INCENTIVE ---
        if (isSunday(date)) {
            const sundayRevenue = dayJobs.reduce((sum, j) => sum + j.total, 0);
            // "10% of total profit (40% of bill)"
            const sundayProfit = sundayRevenue * 0.40;
            const sundayPool = sundayProfit * 0.10;
            
            const sundayStaffIds = new Set<string>();
            dayJobs.forEach(j => j.assignedStaffIds.forEach(sid => sundayStaffIds.add(sid)));
            
            if (sundayStaffIds.size > 0) {
                const share = sundayPool / sundayStaffIds.size;
                sundayStaffIds.forEach(sid => {
                    if(staffStats[sid]) staffStats[sid].sundayProfitShare += share;
                });
            }
        }
    });

    // 4. Job-Level Incentives (Referral & Premium)
    monthlyJobs.forEach(j => {
        // (5) Referral Commission: 10% of referred job
        if (j.referredBy && staffStats[j.referredBy]) {
            staffStats[j.referredBy].referralComm += j.total * 0.10;
        }

        // (6) Premium Jobs Incentive
        const jobServices = services.filter(s => j.serviceIds.includes(s.id));
        const isPolishing = jobServices.some(s => s.name.toLowerCase().includes('polish') || s.sku.includes('POL'));
        const isCeramicGraph = jobServices.some(s => s.name.toLowerCase().includes('ceramic') || s.name.toLowerCase().includes('graphene'));

        let premiumAmt = 0;

        if (isCeramicGraph) {
            // "4000 for below 30k jobs, 6000 for above 30k jobs"
            if (j.total >= 30000) premiumAmt = 6000;
            else premiumAmt = 4000;
        } else if (isPolishing) {
            // "200 for job under 2000, 400 for 2500 and above, 600 for 6000 and above"
            if (j.total >= 6000) premiumAmt = 600;
            else if (j.total >= 2500) premiumAmt = 400;
            else if (j.total < 2000) premiumAmt = 200;
            else premiumAmt = 200; // Gap case 2000-2499, defaulting to lower tier or could be 400. Keeping conservative.
        }

        if (premiumAmt > 0 && j.assignedStaffIds.length > 0) {
            const share = premiumAmt / j.assignedStaffIds.length;
            j.assignedStaffIds.forEach(sid => {
                if (staffStats[sid]) staffStats[sid].premiumIncentive += share;
            });
        }
    });

    // 5. Monthly Aggregates (OT Bonus & Washing Pool)
    
    // (7) OT Bonus
    staff.forEach(s => {
        const shifts = staffStats[s.id].eveningDays.size;
        // "1500 for 15+ days, 2000 for 20+ days"
        if (shifts >= 20) staffStats[s.id].workingBonus = 2000;
        else if (shifts >= 15) staffStats[s.id].workingBonus = 1500;
    });

    // (8) Washing Pool
    // "10% of Washing Profit (40% of Total Washing Amount). Split 60% Washer / 40% Detailer"
    const washingJobs = monthlyJobs.filter(j => {
        return services.some(s => j.serviceIds.includes(s.id) && s.category === 'WASHING');
    });
    const washingRevenue = washingJobs.reduce((sum, j) => sum + j.total, 0);
    
    const washingProfit = washingRevenue * 0.40;
    const washingPoolTotal = washingProfit * 0.10;

    const washerPool = washingPoolTotal * 0.60;
    const detailerPool = washingPoolTotal * 0.40; // Cleaning Staff

    const washers = staff.filter(s => s.role === 'Washer');
    const cleaners = staff.filter(s => s.role === 'Detailer');

    if (washers.length > 0) {
        const share = washerPool / washers.length;
        washers.forEach(s => staffStats[s.id].washingPoolShare += share);
    }
    if (cleaners.length > 0) {
        const share = detailerPool / cleaners.length;
        cleaners.forEach(s => staffStats[s.id].washingPoolShare += share);
    }

    // 6. Final Data Shaping
    return staff.map(st => {
        const stats = staffStats[st.id];
        // Combine Evening Limit + Evening Profit into one "Evening OT" sum for easier display if needed, or keep separate
        const totalEvening = stats.eveningLimitIncentive + stats.eveningProfitShare;
        
        const grossIncentives = stats.dailyLimitIncentive + totalEvening + stats.sundayProfitShare + stats.premiumIncentive + stats.referralComm + stats.washingPoolShare + stats.workingBonus;
        const grossPay = stats.baseSalary + grossIncentives;
        
        const deds = deductionDetails[st.id] || { lateFine: 0, leaveFine: 0, advance: 0, loan: 0, other: 0 };
        const totalDeduction = deds.lateFine + deds.leaveFine + deds.advance + deds.loan + deds.other;
        const netPay = grossPay - totalDeduction;

        return {
            ...st,
            ...stats,
            totalEvening,
            grossIncentives,
            grossPay,
            deductionsObj: deds,
            totalDeduction,
            netPay
        };
    });
  }, [staff, jobs, services, selectedMonth, deductionDetails]);

  // Determine which data to show: Snapshot (Frozen) or Live (Draft)
  const displayData = finalizedRun ? finalizedRun.records : livePayrollCalculation;

  const totals = useMemo(() => {
     return displayData.reduce((acc: any, curr: any) => ({
         base: acc.base + curr.baseSalary,
         incentive: acc.incentive + curr.grossIncentives,
         deductions: acc.deductions + curr.totalDeduction,
         net: acc.net + curr.netPay
     }), { base: 0, incentive: 0, deductions: 0, net: 0 });
  }, [displayData]);

  const handleExecute = () => {
      if (finalizedRun) return; // Safety check
      // Assurance Prompt
      if (window.confirm(`CONFIRM PAYROLL LOCK:\n\n1. This will disburse ₹${totals.net.toLocaleString()} to expenses.\n2. A PERMANENT SNAPSHOT will be created.\n3. Future changes to OT rates/Commission logic will NOT affect this record.\n\nAre you sure you want to finalize?`)) {
          setIsProcessing(true);
          setTimeout(() => {
            executePayroll(selectedMonth, displayData);
            setIsProcessing(false);
            alert("✅ Payroll Finalized! Historical data is now safe.");
          }, 1500);
      }
  };

  const printSlip = (staffData: any) => {
      setPrintingSlip(staffData);
      setTimeout(() => {
          document.body.classList.add('printing-invoice');
          window.print();
          document.body.classList.remove('printing-invoice');
          setPrintingSlip(null);
      }, 300);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const member: Staff = {
      id: `st-${Date.now()}`,
      ...newStaff,
      active: true,
      joinedDate: new Date().toISOString().split('T')[0],
      currentAdvance: 0,
      loanBalance: 0,
      role: newStaff.role as any
    };
    addStaff(member);
    setIsAddModalOpen(false);
    setNewStaff({ name: '', role: 'Washer', email: '', phone: '', baseSalary: 12000, commissionRate: 0.05 });
  };

  const editingStaff = editingDeductionId ? staff.find(s => s.id === editingDeductionId) : null;
  const currentDeds = editingDeductionId ? (deductionDetails[editingDeductionId] || { lateFine: 0, leaveFine: 0, advance: 0, loan: 0, other: 0 }) : null;

  const SalarySlipTemplate = ({ data }: { data: any }) => (
      createPortal(
        <div className="invoice-container-print bg-white p-12 font-sans text-black">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div className="flex items-center gap-6">
                    <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded" />
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Auto Dazzle</h1>
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Detailing Spa</p>
                        <p className="text-xs text-slate-500 mt-1">Official Salary Slip</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Payslip</h2>
                    <p className="text-sm font-bold text-slate-600 uppercase">{new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Employee Info */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Employee Name</p>
                        <p className="text-lg font-black text-slate-900">{data.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Designation</p>
                        <p className="text-lg font-bold text-slate-700">{data.role}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</p>
                        <p className="text-sm font-bold text-slate-700 font-mono">{data.id}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                        <p className="text-sm font-bold text-slate-700">{data.phone}</p>
                    </div>
                </div>
            </div>

            {/* Earnings & Deductions Table */}
            <div className="flex gap-8 mb-8">
                {/* Earnings */}
                <div className="flex-1">
                    <div className="bg-slate-900 text-white p-2 text-xs font-bold uppercase tracking-widest text-center mb-0">Earnings</div>
                    <table className="w-full text-sm border-l border-r border-b border-slate-200">
                        <tbody className="divide-y divide-slate-100">
                            <tr className="bg-slate-50">
                                <td className="p-3 font-bold text-slate-600">Basic Salary</td>
                                <td className="p-3 text-right font-black text-slate-900">₹{data.baseSalary.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Daily Limit (9-6)</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.dailyLimitIncentive.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Evening OT (Limit + Profit)</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.totalEvening.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Sunday Profit Share</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.sundayProfitShare.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Premium / Job</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.premiumIncentive.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Washing Pool</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.washingPoolShare.toLocaleString()}</td>
                            </tr>
                             <tr>
                                <td className="p-3 text-slate-600">Referral Comm.</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.referralComm.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Monthly Shift Bonus</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{data.workingBonus.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-green-50 border-t-2 border-green-100">
                                <td className="p-3 font-black text-green-800 uppercase text-xs">Gross Earnings</td>
                                <td className="p-3 text-right font-black text-green-700">₹{data.grossPay.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Deductions */}
                <div className="flex-1">
                    <div className="bg-slate-900 text-white p-2 text-xs font-bold uppercase tracking-widest text-center mb-0">Deductions</div>
                    <table className="w-full text-sm border-l border-r border-b border-slate-200">
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="p-3 text-slate-600">Late Fine</td>
                                <td className="p-3 text-right font-bold text-red-600">₹{data.deductionsObj.lateFine.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Leave Fine</td>
                                <td className="p-3 text-right font-bold text-red-600">₹{data.deductionsObj.leaveFine.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Advance Recovery</td>
                                <td className="p-3 text-right font-bold text-red-600">₹{data.deductionsObj.advance.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Loan EMI</td>
                                <td className="p-3 text-right font-bold text-red-600">₹{data.deductionsObj.loan.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-600">Other Deductions</td>
                                <td className="p-3 text-right font-bold text-red-600">₹{data.deductionsObj.other.toLocaleString()}</td>
                            </tr>
                            {/* Filler rows to match height if needed, kept simple for now */}
                             <tr><td colSpan={2} className="p-3 text-transparent">.</td></tr>
                             <tr><td colSpan={2} className="p-3 text-transparent">.</td></tr>
                             <tr><td colSpan={2} className="p-3 text-transparent">.</td></tr>

                            <tr className="bg-red-50 border-t-2 border-red-100">
                                <td className="p-3 font-black text-red-800 uppercase text-xs">Total Deductions</td>
                                <td className="p-3 text-right font-black text-red-700">₹{data.totalDeduction.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Net Pay */}
            <div className="border-t-2 border-b-2 border-slate-900 py-6 mb-12 flex justify-between items-center">
                <span className="text-xl font-black uppercase tracking-widest">Net Payable Salary</span>
                <span className="text-4xl font-black">₹{data.netPay.toLocaleString()}</span>
            </div>

            {/* Footer */}
            <div className="flex justify-between mt-20 pt-8">
                <div className="text-center w-48">
                    <div className="border-b border-slate-300 mb-2"></div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Employer Signature</p>
                </div>
                <div className="text-center w-48">
                    <div className="border-b border-slate-300 mb-2"></div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Employee Signature</p>
                </div>
            </div>
            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Generated via Auto Dazzle ERP • Confidential</p>
            </div>
        </div>,
        document.body
      )
  );

  return (
    <div className="space-y-6">
      {printingSlip && <SalarySlipTemplate data={printingSlip} />}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Staff & Payroll</h2>
          <p className="text-xs text-slate-500 font-medium">HR Management</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('MANAGEMENT')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'MANAGEMENT' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Staff List</button>
           <button onClick={() => setActiveTab('PAYROLL')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'PAYROLL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Payroll Run</button>
        </div>
      </div>

      {activeTab === 'MANAGEMENT' && (
        <div className="space-y-4">
          <div className="flex justify-end">
             <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 hover:bg-red-700 shadow-sm">
                <UserPlus size={16} /> Add Staff
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(member => (
              <div key={member.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
                 <button onClick={() => removeStaff(member.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700">{member.name.charAt(0)}</div>
                    <div>
                       <h4 className="text-lg font-bold text-slate-800">{member.name}</h4>
                       <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${member.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{member.role}</span>
                    </div>
                 </div>
                 <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Mail size={12}/> {member.email}</div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Phone size={12}/> {member.phone}</div>
                 </div>
                 <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Base Salary</p>
                       <p className="text-sm font-black text-slate-800">₹{member.baseSalary.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Joined</p>
                       <p className="text-sm font-black text-slate-600">{member.joinedDate}</p>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
            <div className={`p-4 rounded-lg border flex flex-col md:flex-row gap-6 items-center ${finalizedRun ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${finalizedRun ? 'bg-green-200 text-green-700' : 'bg-blue-100 text-blue-600'}`}>
                        {finalizedRun ? <FileCheck size={20}/> : <Calendar size={20}/>}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Payroll Period</label>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border border-slate-300 rounded text-sm font-bold p-1 text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    {finalizedRun ? (
                        <div className="group relative inline-block">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 text-green-800 border border-green-200 cursor-help">
                                <ShieldCheck size={14}/>
                                <span className="text-xs font-black uppercase">Snapshot Secured</span>
                            </div>
                            <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                This payroll run is frozen in time. Any future changes to incentive logic, staff salaries, or OT rules will NOT alter these numbers.
                            </div>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock size={14}/>
                            <span className="text-xs font-black uppercase">Draft Preview</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 text-right">
                    {finalizedRun ? (
                        <button disabled className="px-6 py-3 rounded-lg text-xs font-black uppercase shadow-none bg-slate-200 text-slate-400 cursor-not-allowed">
                            Disbursed
                        </button>
                    ) : (
                        <button 
                            onClick={handleExecute} 
                            disabled={isProcessing} 
                            className="px-6 py-3 rounded-lg text-xs font-black uppercase transition-all shadow-lg bg-green-600 text-white hover:bg-green-700"
                        >
                            {isProcessing ? 'Saving Snapshot...' : 'Finalize & Disburse'}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-900 text-white border-b border-slate-800 font-bold text-[10px] uppercase">
                        <tr>
                        <th className="px-4 py-4 min-w-[150px]">Employee</th>
                        <th className="px-4 py-4 text-right">Base Salary</th>
                        <th className="px-4 py-4 text-right bg-blue-900">Daily (9-6)</th>
                        <th className="px-4 py-4 text-right bg-blue-900">Evening OT</th>
                        <th className="px-4 py-4 text-right bg-blue-900">Sunday</th>
                        <th className="px-4 py-4 text-right bg-purple-900">Premium</th>
                        <th className="px-4 py-4 text-right bg-purple-900">Referral</th>
                        <th className="px-4 py-4 text-right bg-purple-900">Washing</th>
                        <th className="px-4 py-4 text-right bg-emerald-900">Shift Bonus</th>
                        <th className="px-4 py-4 text-right">Total Inc.</th>
                        <th className="px-4 py-4 text-right text-red-300">Deductions</th>
                        <th className="px-4 py-4 text-right bg-slate-800">Net Payable</th>
                        <th className="px-4 py-4 text-center">Slip</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {displayData.map(st => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{st.name}</div>
                                <div className="text-[9px] text-slate-400 font-normal uppercase">{st.role}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">₹{st.baseSalary.toLocaleString()}</td>
                            
                            {/* Detailed Incentive Breakdown */}
                            <td className="px-4 py-3 text-right text-xs bg-blue-50/30">₹{st.dailyLimitIncentive.toFixed(0)}</td>
                            
                            {/* Evening OT Combo */}
                            <td className="px-4 py-3 text-right text-xs bg-blue-50/30">
                                <div className="font-bold">₹{st.totalEvening.toFixed(0)}</div>
                                {/* Use optional chaining for Set access in finalized records which might be serialized to array */}
                                <div className="text-[9px] text-slate-400">{st.eveningDays instanceof Set ? st.eveningDays.size : (Array.isArray(st.eveningDays) ? st.eveningDays.length : 0)} Shifts</div>
                            </td>
                            
                            <td className="px-4 py-3 text-right text-xs bg-blue-50/30">₹{st.sundayProfitShare.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right text-xs bg-purple-50/30">₹{st.premiumIncentive.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right text-xs bg-purple-50/30">₹{st.referralComm.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right text-xs bg-purple-50/30">₹{st.washingPoolShare.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right text-xs bg-emerald-50/30 font-bold text-emerald-600">₹{st.workingBonus.toFixed(0)}</td>
                            
                            {/* Totals */}
                            <td className="px-4 py-3 text-right font-bold text-blue-600 bg-slate-50">₹{st.grossIncentives.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            
                            <td className="px-4 py-3 text-right">
                                <button 
                                    onClick={() => setEditingDeductionId(st.id)}
                                    disabled={!!finalizedRun}
                                    className={`flex items-center justify-end gap-2 w-full transition-colors ${finalizedRun ? 'text-slate-400 cursor-default' : 'text-red-600 hover:text-red-800'}`}
                                >
                                    <span className="font-bold text-sm">₹{st.totalDeduction.toLocaleString()}</span>
                                    {!finalizedRun && <Edit2 size={12} className="opacity-50"/>}
                                    {finalizedRun && <Lock size={10} className="opacity-50"/>}
                                </button>
                            </td>

                            <td className="px-4 py-3 text-right bg-slate-50 border-l border-slate-200">
                                <span className="font-black text-slate-900 text-base">₹{st.netPay.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            </td>

                            <td className="px-4 py-3 text-center">
                                <button 
                                    onClick={() => printSlip(st)}
                                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-all"
                                    title="Print Salary Slip"
                                >
                                    <Printer size={16}/>
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                        <tr>
                            <td className="px-4 py-3 font-black text-xs uppercase text-slate-600">Totals</td>
                            <td className="px-4 py-3 text-right font-bold text-xs">₹{totals.base.toLocaleString()}</td>
                            <td colSpan={7} className="text-center text-[10px] text-slate-400 uppercase tracking-widest">Incentive Distribution</td>
                            <td className="px-4 py-3 text-right font-bold text-xs text-blue-600">₹{totals.incentive.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            <td className="px-4 py-3 text-right font-bold text-xs text-red-600">₹{totals.deductions.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            <td className="px-4 py-3 text-right font-black text-base text-slate-900">₹{totals.net.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                    </table>
                </div>
            </div>
        </div>
      )}

      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden text-black">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-black uppercase">Add New Staff</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddStaff} className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                    <input required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold focus:border-blue-500 outline-none text-black bg-white" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Job Role</label>
                       <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:border-blue-500 outline-none text-black">
                          <option>Washer</option><option>Detailer</option><option>Master Detailer</option><option>Ops Manager</option><option>Admin</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Base Salary (₹)</label>
                       <input type="number" value={newStaff.baseSalary} onChange={e => setNewStaff({...newStaff, baseSalary: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold focus:border-blue-500 outline-none text-black bg-white" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
                       <input type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 outline-none text-black bg-white" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Phone</label>
                       <input type="tel" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 outline-none text-black bg-white" />
                    </div>
                 </div>
                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 text-slate-600 font-bold border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="flex-[2] py-2 bg-slate-900 text-white font-bold uppercase rounded hover:bg-black shadow-lg">Confirm Add</button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}

      {/* Deduction Management Modal */}
      {editingDeductionId && editingStaff && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden text-black animate-fade-in-up">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                      <div>
                          <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                             <Wallet size={18} className="text-red-600"/> Deduction Manager
                          </h3>
                          <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Staff: {editingStaff.name}</p>
                      </div>
                      <button onClick={() => setEditingDeductionId(null)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {finalizedRun && (
                          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-xs font-bold flex items-center gap-2">
                              <Lock size={14}/> This payroll is FINALIZED. Deductions cannot be edited.
                          </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-orange-50 p-3 rounded border border-orange-100">
                             <span className="text-[10px] font-bold text-orange-600 uppercase block mb-1">Current Advance Bal.</span>
                             <span className="text-lg font-black text-slate-800">₹{editingStaff.currentAdvance.toLocaleString()}</span>
                         </div>
                         <div className="bg-blue-50 p-3 rounded border border-blue-100">
                             <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Active Loan Bal.</span>
                             <span className="text-lg font-black text-slate-800">₹{editingStaff.loanBalance.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 flex items-center gap-1"><AlertCircle size={10}/> Late Fine</label>
                                  <input 
                                    type="number" 
                                    disabled={!!finalizedRun}
                                    value={currentDeds?.lateFine || ''} 
                                    onChange={e => updateDeduction(editingDeductionId, 'lateFine', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black outline-none focus:border-red-500 bg-white disabled:bg-slate-100"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 flex items-center gap-1"><AlertOctagon size={10}/> Leave Fine</label>
                                  <input 
                                    type="number" 
                                    disabled={!!finalizedRun}
                                    value={currentDeds?.leaveFine || ''} 
                                    onChange={e => updateDeduction(editingDeductionId, 'leaveFine', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black outline-none focus:border-red-500 bg-white disabled:bg-slate-100"
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 flex items-center gap-1"><Banknote size={10}/> Advance Recovery</label>
                                  <input 
                                    type="number" 
                                    disabled={!!finalizedRun}
                                    max={editingStaff.currentAdvance}
                                    value={currentDeds?.advance || ''} 
                                    onChange={e => updateDeduction(editingDeductionId, 'advance', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black outline-none focus:border-red-500 bg-white disabled:bg-slate-100"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 flex items-center gap-1"><Calculator size={10}/> Loan EMI</label>
                                  <input 
                                    type="number" 
                                    disabled={!!finalizedRun}
                                    max={editingStaff.loanBalance}
                                    value={currentDeds?.loan || ''} 
                                    onChange={e => updateDeduction(editingDeductionId, 'loan', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black outline-none focus:border-red-500 bg-white disabled:bg-slate-100"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Other Deductions</label>
                              <input 
                                type="number" 
                                disabled={!!finalizedRun}
                                value={currentDeds?.other || ''} 
                                onChange={e => updateDeduction(editingDeductionId, 'other', e.target.value)}
                                placeholder="0"
                                className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black outline-none focus:border-red-500 bg-white disabled:bg-slate-100"
                              />
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-red-50 p-4 rounded-lg">
                          <span className="text-xs font-black text-red-800 uppercase">Total Deductions</span>
                          <span className="text-2xl font-black text-red-600">
                              ₹{currentDeds ? (currentDeds.lateFine + currentDeds.leaveFine + currentDeds.advance + currentDeds.loan + currentDeds.other).toLocaleString() : 0}
                          </span>
                      </div>
                      
                      <button onClick={() => setEditingDeductionId(null)} className="w-full py-3 bg-slate-900 text-white font-bold uppercase rounded shadow-lg hover:bg-black">
                          {finalizedRun ? 'Close View' : 'Save & Close'}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
