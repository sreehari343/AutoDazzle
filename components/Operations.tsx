import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Trash2, Edit, Search, FileSpreadsheet, Upload, Info, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import { Service, VehicleSegment } from '../types.ts';

export const Operations: React.FC = () => {
  const { services, addService, updateService, deleteService, bulkAddServices, currentUserRole } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  
  const canEdit = currentUserRole !== 'STAFF';

  const initialFormState = {
    sku: '', name: '', category: 'WASHING' as Service['category'], duration: 30,
    price_HATCHBACK: 0, price_SEDAN: 0, price_SUV_MUV: 0, price_LUXURY: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const filteredServices = services.filter(s => 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
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
      sku: service.sku || '', 
      name: service.name || '', 
      category: service.category || 'WASHING', 
      duration: service.durationMinutes || 30,
      price_HATCHBACK: service.prices?.HATCHBACK || 0,
      price_SEDAN: service.prices?.SEDAN || 0,
      price_SUV_MUV: service.prices?.SUV_MUV || 0,
      price_LUXURY: service.prices?.LUXURY || 0,
    });
    setIsModalOpen(true);
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

  const cleanPrice = (val: string) => parseFloat(val?.replace(/[^0-9.]/g, '') || '0');

  const handleBulkImport = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    try {
        const imported: Service[] = lines.map((line, idx) => {
          const parts = line.split(',').map(s => s.trim());
          if (parts.length < 5) return null;
          
          const name = parts[0];
          const hatch = cleanPrice(parts[1]);
          const sedan = cleanPrice(parts[2]);
          const suv = cleanPrice(parts[3]);
          const lux = cleanPrice(parts[4]);

          return {
              id: `si-${Date.now()}-${idx}`,
              sku: `SVC-${1000 + idx + services.length}`,
              name: name || 'Imported Service',
              category: 'WASHING', 
              basePrice: hatch,
              durationMinutes: 30,
              prices: {
                  HATCHBACK: hatch, SEDAN: sedan, SUV_MUV: suv, LUXURY: lux,
                  BIKE: 0, SCOOTY: 0, BULLET: 0, AUTORICKSHAW: 0, AUTOTAXI: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
              }
          };
        }).filter((s): s is Service => s !== null);

        if (imported.length > 0) {
            bulkAddServices(imported);
            setImportFeedback(`✅ Successfully imported ${imported.length} packages!`);
            setTimeout(() => {
                setIsImportOpen(false);
                setImportText('');
                setImportFeedback(null);
            }, 1500);
        } else {
            setImportFeedback(`❌ Invalid data format. Check your columns.`);
        }
    } catch (err) {
        setImportFeedback(`❌ Error processing import. Check text format.`);
    }
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
             <input type="text" placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-md text-sm bg-white text-black font-bold focus:border-red-600 outline-none" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-md text-xs font-black uppercase flex items-center hover:bg-slate-50 transition-all shadow-sm"><Upload size={14} className="mr-2" /> Bulk Importer</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-5 py-2 rounded-md text-xs font-black uppercase flex items-center hover:bg-red-700 transition-all shadow-md"><Plus size={16} className="mr-2" /> New Package</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-white border-b border-slate-800 font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Service Details</th>
                <th className="px-3 py-4 text-right bg-blue-900/50">Hatchback</th>
                <th className="px-3 py-4 text-right bg-blue-900/50">Sedan</th>
                <th className="px-3 py-4 text-right bg-blue-900/50">SUV / MUV</th>
                <th className="px-3 py-4 text-right bg-red-900/50">Premium</th>
                {canEdit && <th className="px-6 py-4 text-center">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 text-sm uppercase">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{s.sku}</div>
                  </td>
                  <td className="px-3 py-4 text-right font-black text-slate-800">₹{s.prices.HATCHBACK || 0}</td>
                  <td className="px-3 py-4 text-right font-black text-slate-800">₹{s.prices.SEDAN || 0}</td>
                  <td className="px-3 py-4 text-right font-black text-slate-800">₹{s.prices.SUV_MUV || 0}</td>
                  <td className="px-3 py-4 text-right font-black text-red-700 bg-red-50/20">₹{s.prices.LUXURY || 0}</td>
                  {canEdit && (
                      <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEdit(s)} className="p-2 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-200 rounded-md transition-all shadow-sm"><Edit size={16}/></button>
                            <button onClick={() => { if(window.confirm("Delete this service permanently?")) deleteService(s.id); }} className="p-2 text-red-600 bg-red-50 border border-red-100 hover:bg-red-200 rounded-md transition-all shadow-sm"><Trash2 size={16}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-black animate-fade-in-up border-[8px] border-slate-900">
                  <div className="p-6 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingId ? 'Modify Service Rates' : 'New Package Definition'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={32}/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white text-black">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-600 uppercase block tracking-widest">Service Description</label>
                              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border-4 border-slate-100 rounded-xl text-lg font-black text-slate-900 bg-white outline-none focus:border-red-600 shadow-sm" placeholder="e.g. Interior Cleaning" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-600 uppercase block tracking-widest">Internal SKU Code</label>
                              <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-4 border-4 border-slate-100 rounded-xl text-sm font-mono font-black text-slate-500 bg-slate-50" placeholder="SVC-AUTO" />
                          </div>
                      </div>

                      <div className="bg-slate-100 p-8 rounded-3xl border-4 border-slate-200">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Car size={16}/> Segment Base Rates (INR)
                          </h4>
                          <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-900 uppercase block">Hatchback</label>
                                <input type="number" required value={formData.price_HATCHBACK} onChange={e => setFormData({...formData, price_HATCHBACK: parseFloat(e.target.value) || 0})} className="w-full p-4 border-4 border-white rounded-xl text-xl font-black bg-white text-slate-900 shadow-md outline-none focus:border-blue-600" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-900 uppercase block">Sedan</label>
                                <input type="number" required value={formData.price_SEDAN} onChange={e => setFormData({...formData, price_SEDAN: parseFloat(e.target.value) || 0})} className="w-full p-4 border-4 border-white rounded-xl text-xl font-black bg-white text-slate-900 shadow-md outline-none focus:border-blue-600" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-900 uppercase block">SUV / MUV</label>
                                <input type="number" required value={formData.price_SUV_MUV} onChange={e => setFormData({...formData, price_SUV_MUV: parseFloat(e.target.value) || 0})} className="w-full p-4 border-4 border-white rounded-xl text-xl font-black bg-white text-slate-900 shadow-md outline-none focus:border-blue-600" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-red-700 uppercase block">Luxury / Premium</label>
                                <input type="number" required value={formData.price_LUXURY} onChange={e => setFormData({...formData, price_LUXURY: parseFloat(e.target.value) || 0})} className="w-full p-4 border-4 border-white rounded-xl text-xl font-black bg-white text-red-600 shadow-md outline-none focus:border-red-600" />
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border-4 border-slate-100 rounded-2xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50">Cancel</button>
                          <button type="submit" className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase shadow-2xl hover:bg-black transition-all active:scale-95">Commit Package Details</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl text-black border-4 border-indigo-900 overflow-hidden">
                  <div className="p-6 border-b-2 bg-slate-50 flex justify-between items-center">
                      <h3 className="text-lg font-black text-indigo-900 uppercase flex items-center gap-2"><FileSpreadsheet size={18}/> Service Batch Uploader</h3>
                      <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8">
                      {importFeedback ? (
                          <div className={`p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4 ${importFeedback.includes('✅') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                             {importFeedback.includes('✅') ? <CheckCircle2 size={48} className="text-emerald-500"/> : <AlertCircle size={48} className="text-red-500"/>}
                             <p className="text-lg font-black uppercase">{importFeedback}</p>
                          </div>
                      ) : (
                          <>
                            <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-100 mb-6 text-black">
                              <p className="text-[10px] font-black uppercase text-indigo-800 mb-2">Required Format (CSV):</p>
                              <code className="block bg-white p-3 rounded font-mono text-[10px] text-slate-700">Name, Hatchback, Sedan, SUV, Premium</code>
                              <p className="text-[9px] text-slate-400 mt-2 italic">Example: Basic Wash, 300, 400, 500, 800</p>
                            </div>
                            <textarea className="w-full h-48 p-4 border-4 border-slate-100 rounded-xl font-mono text-xs text-black bg-white outline-none focus:border-indigo-600" placeholder="Foam Wash, 300, 400, 500, 800" value={importText} onChange={e => setImportText(e.target.value)} />
                            <div className="mt-6 flex gap-4">
                                <button onClick={() => setIsImportOpen(false)} className="flex-1 py-4 border-2 rounded-xl text-xs font-black uppercase text-slate-400">Cancel</button>
                                <button onClick={handleBulkImport} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-xl hover:bg-indigo-700">Execute Import</button>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
