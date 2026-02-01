import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Trash2, Edit, Search, FileSpreadsheet, Upload, Info, Car } from 'lucide-react';
import { Service, VehicleSegment } from '../types.ts';

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
    setEditingId(null); setFormData(initialFormState); setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    if (!canEdit) return;
    setEditingId(service.id);
    setFormData({
      sku: service.sku, name: service.name, category: service.category, duration: service.durationMinutes,
      price_HATCHBACK: service.prices.HATCHBACK || 0,
      price_SEDAN: service.prices.SEDAN || 0,
      price_SUV_MUV: service.prices.SUV_MUV || 0,
      price_LUXURY: service.prices.LUXURY || 0,
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
        AUTORICKSHAW: 0, AUTOTAXI: 0, BIKE: 0, SCOOTY: 0, BULLET: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
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
      // SEQUENCE (5 COLS): Name, Hatch, Sedan, SUV, Premium
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
    alert(`Imported ${imported.length} services.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-xs text-slate-500 font-medium">Pricing & Segment Menu</p>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Search service name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white text-black font-medium" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center hover:bg-slate-50 transition-all"><Upload size={14} className="mr-2" /> Bulk Import</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-5 py-2 rounded-md text-xs font-bold uppercase flex items-center hover:bg-red-700 transition-all shadow-md"><Plus size={16} className="mr-2" /> New Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
                    <div className="font-bold text-slate-900 text-sm uppercase">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{s.sku}</div>
                  </td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.HATCHBACK || 0}</td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.SEDAN || 0}</td>
                  <td className="px-3 py-4 text-right bg-blue-50/20 font-bold text-slate-800">₹{s.prices.SUV_MUV || 0}</td>
                  <td className="px-3 py-4 text-right bg-red-50/30 font-black text-red-700">₹{s.prices.LUXURY || 0}</td>
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
      
      {/* ADD/EDIT MODAL - CLEANED FOR VISIBILITY */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden text-black animate-fade-in-up">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{editingId ? 'Edit Package Edition' : 'Create New Package'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider">Package Name</label>
                              <input 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full p-2.5 border-2 border-slate-200 rounded-md text-sm font-bold text-slate-900 bg-white focus:border-red-600 outline-none" 
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider">SKU / Code</label>
                              <input 
                                placeholder="AUTO-GEN" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})} 
                                className="w-full p-2.5 border-2 border-slate-200 rounded-md text-sm font-mono font-bold text-slate-600 bg-slate-50" 
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-lg border-2 border-slate-100 grid grid-cols-2 gap-4">
                          <div className="col-span-2 mb-2">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Car size={10}/> Vehicle Pricing (INR)</h4>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Hatchback</label>
                            <input type="number" value={formData.price_HATCHBACK} onChange={e => setFormData({...formData, price_HATCHBACK: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold bg-white text-black"/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Sedan</label>
                            <input type="number" value={formData.price_SEDAN} onChange={e => setFormData({...formData, price_SEDAN: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold bg-white text-black"/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">SUV / MUV</label>
                            <input type="number" value={formData.price_SUV_MUV} onChange={e => setFormData({...formData, price_SUV_MUV: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold bg-white text-black"/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Premium</label>
                            <input type="number" value={formData.price_LUXURY} onChange={e => setFormData({...formData, price_LUXURY: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold bg-white text-black"/>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-500">Cancel</button>
                          <button type="submit" className="flex-[2] py-3 bg-red-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg hover:bg-red-700 transition-all">
                              {editingId ? 'Confirm Update' : 'Finalize Package'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl text-slate-900 animate-fade-in-up">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-indigo-900 uppercase flex items-center gap-2"><FileSpreadsheet size={18}/> Service Batch Uploader</h3>
                      <button onClick={() => setIsImportOpen(false)} className="text-slate-500 hover:text-red-500 transition-all"><X size={24}/></button>
                  </div>
                  <div className="p-8">
                      <div className="p-4 rounded-lg mb-6 border-2 border-indigo-100 bg-indigo-50/50">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-1"><Info size={10}/> STRICT 5 COLUMN SEQUENCE</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Foam Wash, 350, 450, 600, 1000\nFull Polish, 1200, 1500, 1800, 3000");
                                  alert("Example Copied!");
                              }} className="text-[9px] bg-white border border-indigo-200 px-3 py-1 rounded font-black hover:bg-white transition-all">Copy Sample</button>
                          </div>
                          <code className="block bg-white p-3 rounded-md text-[10px] font-mono text-slate-700 border border-indigo-200 shadow-inner">
                             Name, Hatchback Rate, Sedan Rate, SUV Rate, Premium Rate
                          </code>
                      </div>
                      <textarea 
                        className="w-full h-48 p-4 border-2 border-slate-200 rounded-lg font-mono text-xs focus:border-indigo-600 outline-none text-slate-900 bg-white shadow-inner" 
                        placeholder="Service Name, 300, 400, 500, 800" 
                        value={importText} 
                        onChange={e => setImportText(e.target.value)} 
                      />
                      <div className="mt-6 flex gap-4">
                          <button onClick={() => setIsImportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-500">Cancel</button>
                          <button onClick={handleBulkImport} className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg hover:bg-indigo-700 transition-all">Begin Import</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
