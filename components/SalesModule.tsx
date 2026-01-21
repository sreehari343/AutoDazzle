
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { JobStatus, JobCard, VehicleSegment, Transaction } from '../types.ts';
import { INDIAN_VEHICLE_DB, VehicleModel } from '../data/vehicleDb.ts';
import { Plus, Car, Play, ClipboardList, X, User, Users, Settings, Info, ArrowRight, Printer, CheckCircle, Trash2, CreditCard, Banknote, Smartphone, History, Filter, Calendar, Edit, Lock, Clock, UserPlus } from 'lucide-react';

export const SalesModule: React.FC = () => {
  const { jobs, customers, services, staff, addJob, updateJob, deleteJob, updateJobStatus, currentUserRole, logoUrl } = useERP();
  const [viewMode, setViewMode] = useState<'QUEUE' | 'HISTORY'>('QUEUE');
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [jobForPayment, setJobForPayment] = useState<JobCard | null>(null);
  const [printingJob, setPrintingJob] = useState<JobCard | null>(null);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<VehicleSegment>('HATCHBACK');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [workNotes, setWorkNotes] = useState('');
  const [timeIn, setTimeIn] = useState('09:00');
  const [referredBy, setReferredBy] = useState('');
  
  // Tax Config State - Now Persisted
  const [isTaxEnabled, setIsTaxEnabled] = useState(() => {
    return localStorage.getItem('erp_pref_tax_enabled') === 'true';
  });
  const [isTaxInclusive, setIsTaxInclusive] = useState(() => {
    const saved = localStorage.getItem('erp_pref_tax_inclusive');
    return saved !== null ? saved === 'true' : true; 
  });

  // Persist Tax Preferences
  useEffect(() => {
    localStorage.setItem('erp_pref_tax_enabled', String(isTaxEnabled));
  }, [isTaxEnabled]);

  useEffect(() => {
    localStorage.setItem('erp_pref_tax_inclusive', String(isTaxInclusive));
  }, [isTaxInclusive]);

  // Vehicle Autocomplete State
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);

  const [tempServiceId, setTempServiceId] = useState(''); 
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]); 

  const [paymentMethod, setPaymentMethod] = useState<Transaction['method']>('CASH');

  // Calculation Logic
  const addedServicesList = services.filter(s => addedServiceIds.includes(s.id));
  const rawTotal = addedServicesList.reduce((sum, s) => sum + (s.prices[selectedSegment] || s.basePrice), 0);

  let subtotal = 0;
  let tax = 0;
  let total = 0;

  if (!isTaxEnabled) {
      // No Tax Mode
      subtotal = rawTotal;
      tax = 0;
      total = rawTotal;
  } else if (isTaxInclusive) {
      // Inclusive Mode
      total = rawTotal;
      subtotal = total / 1.18;
      tax = total - subtotal;
  } else {
      // Exclusive Mode
      subtotal = rawTotal;
      tax = subtotal * 0.18;
      total = subtotal + tax;
  }

  const activeJobs = jobs.filter(j => j.status !== 'INVOICED');
  const historyJobs = jobs
    .filter(j => j.status === 'INVOICED')
    .filter(j => j.date.startsWith(historyMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const canEdit = currentUserRole !== 'STAFF';

  const filteredVehicles = INDIAN_VEHICLE_DB.filter(v => 
    v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) || 
    v.brand.toLowerCase().includes(vehicleSearch.toLowerCase())
  ).slice(0, 5);

  const handleSelectVehicle = (v: VehicleModel) => {
    setVehicleSearch(`${v.brand} ${v.model}`);
    setSelectedSegment(v.segment);
    setShowVehicleSuggestions(false);
  };

  const handleAddService = () => {
      if (tempServiceId && !addedServiceIds.includes(tempServiceId)) {
          setAddedServiceIds([...addedServiceIds, tempServiceId]);
          setTempServiceId('');
      }
  };

  const handleRemoveService = (id: string) => {
      setAddedServiceIds(addedServiceIds.filter(sid => sid !== id));
  };

  const openNewJob = () => {
      setEditingJobId(null);
      resetForm();
      setIsJobModalOpen(true);
  };

  const openEditJob = (job: JobCard) => {
      if (!canEdit) return;
      setEditingJobId(job.id);
      setSelectedCustomerId(job.customerId);
      setSelectedSegment(job.segment);
      setAddedServiceIds(job.serviceIds);
      setSelectedStaffIds(job.assignedStaffIds);
      setWorkNotes(job.notes);
      setTimeIn(job.timeIn || '09:00');
      setReferredBy(job.referredBy || '');
      setVehicleSearch(job.vehicleDetails ? `${job.vehicleDetails.make} ${job.vehicleDetails.model}` : '');
      
      // If editing, use the job's saved settings, otherwise use persisted defaults
      if (job.taxEnabled !== undefined) setIsTaxEnabled(job.taxEnabled);
      if (job.taxInclusive !== undefined) setIsTaxInclusive(job.taxInclusive);
      
      setIsJobModalOpen(true);
  };

  const handleDeleteJob = (id: string) => {
      if (!canEdit) return;
      if (window.confirm("Are you sure?")) {
          deleteJob(id);
      }
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || addedServiceIds.length === 0) return;

    // Optional: create a temp vehicle object if we have search text
    const tempVehicle = vehicleSearch ? {
        id: 'v-temp',
        make: vehicleSearch.split(' ')[0] || 'Unknown',
        model: vehicleSearch.substring(vehicleSearch.indexOf(' ')+1) || 'Unknown',
        year: new Date().getFullYear(),
        licensePlate: 'NEW',
        color: '',
        segment: selectedSegment
    } : undefined;

    const jobData: JobCard = {
      id: editingJobId || `j-${Date.now()}`,
      ticketNumber: editingJobId ? jobs.find(j => j.id === editingJobId)?.ticketNumber || 'ERR' : `T-${1000 + jobs.length + 1}`,
      date: editingJobId ? jobs.find(j => j.id === editingJobId)?.date || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      timeIn: timeIn,
      customerId: selectedCustomerId,
      vehicleId: 'v-new',
      vehicleDetails: tempVehicle,
      segment: selectedSegment,
      serviceIds: addedServiceIds,
      assignedStaffIds: selectedStaffIds,
      referredBy: referredBy || undefined,
      status: editingJobId ? jobs.find(j => j.id === editingJobId)?.status || 'RECEIVED' : 'RECEIVED',
      subtotal: subtotal,
      tax: tax,
      total: total,
      taxEnabled: isTaxEnabled,
      taxInclusive: isTaxInclusive,
      notes: workNotes || '',
      postedToGL: editingJobId ? jobs.find(j => j.id === editingJobId)?.postedToGL || false : false,
      paymentStatus: editingJobId ? jobs.find(j => j.id === editingJobId)?.paymentStatus : 'UNPAID'
    };

    if (editingJobId) {
        updateJob(jobData);
    } else {
        addJob(jobData);
    }
    
    setIsJobModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setTempServiceId('');
    setAddedServiceIds([]);
    setSelectedSegment('HATCHBACK');
    setSelectedStaffIds([]);
    setWorkNotes('');
    setVehicleSearch('');
    setTimeIn(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setReferredBy('');
    // Note: We do NOT reset tax settings here, we keep the user's preference
  };

  const openPaymentModal = (job: JobCard) => {
      setJobForPayment(job);
      setPaymentMethod('CASH');
      setIsPaymentModalOpen(true);
  };

  const confirmPayment = () => {
      if (jobForPayment) {
          updateJobStatus(jobForPayment.id, 'INVOICED', paymentMethod);
          setIsPaymentModalOpen(false);
          const jobToPrint = {...jobForPayment, paymentStatus: 'PAID' as any};
          setJobForPayment(null);
          printInvoice(jobToPrint);
      }
  };

  const handleStatusClick = (job: JobCard) => {
    const statusOrder: JobStatus[] = ['RECEIVED', 'IN_PROGRESS', 'QC_CHECK', 'READY', 'INVOICED'];
    const currentIndex = statusOrder.indexOf(job.status);
    if (currentIndex >= 0 && currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      if (nextStatus !== 'INVOICED') {
        updateJobStatus(job.id, nextStatus);
      }
    }
  };

  const printInvoice = (job: JobCard) => {
      setPrintingJob(job);
      setTimeout(() => {
          document.body.classList.add('printing-invoice');
          window.print();
          document.body.classList.remove('printing-invoice');
          setPrintingJob(null);
      }, 300);
  };

  const InvoiceTemplate = ({ job }: { job: JobCard }) => {
     const customer = customers.find(c => c.id === job.customerId);
     const jobServices = services.filter(s => job.serviceIds.includes(s.id));
     const isInclusive = job.taxInclusive ?? true;
     const showTax = job.taxEnabled ?? false;
     
     return createPortal(
         <div className="invoice-container-print bg-white p-10 font-sans text-black">
             <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-8">
                 <div className="flex gap-8 items-center">
                     <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded" />
                     <div>
                         <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Auto Dazzle</h1>
                         <p className="text-sm font-bold text-slate-600 tracking-widest uppercase">Premium Detailing Spa</p>
                         <p className="text-sm text-slate-500 mt-2">Premium Car Care Center</p>
                         <p className="text-sm text-slate-500">+91 98765 43210 | autodazzle.spa</p>
                     </div>
                 </div>
                 <div className="text-right">
                     <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Tax Invoice</h2>
                     <p className="text-xl font-bold text-slate-700 mt-2">No: #{job.ticketNumber}</p>
                     <p className="text-sm font-bold text-slate-400 mt-1 uppercase">Date: {job.date}</p>
                     <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Time: {job.timeIn}</p>
                 </div>
             </div>
             
              <div className="flex justify-between mb-12 px-2">
                 <div>
                     <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Billed To</p>
                     <h3 className="text-2xl font-black text-black">{customer?.name}</h3>
                     <p className="text-lg font-medium text-slate-700">{customer?.phone}</p>
                     <p className="text-sm font-medium text-slate-500 mt-1">{customer?.address || 'N/A'}</p>
                 </div>
                 <div className="text-right">
                     <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Vehicle Profile</p>
                     <h3 className="text-xl font-black text-black">{job.segment}</h3>
                     <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Status: {job.paymentStatus}</p>
                 </div>
             </div>

             <table className="w-full text-left mb-12 border-collapse">
                 <thead>
                     <tr className="border-b-2 border-black">
                         <th className="py-4 font-black uppercase text-xs tracking-widest">Service Description</th>
                         <th className="py-4 font-black uppercase text-xs tracking-widest text-right">Amount (INR)</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200">
                     {jobServices.map(s => (
                         <tr key={s.id}>
                             <td className="py-6">
                                 <p className="font-black text-xl text-black">{s.name}</p>
                                 <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">{s.category}</p>
                             </td>
                             <td className="py-6 text-right font-black text-xl">₹{(s.prices[job.segment] || s.basePrice).toLocaleString()}</td>
                         </tr>
                     ))}
                 </tbody>
             </table>

             <div className="flex justify-end pr-2">
                 <div className="w-1/2 space-y-4">
                     {showTax ? (
                         // Tax Enabled Mode
                         isInclusive ? (
                             <>
                                <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-widest border-b-2 border-slate-100 pb-4">
                                    <span>Includes GST (18%)</span>
                                    <span>₹{job.tax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-4xl font-black text-black pt-2">
                                    <span>Total Payable</span>
                                    <span>₹{job.total.toLocaleString()}</span>
                                </div>
                             </>
                         ) : (
                             <>
                                <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span>₹{job.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-widest border-b-2 border-slate-100 pb-4">
                                    <span>GST (18%)</span>
                                    <span>₹{job.tax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-4xl font-black text-black pt-2">
                                    <span>TOTAL</span>
                                    <span>₹{job.total.toLocaleString()}</span>
                                </div>
                             </>
                         )
                     ) : (
                         // No Tax Mode
                         <>
                            <div className="flex justify-between text-4xl font-black text-black pt-2 border-t-2 border-slate-200">
                                <span>TOTAL DUE</span>
                                <span>₹{job.total.toLocaleString()}</span>
                            </div>
                         </>
                     )}
                 </div>
             </div>

             <div className="mt-20 pt-10 border-t-2 border-slate-100 text-center">
                 <p className="text-xl font-black text-black italic">"Experience the Dazzle!"</p>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">This is a computer generated invoice. No signature required.</p>
             </div>
         </div>,
         document.body
     )
  }

  return (
    <div className="space-y-6">
      {printingJob && <InvoiceTemplate job={printingJob} />}
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-md">
                <ClipboardList size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Job Card Queue</h2>
                <div className="flex gap-4 mt-1">
                   <button onClick={() => setViewMode('QUEUE')} className={`text-xs font-bold uppercase pb-0.5 border-b-2 transition-all ${viewMode === 'QUEUE' ? 'text-blue-700 border-blue-700' : 'text-slate-400 border-transparent'}`}>Active</button>
                   <button onClick={() => setViewMode('HISTORY')} className={`text-xs font-bold uppercase pb-0.5 border-b-2 transition-all ${viewMode === 'HISTORY' ? 'text-blue-700 border-blue-700' : 'text-slate-400 border-transparent'}`}>History</button>
                </div>
            </div>
        </div>
        <button onClick={openNewJob} className="bg-red-600 text-white px-6 py-2.5 rounded-md text-sm font-bold flex items-center shadow-md hover:bg-red-700 transition-all uppercase">
          <Plus size={18} className="mr-2" /> New Ticket
        </button>
      </div>

      {viewMode === 'QUEUE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
            {activeJobs.map((job) => {
            const customer = customers.find(c => c.id === job.customerId);
            const serviceNames = services.filter(s => job.serviceIds.includes(s.id)).map(s => s.name).join(', ');
            
            return (
                <div key={job.id} onClick={() => openEditJob(job)} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer">
                <div className={`absolute top-0 left-0 w-1 h-full ${job.status === 'READY' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div>
                    <div className="flex justify-between items-start mb-4 pl-3">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{job.ticketNumber} • {job.segment}</span>
                            <h3 className="font-bold text-slate-800 text-lg truncate w-40">{customer?.name || 'Walk-in'}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${job.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{job.status}</span>
                    </div>
                    <div className="pl-3 mb-4">
                        <p className="text-xs text-slate-600 font-medium line-clamp-2">{serviceNames}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-1"><Clock size={10}/> {job.timeIn}</p>
                    </div>
                </div>
                <div className="pl-3 pt-4 border-t border-slate-100 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                    <span className="text-lg font-black text-slate-900">₹{job.total.toLocaleString()}</span>
                    <div className="flex gap-2">
                        <button onClick={() => printInvoice(job)} className="p-2 text-slate-400 hover:text-slate-800" title="Print Invoice"><Printer size={16}/></button>
                        {job.status === 'READY' ? (
                            <button onClick={() => openPaymentModal(job)} className="px-4 py-2 bg-green-600 text-white rounded text-xs font-bold uppercase shadow-sm">BILL & PAY</button>
                        ) : (
                            <button onClick={() => handleStatusClick(job)} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold uppercase">NEXT</button>
                        )}
                        {canEdit && (
                            <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        )}
                    </div>
                </div>
                </div>
            );
            })}
        </div>
      )}

      {viewMode === 'HISTORY' && (
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:hidden">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                     <tr>
                         <th className="px-6 py-4">Job Info</th>
                         <th className="px-6 py-4">Customer</th>
                         <th className="px-6 py-4 text-right">Amount</th>
                         <th className="px-6 py-4 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {historyJobs.map(job => (
                         <tr key={job.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4">
                                 <span className="font-bold text-slate-900 block">{job.ticketNumber}</span>
                                 <span className="text-xs text-slate-500">{job.date} {job.timeIn}</span>
                             </td>
                             <td className="px-6 py-4 font-bold">{customers.find(c => c.id === job.customerId)?.name}</td>
                             <td className="px-6 py-4 text-right font-black text-slate-900">₹{job.total.toLocaleString()}</td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2">
                                     <button onClick={() => printInvoice(job)} className="text-slate-400 hover:text-slate-800" title="Print Invoice"><Printer size={16}/></button>
                                     {canEdit && (
                                         <button onClick={() => handleDeleteJob(job.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                     )}
                                 </div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      )}

      {isJobModalOpen && createPortal(
         <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl max-h-[95vh] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl text-black">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                  <h3 className="text-xl font-bold uppercase">{editingJobId ? 'Edit Job' : 'New Job Card'}</h3>
                  <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
               </div>
               <form onSubmit={handleSaveJob} className="p-6 space-y-6">
                  {currentUserRole === 'STAFF' && editingJobId && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 rounded">
                          <Lock size={14}/> STAFF ROLE: Editing existing tickets is restricted.
                      </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Customer</label>
                        <select required disabled={currentUserRole === 'STAFF' && !!editingJobId} value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2.5 border rounded-md text-sm bg-white text-black disabled:bg-slate-50">
                            <option value="">Select Customer...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vehicle Model Search</label>
                        <input 
                            type="text" 
                            placeholder="Type to search (e.g. Swift)..."
                            value={vehicleSearch}
                            onChange={(e) => {
                                setVehicleSearch(e.target.value);
                                setShowVehicleSuggestions(true);
                            }}
                            onFocus={() => setShowVehicleSuggestions(true)}
                            className="w-full p-2.5 border rounded-md text-sm bg-white text-black font-medium"
                        />
                        {showVehicleSuggestions && vehicleSearch && (
                            <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                {filteredVehicles.map((v, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleSelectVehicle(v)}
                                        className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                    >
                                        <span className="font-bold">{v.brand} {v.model}</span> <span className="text-xs text-slate-500">({v.segment})</span>
                                    </div>
                                ))}
                                {filteredVehicles.length === 0 && <div className="p-2 text-xs text-slate-400">No match found</div>}
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vehicle Segment</label>
                        <select required disabled={currentUserRole === 'STAFF' && !!editingJobId} value={selectedSegment} onChange={e => setSelectedSegment(e.target.value as any)} className="w-full p-2.5 border rounded-md text-sm bg-white text-black disabled:bg-slate-50 font-bold">
                            <option value="HATCHBACK">Hatchback</option>
                            <option value="SEDAN">Sedan</option>
                            <option value="SUV_MUV">SUV / MUV</option>
                            <option value="LUXURY">Luxury</option>
                            <option value="BIKE">Bike</option>
                            <option value="SCOOTY">Scooty</option>
                            <option value="BULLET">Bullet</option>
                            <option value="AUTORICKSHAW">Auto Rickshaw</option>
                            <option value="AUTOTAXI">Auto Taxi</option>
                            <option value="PICKUP_SMALL">Pickup (Small)</option>
                            <option value="PICKUP_LARGE">Pickup (Large)</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Time In</label>
                        <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="w-full p-2.5 border rounded-md text-sm bg-white text-black"/>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Referred By (Staff)</label>
                        <select value={referredBy} onChange={e => setReferredBy(e.target.value)} className="w-full p-2.5 border rounded-md text-sm bg-white text-black">
                           <option value="">-- None --</option>
                           {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Assigned Staff</label>
                    <div className="w-full p-2 border border-slate-300 rounded-md bg-white h-32 overflow-y-auto custom-scrollbar space-y-1">
                        {staff.map(s => {
                            const isSelected = selectedStaffIds.includes(s.id);
                            return (
                                <div 
                                    key={s.id} 
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedStaffIds(prev => prev.filter(id => id !== s.id));
                                        } else {
                                            setSelectedStaffIds(prev => [...prev, s.id]);
                                        }
                                    }}
                                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                        {isSelected && <CheckCircle size={10} className="text-white" strokeWidth={4} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{s.name}</p>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1 rounded">{s.role}</span>
                                </div>
                            )
                        })}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex gap-2 mb-4">
                          <select disabled={currentUserRole === 'STAFF' && !!editingJobId} value={tempServiceId} onChange={e => setTempServiceId(e.target.value)} className="flex-1 p-2 border rounded-md text-sm bg-white text-black disabled:bg-slate-50">
                            <option value="">Add Service...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button type="button" disabled={currentUserRole === 'STAFF' && !!editingJobId} onClick={handleAddService} className="px-4 py-2 bg-slate-800 text-white rounded text-xs font-bold uppercase disabled:bg-slate-400">Add</button>
                      </div>
                      <div className="space-y-2">
                          {addedServicesList.map(s => (
                              <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                  <span className="text-sm font-bold">{s.name}</span>
                                  <div className="flex items-center gap-4">
                                      <span className="text-sm font-black">₹{s.prices[selectedSegment]}</span>
                                      {(!editingJobId || canEdit) && (
                                          <button type="button" onClick={() => handleRemoveService(s.id)} className="text-red-500"><Trash2 size={16}/></button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-4 border-t">
                      <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={isTaxEnabled} onChange={e => setIsTaxEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                              <span className="text-xs font-bold text-slate-600 uppercase">Charge GST?</span>
                          </label>
                          
                          {isTaxEnabled && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={isTaxInclusive} onChange={e => setIsTaxInclusive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  <span className="text-xs font-bold text-slate-600 uppercase">Inclusive?</span>
                              </label>
                          )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-bold text-slate-500 uppercase">Grand Total</span>
                          <span className="text-3xl font-black text-slate-900">₹{total.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      </div>
                      {isTaxEnabled && isTaxInclusive && (
                          <p className="text-[10px] text-slate-400 text-right">Includes 18% GST: ₹{tax.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      )}
                      {isTaxEnabled && !isTaxInclusive && (
                          <p className="text-[10px] text-slate-400 text-right">+ 18% GST: ₹{tax.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      )}
                  </div>
                  {(!editingJobId || canEdit) && (
                    <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold uppercase rounded-md shadow-md">
                        {editingJobId ? 'Update Job' : 'Create Ticket'}
                    </button>
                  )}
               </form>
            </div>
         </div>,
         document.body
      )}

      {isPaymentModalOpen && jobForPayment && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-lg shadow-2xl p-6 text-black">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold uppercase">Process Billing</h3>
                      <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border mb-6 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500 uppercase">Grand Total</span>
                      <span className="text-3xl font-black text-green-600">₹{jobForPayment.total.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                      {['CASH', 'UPI', 'CARD'].map(m => (
                          <button key={m} onClick={() => setPaymentMethod(m as any)} className={`p-4 rounded-lg border flex flex-col items-center gap-2 ${paymentMethod === m ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                              {m === 'CASH' && <Banknote size={24}/>}
                              {m === 'UPI' && <Smartphone size={24}/>}
                              {m === 'CARD' && <CreditCard size={24}/>}
                              <span className="text-[10px] font-bold">{m}</span>
                          </button>
                      ))}
                  </div>
                  <button onClick={confirmPayment} className="w-full py-4 bg-green-600 text-white font-bold uppercase rounded-lg shadow-lg">Confirm & Print</button>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
