
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { PurchaseOrder } from '../types.ts';
import { ShoppingCart, FileText, Plus, X, Calendar, User, Tag, Hash, DollarSign, Calculator, ShoppingBag } from 'lucide-react';

export const PurchaseModule: React.FC = () => {
  const { purchases, addPurchase } = useERP();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    docNumber: '',
    vendorName: '',
    itemName: '',
    quantity: 1,
    unit: 'Units',
    rate: 0,
    category: 'GENERAL_EXPENSE' as PurchaseOrder['category']
  });

  const totalAmount = formData.quantity * formData.rate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPurchase: PurchaseOrder = {
      id: `po-${Date.now()}`,
      ...formData,
      amount: totalAmount,
      status: 'PAID'
    };
    addPurchase(newPurchase);
    setIsAddModalOpen(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      docNumber: '',
      vendorName: '',
      itemName: '',
      quantity: 1,
      unit: 'Units',
      rate: 0,
      category: 'GENERAL_EXPENSE'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Purchase Registry</h2>
          <p className="text-xs text-slate-500 font-medium">Record Expenses & Supply Orders</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-red-600 text-white px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wide flex items-center shadow-sm hover:bg-red-700 transition-all"
        >
          <Plus size={18} className="mr-2" /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-slate-900">₹{purchases.reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Suppliers</p>
          <p className="text-2xl font-black text-blue-600">{new Set(purchases.map(p => p.vendorName)).size}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Invoice</p>
          <p className="text-xl font-black text-indigo-600 font-mono">{purchases[purchases.length - 1]?.docNumber || 'N/A'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800 uppercase text-sm">Expense Ledger</h3>
        </div>
        
        {purchases.length === 0 ? (
          <div className="p-12 text-center">
             <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
             <h4 className="text-lg font-bold text-slate-700 uppercase">No Expenses</h4>
             <p className="text-slate-400 text-sm">Start recording outflows to see data here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200 font-bold text-[10px] uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3 text-center">Quantity</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="text-slate-900 font-bold">{po.date}</div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">{po.docNumber || '-'}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-slate-900 font-bold">{po.vendorName}</div>
                      <div className="text-[10px] text-blue-600 uppercase">{po.itemName}</div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {po.quantity} <span className="text-[10px] text-slate-400">{po.unit}</span>
                    </td>
                    <td className="px-6 py-3 text-right font-black text-slate-900">
                      ₹{po.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden text-black">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-black uppercase">Record Expense</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date</label>
                       <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ref / Invoice #</label>
                       <input required placeholder="INV-123" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Supplier</label>
                       <input required value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Item</label>
                       <input required value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Qty</label>
                       <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unit</label>
                       <input required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rate (₹)</label>
                       <input type="number" step="0.01" required value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white" />
                    </div>
                 </div>
                 <div className="bg-slate-100 p-3 rounded flex justify-between items-center text-slate-800 mt-2">
                    <span className="font-bold uppercase text-xs">Total</span>
                    <span className="text-lg font-black">₹{totalAmount.toLocaleString()}</span>
                 </div>
                 <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 text-slate-600 font-bold border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="flex-[2] py-2.5 bg-slate-900 text-white font-bold uppercase rounded shadow-sm hover:bg-black">Save Record</button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};
