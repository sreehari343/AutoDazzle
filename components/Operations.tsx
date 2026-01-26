import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Upload, Trash2, Edit, Search, FileSpreadsheet, Copy, Car, Table, Info } from 'lucide-react';
import { Service } from '../types.ts';

export const Operations: React.FC = () => {
  const { services, addService, updateService, deleteService, bulkAddServices, currentUserRole } = useERP();
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
      // SEQUENCE: [0]Name, [1]Hatch, [2]Sedan, [3]SUV, [4]Premium
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
    alert(`Imported ${imported.length} services with segment rates.`);
  };

  const PricingInput = ({ label, field }: { label: string, field: keyof typeof formData }) => (
    <div className="space-y-1">
        <label className="text-[12px] font-black text-black uppercase block tracking-widest">{label} Price (₹)</label>
        <input 
            type="number" 
            value={formData[field] || ''} 
            onChange={e => setFormData({...formData, [field]: parseFloat(e.target.value) || 0})} 
            className="w-full p-4 border-4 border-black rounded-xl text-2xl font-black text-black bg-white focus:ring-8 focus:ring-red-600/10 outline-none transition-all shadow-md" 
            placeholder="0"
        />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Pricing Structure</p>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Search packages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold text-black focus:border-red-600 outline-none" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border-2 border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-black shadow-sm flex items-center uppercase"><Upload size={14} className="mr-2" /> Bulk Import</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-5 py-2 rounded-md text-xs font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all"><Plus size={16} className="mr-2" /> New Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border-4 border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Service Details</th>
                <th className="px-3 py-4 text-right bg-blue-900/40">Hatchback</th>
                <th className="px-3 py-4 text-right bg-blue-900/40">Sedan</th>
                <th className="px-3 py-4 text-right bg-blue-900/40">SUV / MUV</th>
                <th className="px-3 py-4 text-right bg-red-900/40">Premium</th>
                {canEdit && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 text-base uppercase">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.sku}</div>
                  </td>
                  <td className="px-3 py-4 text-right font-black text-slate-700 text-lg">₹{s.prices.HATCHBACK?.toLocaleString()}</td>
                  <td className="px-3 py-4 text-right font-black text-slate-700 text-lg">₹{s.prices.SEDAN?.toLocaleString()}</td>
                  <td className="px-3 py-4 text-right font-black text-slate-700 text-lg">₹{s.prices.SUV_MUV?.toLocaleString()}</td>
                  <td className="px-3 py-4 text-right font-black text-red-600 text-xl">₹{s.prices.LUXURY?.toLocaleString()}</td>
                  {canEdit && (
                      <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEdit(s)} className="p-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={16}/></button>
                            <button onClick={() => {if(confirm("Delete?")) deleteService(s.id)}} className="p-2 text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ADD/EDIT MODAL - ULTRA VISIBLE */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden text-black border-[10px] border-black animate-fade-in-up">
                  <div className="p-10 border-b-4 border-slate-50 flex justify-between items-center bg-white">
                      <div>
                          <h3 className="text-3xl font-black text-black uppercase tracking-tighter">{editingId ? 'Edit Package Rates' : 'Create New Package'}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Enterprise Pricing Module</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-100 rounded-2xl border-4 border-black hover:bg-red-600 hover:text-white transition-all"><X size={28}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-sm font-black text-black uppercase block tracking-widest">Service Name</label>
                              <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full p-4 border-4 border-black rounded-2xl text-xl font-black text-black bg-white focus:ring-8 focus:ring-red-600/5 outline-none shadow-sm" 
                                placeholder="Foam Wash..."
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-black text-black uppercase block tracking-widest">SKU / Code</label>
                              <input 
                                placeholder="AUTO-GEN" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})} 
                                className="w-full p-4 border-4 border-slate-200 rounded-2xl text-xl font-mono font-black text-slate-400 bg-slate-50 outline-none" 
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[40px] border-4 border-black/10 space-y-8">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                             <Car size={16} className="text-red-600"/> Per-Segment Pricing Structure (INR)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <PricingInput label="Hatchback" field="price_HATCH" />
                              <PricingInput label="Sedan" field="price_SEDAN" />
                              <PricingInput label="SUV / MUV" field="price_SUV" />
                              <PricingInput label="Premium" field="price_LUX" />
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-4 border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-all">Abort Changes</button>
                          <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-lg font-black uppercase shadow-xl hover:bg-red-700 transition-all tracking-widest border-b-8 border-black/30">
                              {editingId ? 'Update Rates' : 'Create Package'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl text-slate-900 border-4 border-indigo-900 animate-fade-in-up">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-indigo-900 uppercase flex items-center gap-2"><FileSpreadsheet size={18}/> Service Batch Loader</h3>
                      <button onClick={() => setIsImportOpen(false)} className="p-1 bg-slate-200 rounded text-slate-500 hover:text-red-500 transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-8">
                      <div className="p-4 rounded-lg mb-6 border-2 border-indigo-100 bg-indigo-50/50">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-1"><Info size={10}/> 5 COLUMN SEQUENCE</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Foam Wash, 350, 450, 600, 1000");
                                  alert("Copied!");
                              }} className="text-[9px] bg-white border border-indigo-200 px-3 py-1 rounded font-black uppercase hover:bg-white transition-all shadow-sm">Copy Sample</button>
                          </div>
                          <code className="block bg-white p-3 rounded-md text-[10px] font-mono text-slate-700 border border-indigo-200">
                             Name, Hatchback Rate, Sedan Rate, SUV Rate, Premium Rate
                          </code>
                      </div>
                      <textarea 
                        className="w-full h-48 p-4 border-2 border-slate-200 rounded-lg font-mono text-xs focus:border-indigo-600 outline-none text-slate-900 bg-white" 
                        placeholder="Foam Wash, 300, 400, 500, 800" 
                        value={importText} 
                        onChange={e => setImportText(e.target.value)} 
                      />
                      <div className="mt-6 flex gap-4">
                          <button onClick={() => setIsImportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-lg text-xs font-black uppercase text-slate-500">Cancel</button>
                          <button onClick={handleBulkImport} className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all">Start Batch Import</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
