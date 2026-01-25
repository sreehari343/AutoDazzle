import React, { useState } from 'react';
import { useERP } from '../contexts/ERPContext.tsx';
import { X, Plus, Trash2, Edit, Search, Car } from 'lucide-react';
import { Service } from '../types.ts';

// Visibility Booster Input
const RateInput = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
  <div className="space-y-1">
    <label className="text-[12px] font-black text-black uppercase block tracking-widest">{label} Price (₹)</label>
    <input 
      type="number" 
      value={value || ''} 
      onChange={e => onChange(parseFloat(e.target.value) || 0)} 
      className="w-full p-4 border-4 border-black rounded-xl text-2xl font-black text-black bg-white focus:ring-8 focus:ring-red-600/10 outline-none transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]" 
      placeholder="0"
    />
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
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border-2 border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Service Catalog</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Package Rate Engine</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" placeholder="Search packages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold text-black focus:border-red-600 outline-none w-64" />
            </div>
            {canEdit && (
                <button onClick={() => { setEditingId(null); setFormData({sku: '', name: '', category: 'WASHING', duration: 30, price_HATCH: 0, price_SEDAN: 0, price_SUV: 0, price_LUX: 0}); setIsModalOpen(true); }} className="bg-red-600 text-white px-6 py-3 rounded-lg text-xs font-black shadow-lg flex items-center uppercase hover:bg-red-700 transition-all tracking-wider"><Plus size={18} className="mr-2" /> New Package</button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-4 border-slate-50 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Package Identity</th>
              <th className="px-4 py-5 text-right bg-blue-900/40">Hatchback</th>
              <th className="px-4 py-5 text-right bg-blue-900/40">Sedan</th>
              <th className="px-4 py-5 text-right bg-blue-900/40">SUV/MUV</th>
              <th className="px-4 py-5 text-right bg-red-900/40">Premium</th>
              {canEdit && <th className="px-8 py-5 text-center">Settings</th>}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-5">
                   <div className="font-black text-slate-900 uppercase text-base">{s.name}</div>
                   <div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.sku}</div>
                </td>
                <td className="px-4 py-5 text-right font-black text-slate-700 text-lg">₹{s.prices.HATCHBACK?.toLocaleString()}</td>
                <td className="px-4 py-5 text-right font-black text-slate-700 text-lg">₹{s.prices.SEDAN?.toLocaleString()}</td>
                <td className="px-4 py-5 text-right font-black text-slate-700 text-lg">₹{s.prices.SUV_MUV?.toLocaleString()}</td>
                <td className="px-4 py-5 text-right font-black text-red-600 text-xl">₹{s.prices.LUXURY?.toLocaleString()}</td>
                {canEdit && (
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-3">
                        <button onClick={() => handleOpenEdit(s)} className="p-2.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={18}/></button>
                        <button onClick={() => deleteService(s.id)} className="p-2.5 text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-black border-[12px] border-black animate-fade-in-up">
            <div className="p-10 border-b-8 border-slate-50 flex justify-between items-center bg-white">
              <div>
                 <h3 className="text-4xl font-black uppercase tracking-tighter text-black">{editingId ? 'Edit Package' : 'New Package'}</h3>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Enterprise Pricing Module</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-100 rounded-2xl border-4 border-black hover:bg-red-600 hover:text-white transition-all"><X size={32}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-12 space-y-12 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase text-black tracking-widest">Service Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 border-4 border-black rounded-2xl text-2xl font-black text-black bg-white outline-none focus:ring-8 focus:ring-red-600/5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]" placeholder="Foam Wash..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase text-black tracking-widest">System Identifier (SKU)</label>
                  <input placeholder="AUTO-GEN" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-5 border-4 border-slate-200 rounded-2xl text-2xl font-mono font-black text-slate-400 bg-slate-50 outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 p-12 rounded-[40px] border-4 border-black/10 grid grid-cols-1 md:grid-cols-2 gap-12 shadow-inner">
                <RateInput label="Hatchback" value={formData.price_HATCH} onChange={v => setFormData({...formData, price_HATCH: v})} />
                <RateInput label="Sedan" value={formData.price_SEDAN} onChange={v => setFormData({...formData, price_SEDAN: v})} />
                <RateInput label="SUV / MUV" value={formData.price_SUV} onChange={v => setFormData({...formData, price_SUV: v})} />
                <RateInput label="Luxury / Premium" value={formData.price_LUX} onChange={v => setFormData({...formData, price_LUX: v})} />
              </div>

              <button type="submit" className="w-full py-6 bg-black text-white rounded-[24px] text-2xl font-black uppercase shadow-2xl hover:bg-red-700 hover:-translate-y-1 transition-all tracking-[0.2em] border-b-[10px] border-black/30">
                 Commit Rates to Database
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
