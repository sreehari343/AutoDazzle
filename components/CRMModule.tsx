
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { Users, Phone, Car, Plus, Crown, Star, Calendar, Mail, Search, Filter, ArrowUpRight, ShieldCheck, Gem, X, MapPin, Save, Trash2, Lock } from 'lucide-react';
import { PremiumTier, Customer, VehicleSegment, Vehicle } from '../types.ts';
import { INDIAN_VEHICLE_DB, VehicleModel } from '../data/vehicleDb.ts';

export const CRMModule: React.FC = () => {
  const { customers, addCustomer, updateCustomer, currentUserRole } = useERP();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PREMIUM'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const [newCust, setNewCust] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isPremium: false,
    premiumTier: 'NONE' as PremiumTier
  });
  
  const [newVehicle, setNewVehicle] = useState({
      make: '', model: '', year: new Date().getFullYear(), licensePlate: '', color: '', segment: 'HATCHBACK' as VehicleSegment
  });

  // Autocomplete state for New Customer
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [extraVehicle, setExtraVehicle] = useState({
      make: '', model: '', licensePlate: '', color: '', segment: 'HATCHBACK' as VehicleSegment
  });
  // Autocomplete state for Extra Vehicle
  const [extraVehicleSearch, setExtraVehicleSearch] = useState('');
  const [showExtraVehicleSuggestions, setShowExtraVehicleSuggestions] = useState(false);

  const canEdit = currentUserRole !== 'STAFF';

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.phone.includes(searchTerm) ||
                         c.vehicles.some(v => v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'ALL' || c.isPremium;
    return matchesSearch && matchesTab;
  });

  const getVehicleSuggestions = (query: string) => {
      return INDIAN_VEHICLE_DB.filter(v => 
        v.model.toLowerCase().includes(query.toLowerCase()) || 
        v.brand.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
  };

  const handleSelectNewVehicle = (v: VehicleModel) => {
      setVehicleSearch(`${v.brand} ${v.model}`);
      setNewVehicle({ ...newVehicle, make: v.brand, model: v.model, segment: v.segment });
      setShowVehicleSuggestions(false);
  };

  const handleSelectExtraVehicle = (v: VehicleModel) => {
      setExtraVehicleSearch(`${v.brand} ${v.model}`);
      setExtraVehicle({ ...extraVehicle, make: v.brand, model: v.model, segment: v.segment });
      setShowExtraVehicleSuggestions(false);
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = {
      id: `c-${Date.now()}`,
      ...newCust,
      lifetimeValue: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      outstandingBalance: 0,
      visits: 0,
      vehicles: newVehicle.licensePlate ? [{ id: `v-${Date.now()}`, ...newVehicle }] : []
    };
    addCustomer(customer);
    setIsAddModalOpen(false);
    setNewCust({ name: '', email: '', phone: '', address: '', isPremium: false, premiumTier: 'NONE' });
    setNewVehicle({ make: '', model: '', year: new Date().getFullYear(), licensePlate: '', color: '', segment: 'HATCHBACK' });
    setVehicleSearch('');
  };

  const handleAddExtraVehicle = (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewCustomer) return;

      const v: Vehicle = {
          id: `v-${Date.now()}`,
          make: extraVehicle.make,
          model: extraVehicle.model,
          year: new Date().getFullYear(), 
          licensePlate: extraVehicle.licensePlate,
          color: extraVehicle.color,
          segment: extraVehicle.segment
      };

      const updatedCustomer = {
          ...viewCustomer,
          vehicles: [...viewCustomer.vehicles, v]
      };

      updateCustomer(updatedCustomer);
      setViewCustomer(updatedCustomer);
      setIsAddingVehicle(false);
      setExtraVehicle({ make: '', model: '', licensePlate: '', color: '', segment: 'HATCHBACK' });
      setExtraVehicleSearch('');
  };

  const handleDeleteVehicle = (vehicleId: string) => {
      if (!viewCustomer || !canEdit) return;
      if (window.confirm("Remove this vehicle from customer profile?")) {
          const updatedCustomer = {
              ...viewCustomer,
              vehicles: viewCustomer.vehicles.filter(v => v.id !== vehicleId)
          };
          updateCustomer(updatedCustomer);
          setViewCustomer(updatedCustomer);
      }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Customer Database</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search name, phone, or vehicle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-black"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          All Customers
        </button>
        <button 
          onClick={() => setActiveTab('PREMIUM')}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1 ${activeTab === 'PREMIUM' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Crown size={12} /> Premium Only
        </button>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div onClick={() => setViewCustomer(customer)} key={customer.id} className="cursor-pointer bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${customer.isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                {customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{customer.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{customer.phone}</p>
                {customer.isPremium && <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">Premium</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 border-t border-slate-100 pt-3">
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Lifetime Value</p>
                 <p className="text-sm font-bold text-slate-800">₹{customer.lifetimeValue.toLocaleString()}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Visits</p>
                 <p className="text-sm font-bold text-slate-800">{customer.visits}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                <Car size={12}/> Vehicles
              </p>
              <div className="space-y-1">
                 {customer.vehicles.slice(0, 2).map(v => (
                   <div key={v.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                      <span className="font-bold text-slate-700">{v.make} {v.model}</span>
                      <span className="font-mono text-slate-500">{v.licensePlate}</span>
                   </div>
                 ))}
                 {customer.vehicles.length > 2 && (
                    <p className="text-[10px] text-slate-400 text-center italic">+ {customer.vehicles.length - 2} more</p>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl text-black">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-black uppercase">New Customer Registration</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>

              <form onSubmit={handleAddCustomer} className="p-6 space-y-6">
                 <div className="space-y-4">
                     <h4 className="text-xs font-bold uppercase text-slate-500 border-b border-slate-100 pb-1">Personal Details</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                           <input required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm text-black bg-white" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Phone</label>
                           <input required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm text-black bg-white" />
                        </div>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Address</label>
                         <input value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm text-black bg-white" placeholder="Full Address" />
                     </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" checked={newCust.isPremium} onChange={e => setNewCust({...newCust, isPremium: e.target.checked})} className="w-4 h-4" />
                        <span className="text-sm font-bold text-black">Premium Member</span>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <h4 className="text-xs font-bold uppercase text-slate-500 border-b border-slate-100 pb-1">Primary Vehicle</h4>
                     <div className="grid grid-cols-3 gap-3">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">License Plate</label>
                           <input value={newVehicle.licensePlate} onChange={e => setNewVehicle({...newVehicle, licensePlate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md uppercase text-sm font-bold text-black bg-white" placeholder="KL-01..." />
                        </div>
                        <div className="relative">
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Make/Model</label>
                           <input 
                              value={vehicleSearch} 
                              onChange={e => {
                                  setVehicleSearch(e.target.value);
                                  setShowVehicleSuggestions(true);
                              }}
                              onFocus={() => setShowVehicleSuggestions(true)}
                              className="w-full p-2 border border-slate-300 rounded-md text-sm text-black bg-white" 
                              placeholder="Search..." 
                           />
                           {showVehicleSuggestions && vehicleSearch && (
                               <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                   {getVehicleSuggestions(vehicleSearch).map((v, i) => (
                                       <div 
                                           key={i} 
                                           onClick={() => handleSelectNewVehicle(v)}
                                           className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                       >
                                           <span className="font-bold">{v.brand} {v.model}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Type</label>
                           <select value={newVehicle.segment} onChange={e => setNewVehicle({...newVehicle, segment: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded-md text-sm text-black bg-white font-bold">
                               <option value="HATCHBACK">Hatchback</option>
                               <option value="SEDAN">Sedan</option>
                               <option value="SUV_MUV">SUV/MUV</option>
                               <option value="LUXURY">Luxury</option>
                               <option value="BIKE">Bike</option>
                               <option value="SCOOTY">Scooty</option>
                               <option value="BULLET">Bullet</option>
                               <option value="AUTORICKSHAW">Auto</option>
                           </select>
                        </div>
                     </div>
                 </div>

                 <div className="pt-2 flex gap-4">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 text-slate-600 font-bold border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="flex-[2] py-2.5 bg-red-600 text-white font-bold uppercase rounded-md shadow-sm hover:bg-red-700">Register</button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}

      {/* View Details Modal */}
      {viewCustomer && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl flex flex-col text-black">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                      <div>
                          <h3 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                              {viewCustomer.name}
                              {viewCustomer.isPremium && <Crown size={18} className="text-indigo-600" fill="currentColor"/>}
                          </h3>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Profile</p>
                      </div>
                      <button onClick={() => setViewCustomer(null)} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 space-y-8">
                      {!canEdit && (
                         <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 rounded">
                             <Lock size={14}/> STAFF ROLE: Edits to customer profiles are restricted.
                         </div>
                      )}

                      {/* Contact Info */}
                      <section>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14}/> Contact Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                                  <Phone size={16} className="text-slate-400"/>
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile</p>
                                      <p className="font-bold text-black">{viewCustomer.phone}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                                  <Mail size={16} className="text-slate-400"/>
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                                      <p className="font-bold text-black">{viewCustomer.email || 'N/A'}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100 md:col-span-2">
                                  <MapPin size={16} className="text-slate-400"/>
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                                      <p className="font-bold text-black">{viewCustomer.address || 'Address Not Recorded'}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                                  <Calendar size={16} className="text-slate-400"/>
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Member Since</p>
                                      <p className="font-bold text-black">{viewCustomer.joinedDate}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded border border-indigo-100">
                                  <Crown size={16} className="text-indigo-500"/>
                                  <div>
                                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Membership</p>
                                      <p className="font-bold text-indigo-800">{viewCustomer.isPremium ? 'PREMIUM TIER' : 'STANDARD'}</p>
                                  </div>
                              </div>
                          </div>
                      </section>

                      {/* Garage Section */}
                      <section>
                          <div className="flex justify-between items-center mb-3">
                             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Car size={14}/> Customer Garage</h4>
                             {canEdit && !isAddingVehicle && (
                                <button onClick={() => setIsAddingVehicle(true)} className="text-[10px] font-bold uppercase bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-black transition-colors flex items-center gap-1">
                                    <Plus size={12}/> Add Vehicle
                                </button>
                             )}
                          </div>
                          
                          {/* Add Vehicle Form */}
                          {canEdit && isAddingVehicle && (
                              <form onSubmit={handleAddExtraVehicle} className="mb-4 bg-slate-50 p-4 rounded border border-slate-200">
                                  <h5 className="text-xs font-bold text-black uppercase mb-3">New Vehicle Details</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                      <input required placeholder="License Plate" value={extraVehicle.licensePlate} onChange={e => setExtraVehicle({...extraVehicle, licensePlate: e.target.value})} className="p-2 text-xs border rounded uppercase font-bold text-black bg-white" />
                                      <div className="relative">
                                          <input 
                                            placeholder="Make/Model" 
                                            value={extraVehicleSearch} 
                                            onChange={e => {
                                                setExtraVehicleSearch(e.target.value);
                                                setShowExtraVehicleSuggestions(true);
                                            }}
                                            onFocus={() => setShowExtraVehicleSuggestions(true)}
                                            className="p-2 w-full text-xs border rounded font-bold text-black bg-white" 
                                          />
                                           {showExtraVehicleSuggestions && extraVehicleSearch && (
                                               <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                                   {getVehicleSuggestions(extraVehicleSearch).map((v, i) => (
                                                       <div 
                                                           key={i} 
                                                           onClick={() => handleSelectExtraVehicle(v)}
                                                           className="p-2 hover:bg-slate-100 cursor-pointer text-xs"
                                                       >
                                                           <span className="font-bold">{v.brand} {v.model}</span>
                                                       </div>
                                                   ))}
                                               </div>
                                           )}
                                      </div>
                                      <input placeholder="Color" value={extraVehicle.color} onChange={e => setExtraVehicle({...extraVehicle, color: e.target.value})} className="p-2 text-xs border rounded text-black bg-white" />
                                      <select value={extraVehicle.segment} onChange={e => setExtraVehicle({...extraVehicle, segment: e.target.value as any})} className="p-2 text-xs border rounded font-bold text-black bg-white">
                                         <option value="HATCHBACK">Hatchback</option>
                                         <option value="SEDAN">Sedan</option>
                                         <option value="SUV_MUV">SUV/MUV</option>
                                         <option value="LUXURY">Luxury</option>
                                         <option value="BIKE">Bike</option>
                                         <option value="SCOOTY">Scooty</option>
                                         <option value="BULLET">Bullet</option>
                                         <option value="AUTORICKSHAW">Auto</option>
                                      </select>
                                  </div>
                                  <div className="flex gap-2">
                                      <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-green-700">Save Vehicle</button>
                                      <button type="button" onClick={() => setIsAddingVehicle(false)} className="bg-white border border-slate-300 text-slate-600 px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-slate-50">Cancel</button>
                                  </div>
                              </form>
                          )}

                          <div className="space-y-2">
                              {viewCustomer.vehicles.length === 0 && <p className="text-sm text-slate-400 italic p-4 text-center border border-dashed rounded">No vehicles registered.</p>}
                              {viewCustomer.vehicles.map(v => (
                                  <div key={v.id} className="flex justify-between items-center p-3 bg-white rounded border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                              <Car size={16}/>
                                          </div>
                                          <div>
                                              <p className="font-bold text-black text-sm">{v.make} {v.model} <span className="text-slate-400 font-normal">({v.color})</span></p>
                                              <div className="flex gap-2 mt-0.5">
                                                  <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{v.licensePlate}</span>
                                                  <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{v.segment}</span>
                                              </div>
                                          </div>
                                      </div>
                                      {canEdit && (
                                        <button onClick={() => handleDeleteVehicle(v.id)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={16}/>
                                        </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </section>

                      {/* Financial Stats */}
                      <section className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Spend</p>
                              <p className="text-2xl font-black text-black">₹{viewCustomer.lifetimeValue.toLocaleString()}</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Balance</p>
                              <p className={`text-2xl font-black ${viewCustomer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  ₹{viewCustomer.outstandingBalance.toLocaleString()}
                              </p>
                          </div>
                      </section>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
