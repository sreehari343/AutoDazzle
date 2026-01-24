import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Upload, Trash2, Edit, Search, FileSpreadsheet, Info, Car } from 'lucide-react';
import { Service } from '../types.ts';

// MOVE HELPERS OUTSIDE TO FIX FOCUS BUG (NO MORE CLICKING AFTER EVERY DIGIT)
const PricingInput = ({ label, field, value, onChange }: { label: string, field: string, value: number, onChange: (val: number) => void }) => (
  <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">{label} Rate (₹)</label>
      <input 
          type="number" 
          value={value === 0 ? '' : value} 
          onChange={e => onChange(parseFloat(e.target.value) || 0)} 
          className="w-full p-3 border-2 border-slate-200 rounded-md text-sm font-black text-slate-900 bg-white focus:border-red-600 focus:ring-4 focus:ring-red-600/5 outline-none transition-all" 
      />
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
    price_HATCHBACK: 0, price_SEDAN: 0, price_SUV_MUV: 0, price_LUXURY: 0,
    price_AUTORICKSHAW: 0, price_AUTOTAXI: 0, price_BIKE: 0, price_SCOOTY: 0, price_BULLET: 0,
    price_PICKUP_SMALL: 0, price_PICKUP_LARGE: 0
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
      price_LUXURY: service.prices.LUXURY || 0,
      price_AUTORICKSHAW: service.prices.AUTORICKSHAW || 0,
      price_AUTOTAXI: service.prices.AUTOTAXI || 0,
      price_BIKE: service.prices.BIKE || 0,
      price_SCOOTY: service.prices.SCOOTY || 0,
      price_BULLET: service.prices.BULLET || 0,
      price_PICKUP_SMALL: service.prices.PICKUP_SMALL || 0,
      price_PICKUP_LARGE: service.prices.PICKUP_LARGE || 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    if (window.confirm("Delete this service permanently?")) deleteService(id);
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
        AUTORICKSHAW: formData.price_AUTORICKSHAW, 
        AUTOTAXI: formData.price_AUTOTAXI, 
        BIKE: formData.price_BIKE, 
        SCOOTY: formData.price_SCOOTY,
        BULLET: formData.price_BULLET, 
        PICKUP_SMALL: formData.price_PICKUP_SMALL, 
        PICKUP_LARGE: formData.price_PICKUP_LARGE,
      },
      durationMinutes: formData.duration, 
      category: formData.category
    };
    editingId ? updateService(servicePayload) : addService(servicePayload);
    setIsModalOpen(false);
  };

  const handleBulkImport = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    const imported: Service[] = lines.map((line, idx) => {
      const p = line.split(',').map(s => s.trim());
      // STRICT 5 COLS: [0]Name, [1]Hatch, [2]Sedan, [3]SUV, [4]Premium
      return {
          id: `si-${Date.now()}-${idx}`,
          sku: `SVC-${1000 + idx + services.length}`,
          name: p[0] || 'Unknown Service',
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
    alert(`Successfully imported ${imported.length} services.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Pricing Menu</p>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Search service name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-md text-sm bg-slate-50 text-slate-900 font-bold outline-none focus:border-red-600 transition-all" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-md text-xs font-black shadow-sm flex items-center uppercase hover:bg-slate-50 transition-all tracking-wider"><Upload size={14} className="mr-2" /> Bulk Import</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-5 py-2.5 rounded-md text-xs font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all tracking-wider"><Plus size={16} className="mr-2" /> Add Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest">Service Details</th>
                <th className="px-3 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">Hatchback</th>
                <th className="px-3 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">Sedan</th>
                <th className="px-3 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-blue-900/50">SUV / MUV</th>
                <th className="px-3 py-4 font-black uppercase text-[10px] tracking-widest text-right bg-red-900/50">Premium</th>
                {canEdit && <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-center">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 text-sm uppercase">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter mt-0.5">{s.sku}</div>
                  </td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.HATCHBACK?.toLocaleString() || 0}</td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.SEDAN?.toLocaleString() || 0}</td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.SUV_MUV?.toLocaleString() || 0}</td>
                  <td className="px-3 py-4 text-right bg-red-50/30 font-black text-red-700">₹{s.prices.LUXURY?.toLocaleString() || 0}</td>
                  {canEdit && (
                      <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEdit(s)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-all"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-all"><Trash2 size={16}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ADD/EDIT MODAL - HIGH CONTRAST & NO FOCUS BUG */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 animate-fade-in-up border-4 border-slate-900">
                  <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingId ? 'Edit Package Rates' : 'Create New Package'}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update pricing for all segments</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-red-600 hover:text-white transition-all"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Package Name</label>
                              <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full p-3 border-2 border-slate-200 rounded-md text-sm font-black text-slate-900 bg-white focus:border-red-600 outline-none" 
                                placeholder="e.g. Foam Wash"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">SKU / Code</label>
                              <input 
                                placeholder="AUTO-GEN" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})} 
                                className="w-full p-3 border-2 border-slate-200 rounded-md text-sm font-mono font-bold text-slate-600 bg-slate-50" 
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-100 space-y-6">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <Car size={14} className="text-red-600"/> Multi-Segment Rates (INR)
                          </h4>
                          <div className="grid grid-cols-2 gap-6">
                              <PricingInput label="Hatchback" field="price_HATCHBACK" value={formData.price_HATCHBACK} onChange={(val) => setFormData({...formData, price_HATCHBACK: val})} />
                              <PricingInput label="Sedan" field="price_SEDAN" value={formData.price_SEDAN} onChange={(val) => setFormData({...formData, price_SEDAN: val})} />
                              <PricingInput label="SUV / MUV" field="price_SUV_MUV" value={formData.price_SUV_MUV} onChange={(val) => setFormData({...formData, price_SUV_MUV: val})} />
                              <PricingInput label="Premium / Luxury" field="price_LUXURY" value={formData.price_LUXURY} onChange={(val) => setFormData({...formData, price_LUXURY: val})} />
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-200 rounded-lg text-xs font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                          <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-lg text-xs font-black uppercase shadow-xl hover:bg-black transition-all transform hover:-translate-y-0.5 tracking-widest">
                              {editingId ? 'Save Changes' : 'Create Package'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl text-slate-900 animate-fade-in-up border-4 border-indigo-900">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-indigo-900 uppercase flex items-center gap-2"><FileSpreadsheet size={18}/> Service Batch Uploader</h3>
                      <button onClick={() => setIsImportOpen(false)} className="p-1 bg-slate-200 rounded text-slate-500 hover:text-red-500 transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-8 text-black">
                      <div className="p-4 rounded-lg mb-6 border-2 border-indigo-100 bg-indigo-50/50">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-1"><Info size={10}/> STRICT 5 COLUMN SEQUENCE</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Foam Wash, 350, 450, 600, 1000\nInterior Detail, 1200, 1500, 1800, 3000");
                                  alert("Copy successful!");
                              }} className="text-[9px] bg-white border border-indigo-200 px-3 py-1 rounded font-black uppercase hover:bg-white transition-all shadow-sm">Copy Sample</button>
                          </div>
                          <code className="block bg-white p-3 rounded-md text-[10px] font-mono text-slate-700 border border-indigo-200 shadow-inner">
                             Name, Hatch Rate, Sedan Rate, SUV Rate, Premium Rate
                          </code>
                      </div>
                      <textarea 
                        className="w-full h-48 p-4 border-2 border-slate-200 rounded-lg font-mono text-xs focus:border-indigo-600 outline-none text-slate-900 bg-white shadow-inner" 
                        placeholder="Foam Wash, 300, 400, 500, 800" 
                        value={importText} 
                        onChange={e => setImportText(e.target.value)} 
                      />
                      <div className="mt-6 flex gap-4">
                          <button onClick={() => setIsImportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-lg text-xs font-black uppercase text-slate-500">Cancel</button>
                          <button onClick={handleBulkImport} className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all">Process Bulk Upload</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
