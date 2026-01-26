
import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
// Added missing RefreshCcw icon import
import { X, Plus, Upload, Trash2, Edit, Search, FileSpreadsheet, Copy, Car, Table, Info, RefreshCcw } from 'lucide-react';
import { Service } from '../types.ts';

export const Operations: React.FC = () => {
  const { services, addService, updateService, deleteService, bulkAddServices, currentUserRole, isCloudConnected, syncStatus } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importText, setImportText] = useState('');
  
  const canEdit = currentUserRole !== 'STAFF';

  const initialFormState = {
    sku: '', name: '', category: 'WASHING' as Service['category'], duration: 30,
    price_HATCH: 0, price_SEDAN: 0, price_SUV: 0, price_LUX: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null); setFormData(initialFormState); setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    if (!canEdit) return;
    setEditingId(s.id);
    setFormData({
      sku: s.sku, name: s.name, category: s.category, duration: s.durationMinutes,
      price_HATCH: s.prices.HATCHBACK || 0,
      price_SEDAN: s.prices.SEDAN || 0,
      price_SUV: s.prices.SUV_MUV || 0,
      price_LUX: s.prices.LUXURY || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Service = {
      id: editingId || `s-${Date.now()}`,
      sku: formData.sku || `SVC-${services.length + 1}`,
      name: formData.name,
      basePrice: formData.price_HATCH,
      prices: {
        HATCHBACK: formData.price_HATCH,
        SEDAN: formData.price_SEDAN,
        SUV_MUV: formData.price_SUV,
        LUXURY: formData.price_LUX,
        AUTORICKSHAW: 0, AUTOTAXI: 0, BIKE: 0, SCOOTY: 0, BULLET: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
      },
      durationMinutes: formData.duration,
      category: formData.category
    };
    editingId ? updateService(payload) : addService(payload);
    setIsModalOpen(false);
  };

  const handleBulkImport = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    const imported: Service[] = lines.map((line, idx) => {
      const p = line.split(',').map(s => s.trim());
      // STRICT 5 COL SEQUENCE: Name, Hatch, Sedan, SUV, Premium
      return {
          id: `si-${Date.now()}-${idx}`,
          sku: `SVC-${1000 + idx + services.length}`,
          name: p[0],
          category: 'WASHING',
          basePrice: parseFloat(p[1]) || 0,
          durationMinutes: 30,
          prices: {
              HATCHBACK: parseFloat(p[1]) || 0,
              SEDAN: parseFloat(p[2]) || 0,
              SUV_MUV: parseFloat(p[3]) || 0,
              LUXURY: parseFloat(p[4]) || 0,
              BIKE: 0, SCOOTY: 0, BULLET: 0, AUTORICKSHAW: 0, AUTOTAXI: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
          }
      };
    });
    bulkAddServices(imported);
    setIsImportOpen(false);
    setImportText('');
    alert(`Successfully imported ${imported.length} services. Auto-syncing to cloud...`);
  };

  const PricingInput = ({ label, field }: { label: string, field: keyof typeof formData }) => (
    <div className="space-y-1">
        <label className="text-[11px] font-black text-slate-800 uppercase block tracking-widest">{label} (₹)</label>
        <input 
            type="number" 
            value={formData[field] || ''} 
            onChange={e => setFormData({...formData, [field]: parseFloat(e.target.value) || 0})} 
            className="w-full p-4 border-2 border-slate-300 rounded-xl text-xl font-black text-black bg-white focus:border-black outline-none transition-all shadow-sm focus:ring-4 focus:ring-slate-50" 
            placeholder="0"
        />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
            <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Pricing Menu</p>
                {isCloudConnected && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase">
                        <RefreshCcw size={10} className={syncStatus === 'SYNCING' ? 'animate-spin' : ''}/> 
                        {syncStatus === 'SYNCING' ? 'Syncing...' : 'Cloud Ready'}
                    </span>
                )}
            </div>
          </div>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-black focus:border-red-600 outline-none transition-all" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border-2 border-slate-200 text-slate-800 px-5 py-2.5 rounded-xl text-[10px] font-black shadow-sm flex items-center uppercase hover:bg-slate-50 transition-all active:scale-95"><Upload size={14} className="mr-2" /> Batch Load</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all tracking-wider active:scale-95"><Plus size={16} className="mr-2" /> Add Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-4 border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Service Information</th>
                <th className="px-4 py-5 text-right bg-blue-900/40">Hatchback</th>
                <th className="px-4 py-5 text-right bg-blue-900/40">Sedan</th>
                <th className="px-4 py-5 text-right bg-blue-900/40">SUV / MUV</th>
                <th className="px-4 py-5 text-right bg-red-900/40 border-l border-white/10">Premium</th>
                {canEdit && <th className="px-8 py-5 text-center">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/20 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-black text-slate-900 text-lg uppercase leading-none">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center gap-2">
                        <span className="bg-slate-100 px-1 rounded">{s.sku}</span>
                        <span className="uppercase tracking-widest">{s.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-right font-black text-slate-700 text-base">₹{s.prices.HATCHBACK?.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right font-black text-slate-700 text-base">₹{s.prices.SEDAN?.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right font-black text-slate-700 text-base">₹{s.prices.SUV_MUV?.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right font-black text-red-600 text-xl border-l-2 border-slate-50">₹{s.prices.LUXURY?.toLocaleString()}</td>
                  {canEdit && (
                      <td className="px-8 py-5">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => handleOpenEdit(s)} className="p-3 text-blue-600 bg-blue-50 border-2 border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90"><Edit size={16}/></button>
                            <button onClick={() => {if(confirm("Permanently delete this service?")) deleteService(s.id)}} className="p-3 text-red-600 bg-red-50 border-2 border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-90"><Trash2 size={16}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ENTERPRISE EDIT MODAL - EXTREME VISIBILITY */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden text-black border-[12px] border-slate-950 animate-fade-in-up">
                  <div className="p-10 border-b-8 border-slate-50 flex justify-between items-center bg-white">
                      <div>
                          <h3 className="text-4xl font-black text-black uppercase tracking-tighter">{editingId ? 'Edit Service Details' : 'New System Service'}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Enterprise Pricing Logic v2.4</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-5 bg-slate-100 rounded-3xl border-4 border-slate-950 hover:bg-red-600 hover:text-white transition-all active:scale-90"><X size={32}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-2">
                              <label className="text-[11px] font-black text-black uppercase block tracking-[0.2em]">Service Display Name</label>
                              <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full p-5 border-4 border-slate-100 rounded-2xl text-xl font-black text-black bg-slate-50 focus:bg-white focus:border-black outline-none shadow-inner transition-all" 
                                placeholder="Foam Wash Deluxe"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[11px] font-black text-black uppercase block tracking-[0.2em]">System SKU / Code</label>
                              <input 
                                placeholder="AUTO-GENERATE" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})} 
                                className="w-full p-5 border-4 border-slate-100 rounded-2xl text-xl font-mono font-black text-slate-400 bg-slate-50 outline-none" 
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[48px] border-4 border-slate-100 space-y-8">
                          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-3 border-b-4 border-slate-200 pb-4">
                             <Car size={20} className="text-red-600"/> Multi-Tier Pricing Matrix (INR)
                          </h4>
                          <div className="grid grid-cols-2 gap-10">
                              <PricingInput label="Hatchback" field="price_HATCH" />
                              <PricingInput label="Sedan" field="price_SEDAN" />
                              <PricingInput label="SUV / MUV" field="price_SUV" />
                              <PricingInput label="Premium / Luxury" field="price_LUX" />
                          </div>
                      </div>

                      <div className="flex gap-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border-4 border-slate-200 rounded-[20px] text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-all active:scale-95">Discard</button>
                          <button type="submit" className="flex-[2] py-5 bg-black text-white rounded-[20px] text-lg font-black uppercase shadow-2xl hover:bg-red-700 transition-all tracking-[0.1em] border-b-8 border-black/40 active:scale-95">
                              {editingId ? 'Push Updates' : 'Create Package'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* SERVICE BULK IMPORT MODAL */}
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-indigo-950/90 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl text-black border-[12px] border-indigo-900 animate-fade-in-up overflow-hidden">
                  <div className="p-10 border-b-8 border-slate-50 flex justify-between items-center bg-white">
                      <div>
                          <h3 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter flex items-center gap-3"><FileSpreadsheet size={32}/> Service Bulk Loader</h3>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">Automated Multi-Rate Upload</p>
                      </div>
                      <button onClick={() => setIsImportOpen(false)} className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 hover:bg-red-600 hover:text-white transition-all active:scale-90"><X size={24}/></button>
                  </div>
                  <div className="p-10">
                      <div className="p-6 rounded-[28px] mb-8 border-4 border-indigo-100 bg-indigo-50/50">
                          <div className="flex justify-between items-start mb-4">
                              <h4 className="text-[11px] font-black uppercase text-indigo-800 flex items-center gap-2"><Info size={14}/> STRICT 5 COLUMN SEQUENCE</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Ceramic Wash, 450, 600, 800, 1200\nWax Polish, 1200, 1500, 1800, 3000");
                                  alert("Example logic copied to clipboard!");
                              }} className="text-[10px] bg-white border-2 border-indigo-200 px-4 py-1.5 rounded-full font-black uppercase hover:bg-white transition-all shadow-md active:scale-95">Copy Sample CSV</button>
                          </div>
                          <code className="block bg-white p-4 rounded-2xl text-[12px] font-mono font-bold text-indigo-900 border-2 border-indigo-100 shadow-inner">
                             Service Name, Hatchback Rate, Sedan Rate, SUV Rate, Premium Rate
                          </code>
                      </div>
                      <textarea 
                        className="w-full h-48 p-6 border-4 border-slate-100 rounded-3xl font-mono text-sm focus:border-indigo-600 outline-none text-slate-900 bg-slate-50 shadow-inner" 
                        placeholder="Foam Wash Premium, 300, 400, 500, 800" 
                        value={importText} 
                        onChange={e => setImportText(e.target.value)} 
                      />
                      <div className="mt-8 flex gap-6">
                          <button onClick={() => setIsImportOpen(false)} className="flex-1 py-5 border-4 border-slate-200 rounded-[20px] text-xs font-black uppercase text-slate-400">Cancel</button>
                          <button onClick={handleBulkImport} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[20px] text-lg font-black uppercase shadow-2xl hover:bg-indigo-700 transition-all tracking-wider border-b-8 border-indigo-900/30 active:scale-95">Start Protocol</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
