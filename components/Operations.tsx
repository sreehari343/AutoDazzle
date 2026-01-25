import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Upload, Trash2, Edit, Search, FileSpreadsheet, Info, Car } from 'lucide-react';
import { Service } from '../types.ts';

// PRICING INPUT HELPER - CRYSTAL CLEAR UI
const PricingField = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
  <div className="space-y-1">
      <label className="text-[12px] font-black text-slate-800 uppercase block tracking-widest">{label} Rate (INR)</label>
      <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
          <input 
              type="number" 
              value={value === 0 ? '' : value} 
              onChange={e => onChange(parseFloat(e.target.value) || 0)} 
              className="w-full p-4 pl-8 border-2 border-slate-300 rounded-xl text-lg font-black text-black bg-white focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none shadow-sm transition-all" 
              placeholder="0.00"
          />
      </div>
  </div>
);

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
    price_HATCHBACK: 0, price_SEDAN: 0, price_SUV_MUV: 0, price_LUXURY: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null); 
    setFormData(initialFormState); 
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    if (!canEdit) return;
    setEditingId(service.id);
    setFormData({
      sku: service.sku, 
      name: service.name, 
      category: service.category, 
      duration: service.durationMinutes,
      price_HATCHBACK: service.prices.HATCHBACK || 0,
      price_SEDAN: service.prices.SEDAN || 0,
      price_SUV_MUV: service.prices.SUV_MUV || 0,
      price_LUXURY: service.prices.LUXURY || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    if (window.confirm("Confirm: Permanently delete this service?")) deleteService(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const servicePayload: Service = {
      id: editingId || `s-${Date.now()}`,
      sku: formData.sku || `SVC-${services.length + 1}`,
      name: formData.name,
      basePrice: formData.price_HATCHBACK, 
      prices: {
        HATCHBACK: formData.price_HATCHBACK, 
        SEDAN: formData.price_SEDAN, 
        SUV_MUV: formData.price_SUV_MUV, 
        LUXURY: formData.price_LUXURY,
        AUTORICKSHAW: 0, AUTOTAXI: 0, BIKE: 0, SCOOTY: 0, BULLET: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
      },
      durationMinutes: formData.duration, 
      category: formData.category
    };
    editingId ? updateService(servicePayload) : addService(servicePayload);
    setIsModalOpen(false);
  };

  const cleanNum = (val: string) => {
    if (!val || val.trim() === '') return 0;
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || 0;
  };

  const handleBulkImport = () => {
    const lines = importText.split('\n').filter(l => l.trim() && !l.toLowerCase().includes('name'));
    const imported: Service[] = lines.map((line, idx) => {
      const p = line.split(',').map(s => s.trim());
      // STRICT 5 COLS: [0]Name, [1]Hatch, [2]Sedan, [3]SUV, [4]Premium
      return {
          id: `si-${Date.now()}-${idx}`,
          sku: `SVC-${1000 + idx + services.length}`,
          name: p[0] || 'Imported Service',
          category: 'WASHING', 
          basePrice: cleanNum(p[1]),
          durationMinutes: 30,
          prices: {
              HATCHBACK: cleanNum(p[1]),
              SEDAN: cleanNum(p[2]),
              SUV_MUV: cleanNum(p[3]),
              LUXURY: cleanNum(p[4]),
              BIKE: 0, SCOOTY: 0, BULLET: 0, AUTORICKSHAW: 0, AUTOTAXI: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
          }
      };
    });
    bulkAddServices(imported);
    setIsImportOpen(false);
    setImportText('');
    alert(`Successfully imported ${imported.length} services.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Menu</p>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Filter packages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-lg text-sm bg-slate-50 text-black font-bold outline-none focus:border-red-600 transition-all" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-[10px] font-black shadow-sm flex items-center uppercase hover:bg-slate-50 transition-all tracking-wider"><Upload size={14} className="mr-2" /> Bulk CSV</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all tracking-wider"><Plus size={16} className="mr-2" /> New Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest">Package Details</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">Hatchback</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">Sedan</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">SUV / MUV</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-red-900/50">Premium</th>
                {canEdit && <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-center">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 text-sm uppercase">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{s.sku}</div>
                  </td>
                  <td className="px-4 py-4 text-right bg-blue-50/20 font-bold text-slate-900">₹{s.prices.HATCHBACK?.toLocaleString() || 0}</td>
                  <td className="px-4 py-4 text-right bg-blue-50/20 font-bold text-slate-900">₹{s.prices.SEDAN?.toLocaleString() || 0}</td>
                  <td className="px-4 py-4 text-right bg-blue-50/20 font-bold text-slate-900">₹{s.prices.SUV_MUV?.toLocaleString() || 0}</td>
                  <td className="px-4 py-4 text-right bg-red-50/30 font-black text-red-700">₹{s.prices.LUXURY?.toLocaleString() || 0}</td>
                  {canEdit && (
                      <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEdit(s)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all shadow-sm border border-blue-100"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all shadow-sm border border-red-100"><Trash2 size={16}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* EDIT MODAL - ULTRA VISIBILITY OVERHAUL */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 border-4 border-slate-900 animate-fade-in-up">
                  <div className="p-8 border-b-4 border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-2xl font-black text-black uppercase tracking-tight">{editingId ? 'Edit Package Rates' : 'Create New Package'}</h3>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Universal Service Pricing Engine</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white rounded-full text-slate-500 border-2 border-slate-300 hover:text-red-600 hover:border-red-600 transition-all shadow-md"><X size={28}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[12px] font-black text-slate-800 uppercase block tracking-widest">Service Package Title</label>
                              <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full p-4 border-2 border-slate-300 rounded-xl text-lg font-black text-black bg-white focus:border-red-600 focus:ring-4 focus:ring-red-600/5 outline-none shadow-inner" 
                                placeholder="e.g. Foam Wash Deluxe"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[12px] font-black text-slate-800 uppercase block tracking-widest">System Record SKU</label>
                              <input 
                                placeholder="AUTO-GENERATED" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})} 
                                className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-mono font-bold text-slate-700 bg-slate-100" 
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-200 space-y-8 shadow-inner relative">
                          <div className="absolute -top-4 left-6 px-4 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg">Rate Matrix</div>
                          <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 border-b-2 border-slate-200 pb-4">
                             <Car size={20} className="text-red-600"/> PRICING BY VEHICLE SEGMENT
                          </h4>
                          <div className="grid grid-cols-2 gap-8">
                              <PricingField label="Hatchback" value={formData.price_HATCHBACK} onChange={(val) => setFormData({...formData, price_HATCHBACK: val})} />
                              <PricingField label="Sedan" value={formData.price_SEDAN} onChange={(val) => setFormData({...formData, price_SEDAN: val})} />
                              <PricingField label="SUV / MUV" value={formData.price_SUV_MUV} onChange={(val) => setFormData({...formData, price_SUV_MUV: val})} />
                              <PricingField label="Premium / Luxury" value={formData.price_LUXURY} onChange={(val) => setFormData({...formData, price_LUXURY: val})} />
                          </div>
                      </div>

                      <div className="flex gap-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border-2 border-slate-300 rounded-2xl text-xs font-black uppercase text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all">Abort Changes</button>
                          <button type="submit" className="flex-[2] py-5 bg-black text-white rounded-2xl text-sm font-black uppercase shadow-2xl hover:bg-slate-900 transition-all transform hover:-translate-y-1 active:translate-y-0 tracking-[0.2em]">
                              {editingId ? 'Push Updates to Menu' : 'Finalize New Service'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl text-black border-4 border-indigo-900 animate-fade-in-up">
                  <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-black text-indigo-900 uppercase flex items-center gap-2"><FileSpreadsheet size={24}/> Service Batch Importer</h3>
                      <button onClick={() => setIsImportOpen(false)} className="p-2 bg-white rounded-full text-slate-500 border border-slate-200 hover:text-red-500 transition-all shadow-sm"><X size={24}/></button>
                  </div>
                  <div className="p-10">
                      <div className="p-6 rounded-2xl mb-8 border-2 border-indigo-100 bg-indigo-50/50">
                          <div className="flex justify-between items-start mb-4">
                              <h4 className="text-[11px] font-black uppercase text-indigo-800 flex items-center gap-2 tracking-widest"><Info size={14}/> Column Sequence (5 Cols)</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Foam Wash, 350, 450, 600, 1000");
                                  alert("Copied to clipboard!");
                              }} className="text-[10px] bg-white border-2 border-indigo-200 px-4 py-1.5 rounded-lg font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-md">Copy Sample</button>
                          </div>
                          <code className="block bg-white p-4 rounded-xl text-xs font-mono text-slate-700 border-2 border-indigo-100 shadow-inner">
                             Name, Hatchback Rate, Sedan Rate, SUV Rate, Premium Rate
                          </code>
                      </div>
                      <textarea 
                        className="w-full h-56 p-5 border-2 border-slate-300 rounded-2xl font-mono text-sm focus:border-indigo-600 outline-none text-black bg-white shadow-inner" 
                        placeholder="Foam Wash Deluxe, 300, 400, 500, 800" 
                        value={importText} 
                        onChange={e => setImportText(e.target.value)} 
                      />
                      <div className="mt-8 flex gap-6">
                          <button onClick={() => setIsImportOpen(false)} className="flex-1 py-4 border-2 border-slate-300 rounded-2xl text-xs font-black uppercase text-slate-500 bg-white">Cancel</button>
                          <button onClick={handleBulkImport} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl hover:bg-indigo-700 transition-all tracking-widest">Begin Bulk Import</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
