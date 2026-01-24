import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Upload, Trash2, Edit, Search, FileSpreadsheet, Copy, Car, Table } from 'lucide-react';
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
    if (window.confirm("Delete this service?")) deleteService(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const servicePayload: Service = {
      id: editingId || `s-${Date.now()}`,
      sku: formData.sku || `SVC-${services.length + 1}`,
      name: formData.name,
      basePrice: formData.price_HATCHBACK, 
      prices: {
        HATCHBACK: formData.price_HATCHBACK, SEDAN: formData.price_SEDAN, SUV_MUV: formData.price_SUV_MUV, LUXURY: formData.price_LUXURY,
        AUTORICKSHAW: formData.price_AUTORICKSHAW, AUTOTAXI: formData.price_AUTOTAXI, BIKE: formData.price_BIKE, SCOOTY: formData.price_SCOOTY,
        BULLET: formData.price_BULLET, PICKUP_SMALL: formData.price_PICKUP_SMALL, PICKUP_LARGE: formData.price_PICKUP_LARGE,
      },
      durationMinutes: formData.duration, category: formData.category
    };
    editingId ? updateService(servicePayload) : addService(servicePayload);
    setIsModalOpen(false);
  };

  const handleBulkImport = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    const imported: Service[] = lines.map((line, idx) => {
      const p = line.split(',').map(s => s.trim());
      // Expecting: Name, Hatch, Sedan, SUV, Premium
      return {
          id: `si-${Date.now()}-${idx}`,
          sku: `SVC-${Math.floor(1000 + Math.random() * 9000)}`,
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
    alert(`Imported ${imported.length} services!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Service Menu</h2>
          <p className="text-xs text-slate-500 font-medium">Pricing & Packages</p>
        </div>
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white" />
        </div>
        <div className="flex gap-2">
          {canEdit && (
             <>
                <button onClick={() => setIsImportOpen(true)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center uppercase"><Upload size={16} className="mr-2" /> Bulk Import</button>
                <button onClick={handleOpenAdd} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center uppercase"><Plus size={16} className="mr-2" /> Add Service</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold uppercase text-[10px]">Service Name</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">Hatchback</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">Sedan</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">SUV/MUV</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-purple-50/50">Premium</th>
                {canEdit && <th className="px-4 py-3 font-bold uppercase text-[10px] text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{s.name} <span className="text-[9px] text-slate-400 font-mono ml-2 uppercase">{s.sku}</span></td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.HATCHBACK || 0}</td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.SEDAN || 0}</td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.SUV_MUV || 0}</td>
                  <td className="px-3 py-3 text-right bg-purple-50/30 font-bold text-purple-700">₹{s.prices.LUXURY || 0}</td>
                  {canEdit && (
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                          <button onClick={() => handleOpenEdit(s)} className="text-blue-600 bg-blue-50 p-1.5 rounded"><Edit size={14}/></button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-600 bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-lg shadow-2xl text-black">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 uppercase flex items-center gap-2"><FileSpreadsheet size={18}/> Service Bulk Importer</h3>
                      <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <div className="p-4 rounded-lg mb-4 border bg-red-50 border-red-100">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="text-[10px] font-black uppercase text-red-800">CSV Column Sequence</h4>
                              <button onClick={() => {
                                  navigator.clipboard.writeText("Foam Wash, 350, 450, 600, 1000\nFull Polish, 1200, 1500, 1800, 3000");
                                  alert("Copied!");
                              }} className="text-[9px] bg-white border px-2 py-1 rounded font-bold">Copy Example</button>
                          </div>
                          <code className="block bg-white p-2 rounded text-[10px] font-mono text-slate-600">Name, Hatchback, Sedan, SUV, Premium</code>
                      </div>
                      <textarea className="w-full h-48 p-3 border rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none text-black" placeholder="Wash, 300, 400, 500, 800" value={importText} onChange={e => setImportText(e.target.value)} />
                      <div className="mt-4 flex justify-end gap-3">
                          <button onClick={() => setIsImportOpen(false)} className="px-4 py-2 border rounded-md text-xs font-bold uppercase">Cancel</button>
                          <button onClick={handleBulkImport} className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase">Import Services</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
