import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Upload, Info, Trash2, Edit, Search, Lock, FileSpreadsheet, Copy, Car, Bike, Truck, Table } from 'lucide-react';
import { Service, VehicleSegment } from '../types.ts';

export const Operations: React.FC = () => {
  const { services, addService, updateService, deleteService, bulkAddServices, currentUserRole } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'BASIC' | 'PROFESSIONAL'>('PROFESSIONAL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const canEdit = currentUserRole !== 'STAFF';

  const initialFormState = {
    sku: '',
    name: '',
    category: 'WASHING' as Service['category'],
    duration: 30,
    price_HATCHBACK: 0,
    price_SEDAN: 0,
    price_SUV_MUV: 0,
    price_LUXURY: 0,
    price_AUTORICKSHAW: 0,
    price_AUTOTAXI: 0,
    price_BIKE: 0,
    price_SCOOTY: 0,
    price_BULLET: 0,
    price_PICKUP_SMALL: 0,
    price_PICKUP_LARGE: 0
  };

  const [formData, setFormData] = useState(initialFormState);
  const [importText, setImportText] = useState('');

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (window.confirm("Are you sure you want to delete this service?")) {
      deleteService(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
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

    if (editingId) {
      updateService(servicePayload);
    } else {
      addService(servicePayload);
    }
    
    setIsModalOpen(false);
  };

  const handleBulkImport = () => {
    if (!canEdit) return;
    const lines = importText.split('\n').filter(l => l.trim());
    
    const imported: Service[] = lines.map((line, idx) => {
      const p = line.split(',').map(s => s.trim());
      
      if (importFormat === 'PROFESSIONAL' && p.length >= 6) {
          // Professional CSV Format: Name, Category, Hatch Price, Sedan Price, SUV Price, Premium/Luxury Price
          return {
              id: `si-${Date.now()}-${idx}`,
              sku: `SVC-${Math.floor(1000 + Math.random() * 9000)}`,
              name: p[0],
              category: (p[1] as any) || 'WASHING',
              basePrice: parseFloat(p[2]) || 0,
              durationMinutes: 30,
              prices: {
                  HATCHBACK: parseFloat(p[2]) || 0,
                  SEDAN: parseFloat(p[3]) || 0,
                  SUV_MUV: parseFloat(p[4]) || 0,
                  LUXURY: parseFloat(p[5]) || 0,
                  // Default minor segments if not provided
                  BIKE: 0, SCOOTY: 0, BULLET: 0, AUTORICKSHAW: 0, AUTOTAXI: 0, PICKUP_SMALL: 0, PICKUP_LARGE: 0
              }
          };
      } else {
          // Basic Format: Name, Price
          const base = parseFloat(p[1] || '0');
          return {
            id: `si-${Date.now()}-${idx}`,
            sku: `SVC-${Math.floor(1000 + Math.random() * 9000)}`,
            name: p[0] || `Service ${idx}`,
            basePrice: base,
            prices: {
                HATCHBACK: base,
                SEDAN: Math.round(base * 1.2),
                SUV_MUV: Math.round(base * 1.5),
                LUXURY: Math.round(base * 2.0),
                AUTORICKSHAW: Math.round(base * 0.8),
                AUTOTAXI: Math.round(base * 0.9),
                PICKUP_SMALL: Math.round(base * 1.3),
                PICKUP_LARGE: Math.round(base * 1.6),
                BIKE: 0, SCOOTY: 0, BULLET: 0
            },
            durationMinutes: 30,
            category: 'WASHING'
          };
      }
    });

    bulkAddServices(imported);
    setIsImportOpen(false);
    setImportText('');
    alert(`Successfully imported ${imported.length} services with segment pricing!`);
  };

  const copyTemplate = () => {
      const template = importFormat === 'BASIC' 
        ? "Foam Wash, 350\nInterior Detail, 1200"
        : "Full Detail, DETAILING, 1200, 1500, 1800, 2500\nBody Wash, WASHING, 300, 400, 500, 800";
      navigator.clipboard.writeText(template);
      alert("Professional Template copied!");
  };

  const PricingField = ({ label, value, field }: { label: string, value: number, field: keyof typeof formData }) => (
    <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{label} (₹)</label>
        <input 
            type="number" 
            value={value} 
            onChange={e => setFormData({...formData, [field]: parseFloat(e.target.value) || 0})} 
            className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-black bg-white focus:border-blue-500 outline-none" 
        />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Service Menu</h2>
          <p className="text-xs text-slate-500 font-medium">Manage Service Packages & Pricing</p>
        </div>
        
        <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input 
                type="text" 
                placeholder="Search Services..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
             />
        </div>

        <div className="flex gap-2">
          {canEdit && (
             <>
                <button 
                onClick={() => setIsImportOpen(true)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center uppercase"
                >
                <Upload size={16} className="mr-2" /> Bulk Import
                </button>
                <button 
                onClick={handleOpenAdd}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-red-700 transition-all flex items-center uppercase"
                >
                <Plus size={16} className="mr-2" /> Add Service
                </button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 uppercase text-sm">Services List</h3>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{filteredServices.length} ITEMS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold uppercase text-[10px] sticky left-0 bg-white z-10 border-r border-slate-100">Service Name</th>
                <th className="px-4 py-3 font-bold uppercase text-[10px]">Category</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">Hatchback</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">Sedan</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-blue-50/50">SUV/MUV</th>
                <th className="px-3 py-3 font-bold uppercase text-[10px] text-right bg-purple-50/50">Premium</th>
                {canEdit && <th className="px-4 py-3 font-bold uppercase text-[10px] text-center sticky right-0 bg-white z-10 border-l border-slate-100">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">{s.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          s.category === 'WASHING' ? 'bg-blue-100 text-blue-700' :
                          s.category === 'DETAILING' ? 'bg-purple-100 text-purple-700' :
                          s.category === 'ADDONS' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                          {s.category}
                      </span>
                  </td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.HATCHBACK || 0}</td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.SEDAN || 0}</td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 font-medium">₹{s.prices.SUV_MUV || 0}</td>
                  <td className="px-3 py-3 text-right bg-purple-50/30 font-bold text-purple-700">₹{s.prices.LUXURY || 0}</td>
                  {canEdit && (
                      <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l border-slate-100 text-center">
                          <div className="flex justify-center gap-2">
                              <button onClick={() => handleOpenEdit(s)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded"><Edit size={14}/></button>
                              <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                          </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isImportOpen && canEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl text-black">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800 uppercase flex items-center gap-2">
                          <FileSpreadsheet size={18}/> Bulk Service Importer
                      </h3>
                      <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <div className="flex gap-4 mb-4">
                          <button 
                            onClick={() => setImportFormat('BASIC')}
                            className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-bold uppercase text-xs transition-all ${importFormat === 'BASIC' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                          >
                              <Table size={16}/> Basic (Auto Pricing)
                          </button>
                          <button 
                            onClick={() => setImportFormat('PROFESSIONAL')}
                            className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-bold uppercase text-xs transition-all ${importFormat === 'PROFESSIONAL' ? 'border-red-600 bg-red-50 text-red-800' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                          >
                              <Car size={16}/> Multi-Segment Format
                          </button>
                      </div>

                      <div className={`p-4 rounded-lg mb-4 border ${importFormat === 'BASIC' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="flex justify-between items-start">
                              <h4 className="text-xs font-black uppercase mb-2">CSV Column Sequence</h4>
                              <button onClick={copyTemplate} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 font-bold flex items-center gap-1">
                                  <Copy size={10}/> Copy Sample
                              </button>
                          </div>
                          {importFormat === 'BASIC' ? (
                            <code className="block bg-white p-2 rounded border border-blue-200 text-[10px] font-mono text-slate-600">
                                Service Name, Hatchback Price
                            </code>
                          ) : (
                            <code className="block bg-white p-2 rounded border border-red-200 text-[9px] font-mono text-slate-600 leading-tight">
                                Name, Category, Hatch, Sedan, SUV, Premium
                            </code>
                          )}
                          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                              {importFormat === 'BASIC' 
                                ? "Enter Name and Hatchback price. SUV/Luxury prices will be auto-calculated."
                                : "Map specific rates for all 4 main car categories instantly."}
                          </p>
                      </div>
                      
                      <textarea 
                          className="w-full h-48 p-3 border border-slate-300 rounded-md bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none text-black"
                          placeholder={importFormat === 'BASIC' ? "Foam Wash, 350" : "Foam Wash, WASHING, 300, 400, 500, 800"}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                      />
                      
                      <div className="mt-4 flex justify-end gap-3">
                          <button onClick={() => setIsImportOpen(false)} className="px-4 py-2 border border-slate-300 rounded-md text-xs font-bold uppercase hover:bg-slate-50">Cancel</button>
                          <button onClick={handleBulkImport} className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase hover:bg-black shadow-lg">Import Records</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
