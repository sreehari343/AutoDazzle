import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Trash2, Edit, Search, Car } from 'lucide-react';
import { Service } from '../types.ts';

const PricingInput = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
  <div className="space-y-1">
    <label className="text-[12px] font-black text-black uppercase block tracking-widest">{label} Rate</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-black">₹</span>
      <input 
        type="number" 
        value={value === 0 ? '' : value} 
        onChange={e => onChange(parseFloat(e.target.value) || 0)} 
        className="w-full p-4 pl-10 border-2 border-black rounded-xl text-xl font-black text-black bg-white focus:ring-4 focus:ring-red-600/10 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" 
        placeholder="0.00"
      />
    </div>
  </div>
);

export const Operations: React.FC = () => {
  const { services, addService, updateService, deleteService, currentUserRole } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const canEdit = currentUserRole !== 'STAFF';

  const [formData, setFormData] = useState({
    sku: '', name: '', category: 'WASHING' as Service['category'], duration: 30,
    price_HATCH: 0, price_SEDAN: 0, price_SUV: 0, price_LUX: 0
  });

  const filtered = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

  const handleSave = (e: React.FormEvent) => {
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
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-2 border-slate-100">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rate Management</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold text-black focus:border-red-600 outline-none" />
            </div>
            {canEdit && (
                <button onClick={() => { setEditingId(null); setFormData({sku: '', name: '', category: 'WASHING', duration: 30, price_HATCH: 0, price_SEDAN: 0, price_SUV: 0, price_LUX: 0}); setIsModalOpen(true); }} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all tracking-wider"><Plus size={16} className="mr-2" /> New Service</button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Package Name</th>
              <th className="px-4 py-4 text-right bg-blue-900/50">Hatchback</th>
              <th className="px-4 py-4 text-right bg-blue-900/50">Sedan</th>
              <th className="px-4 py-4 text-right bg-blue-900/50">SUV/MUV</th>
              <th className="px-4 py-4 text-right bg-red-900/50">Luxury</th>
              {canEdit && <th className="px-6 py-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs">{s.name}</td>
                <td className="px-4 py-4 text-right font-bold text-slate-700">₹{s.prices.HATCHBACK?.toLocaleString()}</td>
                <td className="px-4 py-4 text-right font-bold text-slate-700">₹{s.prices.SEDAN?.toLocaleString()}</td>
                <td className="px-4 py-4 text-right font-bold text-slate-700">₹{s.prices.SUV_MUV?.toLocaleString()}</td>
                <td className="px-4 py-4 text-right font-black text-red-600">₹{s.prices.LUXURY?.toLocaleString()}</td>
                {canEdit && (
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleOpenEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16}/></button>
                    <button onClick={() => deleteService(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all ml-2"><Trash2 size={16}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-black border-8 border-black animate-fade-in-up">
            <div className="p-8 border-b-8 border-slate-50 flex justify-between items-center bg-white">
              <h3 className="text-3xl font-black uppercase tracking-tight">{editingId ? 'Update Rates' : 'Create Package'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl border-2 border-black hover:bg-red-600 hover:text-white transition-all"><X size={28}/></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8 bg-white">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Service Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border-2 border-black rounded-xl text-lg font-black text-black bg-white outline-none focus:ring-4 focus:ring-red-600/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">System SKU</label>
                  <input placeholder="AUTO-GEN" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-mono font-black text-slate-400 bg-slate-50" />
                </div>
              </div>
              <div className="bg-slate-50 p-10 rounded-3xl border-4 border-slate-100 grid grid-cols-2 gap-10 shadow-inner">
                <PricingInput label="Hatchback" value={formData.price_HATCH} onChange={v => setFormData({...formData, price_HATCH: v})} />
                <PricingInput label="Sedan" value={formData.price_SEDAN} onChange={v => setFormData({...formData, price_SEDAN: v})} />
                <PricingInput label="SUV/MUV" value={formData.price_SUV} onChange={v => setFormData({...formData, price_SUV: v})} />
                <PricingInput label="Luxury" value={formData.price_LUX} onChange={v => setFormData({...formData, price_LUX: v})} />
              </div>
              <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl text-xl font-black uppercase shadow-2xl hover:bg-red-600 transition-all tracking-widest border-b-8 border-black/20">Save Service Configuration</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
