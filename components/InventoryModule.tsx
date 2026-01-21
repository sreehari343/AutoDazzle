
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useERP } from '../contexts/ERPContext.tsx';
import { Package, Plus, AlertTriangle, Trash2, X, Tag, Hash, Truck, DollarSign, Archive, ShieldCheck, Printer, Upload, Download, Beaker, Wrench, BarChart2, Activity, History, ClipboardList, Search, Lock } from 'lucide-react';
import { InventoryItem } from '../types.ts';

export const InventoryModule: React.FC = () => {
  const { inventory, addInventoryItem, deleteInventoryItem, recordStockUsage, bulkAddInventory, accounts, purchases, stockLogs, currentUserRole } = useERP();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [usageSearchTerm, setUsageSearchTerm] = useState('');
  const [mainSearchTerm, setMainSearchTerm] = useState(''); 
  
  const selectedItem = inventory.find(i => i.id === selectedItemId);

  const canEdit = currentUserRole !== 'STAFF';

  const [formData, setFormData] = useState({
    sku: '', name: '', quantity: 0, reorder: 5, cost: 0, supplier: 'CS Car Care', category: 'CHEMICALS' as InventoryItem['category'], unit: 'Units'
  });

  const [usageData, setUsageData] = useState({ quantity: 0, notes: '' });
  const [importText, setImportText] = useState('');

  const totalStockValue = inventory.reduce((sum, i) => sum + (i.quantityOnHand * i.costPerUnit), 0);
  const lowStockCount = inventory.filter(i => i.quantityOnHand <= i.reorderPoint).length;
  const supplierCredit = accounts.find(a => a.code === '2000')?.balance || 0;

  const filteredInventory = inventory.filter(i => 
      i.name.toLowerCase().includes(mainSearchTerm.toLowerCase()) || 
      i.sku.toLowerCase().includes(mainSearchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      quantityOnHand: formData.quantity,
      reorderPoint: formData.reorder,
      costPerUnit: formData.cost,
      supplier: formData.supplier,
      lastRestocked: new Date().toISOString().split('T')[0]
    };
    addInventoryItem(newItem);
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleUsageSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedItemId && usageData.quantity > 0) {
          recordStockUsage(selectedItemId, usageData.quantity, usageData.notes || 'Routine Usage');
          setIsUsageModalOpen(false);
          setUsageData({ quantity: 0, notes: '' });
          setSelectedItemId(null);
          setUsageSearchTerm('');
      } else {
          alert("Please enter a valid quantity greater than 0.");
      }
  };

  const handleBulkImport = () => {
      if (!canEdit) return;
      const lines = importText.split('\n').filter(l => l.trim());
      const items: InventoryItem[] = lines.map((line, idx) => {
          const [sku, name, cat, qty, reorder, cost] = line.split(',').map(s => s.trim());
          return {
              id: `imp-${Date.now()}-${idx}`,
              sku: sku || `IMP-${idx}`,
              name: name || 'Unknown Item',
              category: (cat as any) || 'CHEMICALS',
              unit: 'Units',
              quantityOnHand: parseFloat(qty) || 0,
              reorderPoint: parseFloat(reorder) || 5,
              costPerUnit: parseFloat(cost) || 0,
              supplier: 'CS Car Care', 
              lastRestocked: new Date().toISOString().split('T')[0]
          };
      });
      bulkAddInventory(items);
      setIsImportModalOpen(false);
      setImportText('');
  };

  const resetForm = () => setFormData({ sku: '', name: '', quantity: 0, reorder: 5, cost: 0, supplier: 'CS Car Care', category: 'CHEMICALS', unit: 'Units' });

  const handlePrint = () => {
      window.print();
  };

  const openUsageModal = (itemId?: string) => {
      setSelectedItemId(itemId || null);
      setUsageSearchTerm('');
      setUsageData({ quantity: 0, notes: '' }); 
      setIsUsageModalOpen(true);
  };

  const getStockStatusColor = (current: number, reorder: number) => {
      if (current <= reorder) return 'bg-red-500';
      if (current <= reorder * 1.5) return 'bg-yellow-500';
      return 'bg-emerald-500';
  };

  const searchResults = usageSearchTerm 
    ? inventory.filter(i => i.name.toLowerCase().includes(usageSearchTerm.toLowerCase()) || i.sku.toLowerCase().includes(usageSearchTerm.toLowerCase()))
    : [];

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Stock Management</h2>
            <p className="text-xs text-slate-500 font-medium">Global Inventory Control System</p>
          </div>
          
          <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             <input 
                type="text" 
                placeholder="Search Product Name or SKU..." 
                value={mainSearchTerm} 
                onChange={e => setMainSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
             />
          </div>

          <div className="flex gap-2 shrink-0">
            {canEdit && (
                <>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-bold uppercase shadow-sm hover:bg-slate-50 flex items-center">
                        <Upload size={14} className="mr-2"/> Bulk Import
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide flex items-center hover:bg-red-700 shadow-sm transition-all">
                        <Plus size={16} className="mr-2" /> Add Item
                    </button>
                </>
            )}
            <button onClick={handlePrint} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-xs font-bold uppercase shadow-sm hover:bg-slate-50 flex items-center">
                <Printer size={14} className="mr-2"/> Report
            </button>
            <button onClick={() => openUsageModal()} className="bg-slate-800 text-white px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide flex items-center hover:bg-slate-900 shadow-sm transition-all">
                <ClipboardList size={16} className="mr-2" /> Record Usage
            </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:hidden">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group print:border-black">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={40}/></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-black">Stock Valuation</p>
              <p className="text-2xl font-black text-slate-900 print:text-black">₹{totalStockValue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group print:border-black">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={40} className="text-orange-500"/></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-black">Low Stock Alerts</p>
              <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-orange-500' : 'text-slate-900'} print:text-black`}>{lowStockCount}</p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group print:border-black">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40} className="text-blue-500"/></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-black">Monthly Usage</p>
              <p className="text-2xl font-black text-blue-600 print:text-black">{stockLogs.length} <span className="text-xs font-medium text-slate-400 print:hidden">Events</span></p>
          </div>
          <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-sm relative overflow-hidden group text-white print:bg-white print:text-black print:border-black">
              <div className="absolute top-0 right-0 p-3 opacity-20"><Truck size={40}/></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-black">Supplier Credit</p>
              <p className="text-2xl font-black text-white print:text-black">₹{supplierCredit.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 mt-1 print:hidden">Due to CS Car Care</p>
          </div>
       </div>

       <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
            <h3 className="font-bold text-slate-800 uppercase text-sm flex items-center gap-2"><Package size={16}/> Master Stock List</h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded print:hidden">{filteredInventory.length} SKUs Found</span>
         </div>
         <div className="overflow-x-auto print:overflow-visible">
           <table className="w-full text-sm text-left">
             <thead className="bg-white text-slate-500 border-b border-slate-200 print:text-black">
               <tr>
                 <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wide text-black">Product Details</th>
                 <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wide text-black">Category</th>
                 <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wide w-1/4 text-black">Stock Level</th>
                 <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wide text-right text-black">Value</th>
                 <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wide text-center print:hidden text-black">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredInventory.map(i => {
                 const isLow = i.quantityOnHand <= i.reorderPoint;
                 const percentage = Math.min(100, (i.quantityOnHand / (i.reorderPoint * 3)) * 100);
                 
                 return (
                   <tr key={i.id} className="hover:bg-slate-50 group transition-colors">
                     <td className="px-6 py-3">
                       <div className="font-bold text-black">{i.name}</div>
                       <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-100 px-1 rounded border border-slate-200 print:border-black print:text-black">{i.sku}</span>
                          {isLow && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 rounded uppercase border border-red-100 flex items-center gap-1 print:hidden"><AlertTriangle size={8}/> Reorder</span>}
                       </div>
                     </td>
                     <td className="px-6 py-3">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border print:border-black print:text-black print:bg-white ${
                           i.category === 'CHEMICALS' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                           i.category === 'TOOLS' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                           i.category === 'COMPOUNDS' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                           'bg-slate-50 text-slate-600 border-slate-200'
                       }`}>
                           {i.category}
                       </span>
                     </td>
                     <td className="px-6 py-3 align-middle">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 print:text-black">
                            <span>{i.quantityOnHand} {i.unit}</span>
                            <span className="print:hidden">Target: {i.reorderPoint * 3}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden print:border print:border-black print:bg-white">
                            <div className={`h-full rounded-full print:bg-black ${getStockStatusColor(i.quantityOnHand, i.reorderPoint)}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                     </td>
                     <td className="px-6 py-3 text-right">
                        <div className="font-bold text-black">₹{i.costPerUnit.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 print:hidden">Total: ₹{(i.costPerUnit * i.quantityOnHand).toLocaleString()}</div>
                     </td>
                     <td className="px-6 py-3 text-center print:hidden">
                        <div className="flex justify-center gap-2">
                            <button 
                                onClick={() => openUsageModal(i.id)}
                                title="Record Usage"
                                className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded transition-colors shadow-sm border border-slate-200"
                            >
                                <History size={16}/>
                            </button>
                            {canEdit && (
                                <button 
                                    onClick={() => deleteInventoryItem(i.id)}
                                    title="Remove Item"
                                    className="p-2 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded transition-colors shadow-sm border border-red-100"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
       </div>

       {isAddModalOpen && canEdit && createPortal(
         <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 print:hidden">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh] text-black">
               <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-bold text-black uppercase">New Inventory Item</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
               </div>
               <div className="overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">SKU Code</label>
                      <input 
                        required 
                        value={formData.sku} 
                        onChange={e => setFormData({...formData, sku: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white focus:bg-white text-black transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="AUTO-GEN" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Category</label>
                      <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value as any})}
                         className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                          <option value="CHEMICALS">Chemicals</option>
                          <option value="COMPOUNDS">Compounds</option>
                          <option value="TOOLS">Tools</option>
                          <option value="CONSUMABLES">Consumables</option>
                      </select>
                    </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Product Name</label>
                      <input 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="e.g. 3M Rubbing Compound" 
                      />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Initial Qty</label>
                      <input 
                        type="number" 
                        required
                        value={formData.quantity} 
                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Unit</label>
                      <input 
                        value={formData.unit} 
                        onChange={e => setFormData({...formData, unit: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Ltr/Pcs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Reorder Level</label>
                      <input 
                        type="number" 
                        required
                        value={formData.reorder} 
                        onChange={e => setFormData({...formData, reorder: parseFloat(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-orange-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Cost Per Unit (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={formData.cost} 
                        onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-white text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Supplier</label>
                      <input 
                        value={formData.supplier} 
                        readOnly
                        className="w-full p-2.5 border border-slate-300 rounded text-sm font-bold bg-slate-100 text-slate-500 cursor-not-allowed" 
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-md">Cancel</button>
                    <button type="submit" className="flex-[2] py-3 bg-slate-900 text-white font-bold uppercase rounded-md shadow-sm hover:bg-black">Save to Stock</button>
                  </div>
                </form>
               </div>
            </div>
         </div>,
         document.body
       )}

       {isUsageModalOpen && createPortal(
           <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 print:hidden">
               <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden text-black">
                   <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                       <div>
                           <h3 className="text-lg font-bold text-black uppercase">Record Usage</h3>
                           {selectedItem ? (
                             <p className="text-xs text-slate-500">{selectedItem.name} ({selectedItem.sku})</p>
                           ) : (
                             <p className="text-xs text-slate-500">Select an item to record usage</p>
                           )}
                       </div>
                       <button onClick={() => setIsUsageModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                   </div>
                   <div className="p-6 space-y-4">
                       {!selectedItem ? (
                           <div>
                               <div className="relative mb-4">
                                   <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                                   <input 
                                     autoFocus
                                     type="text" 
                                     placeholder="Search item by name or SKU..." 
                                     value={usageSearchTerm}
                                     onChange={e => setUsageSearchTerm(e.target.value)}
                                     className="w-full pl-10 p-3 border border-slate-300 rounded text-sm font-bold outline-none focus:border-blue-500 text-black bg-white"
                                   />
                               </div>
                               <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md">
                                   {searchResults.length === 0 && (
                                       <div className="p-4 text-center text-slate-400 text-xs">No items found matching "{usageSearchTerm}"</div>
                                   )}
                                   {searchResults.map(item => (
                                       <button 
                                         key={item.id}
                                         onClick={() => { setSelectedItemId(item.id); setUsageSearchTerm(''); }}
                                         className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center text-black"
                                       >
                                           <div>
                                               <div className="text-sm font-bold text-black">{item.name}</div>
                                               <div className="text-[10px] text-slate-400">{item.sku}</div>
                                           </div>
                                           <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                               {item.quantityOnHand} {item.unit}
                                           </div>
                                       </button>
                                   ))}
                               </div>
                           </div>
                       ) : (
                           <form onSubmit={handleUsageSubmit} className="space-y-4">
                               <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4 flex justify-between items-center">
                                   <span className="text-xs font-bold text-blue-800 uppercase">Current Stock</span>
                                   <span className="text-lg font-black text-blue-900">{selectedItem.quantityOnHand} {selectedItem.unit}</span>
                               </div>
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Quantity Used</label>
                                   <input 
                                       type="number"
                                       step="0.01"
                                       max={selectedItem.quantityOnHand}
                                       min="0.01"
                                       required
                                       autoFocus
                                       value={usageData.quantity || ''}
                                       onChange={e => setUsageData({...usageData, quantity: parseFloat(e.target.value)})}
                                       className="w-full p-3 border border-slate-300 rounded text-lg font-bold text-black outline-none focus:border-blue-500 bg-white"
                                   />
                                   <p className="text-[10px] text-slate-400 mt-1">
                                       Remaining: {(selectedItem.quantityOnHand - (usageData.quantity || 0)).toFixed(2)} {selectedItem.unit}
                                   </p>
                               </div>
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Usage Notes</label>
                                   <input 
                                       type="text"
                                       placeholder="e.g. Job #T-1025 Full Detail"
                                       value={usageData.notes}
                                       onChange={e => setUsageData({...usageData, notes: e.target.value})}
                                       className="w-full p-2.5 border border-slate-300 rounded text-sm font-medium text-black bg-white"
                                   />
                               </div>
                               <div className="flex gap-3 mt-4">
                                   <button type="button" onClick={() => setSelectedItemId(null)} className="flex-1 py-3 text-slate-600 font-bold border border-slate-300 rounded hover:bg-slate-50">Back</button>
                                   <button type="submit" className="flex-[2] py-3 bg-red-600 text-white font-bold uppercase rounded hover:bg-red-700 shadow-sm">
                                       Confirm Usage
                                   </button>
                               </div>
                           </form>
                       )}
                   </div>
               </div>
           </div>,
           document.body
       )}

       {isImportModalOpen && canEdit && createPortal(
           <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 print:hidden">
               <div className="bg-white w-full max-w-xl rounded-lg shadow-2xl p-6 text-black">
                   <h3 className="text-lg font-bold text-black mb-2 uppercase">Bulk Stock Import</h3>
                   <p className="text-slate-500 text-xs mb-4">
                       Paste CSV data below. Format: <code className="bg-slate-100 px-1 rounded border">SKU, Name, Category, Qty, Reorder, Cost</code>
                   </p>
                   <textarea 
                       value={importText}
                       onChange={e => setImportText(e.target.value)}
                       placeholder="CHEM-001, Shampoo, CHEMICALS, 50, 10, 450&#10;TOOL-100, MF Towel, TOOLS, 100, 20, 150"
                       className="w-full h-48 p-3 border border-slate-300 rounded-md bg-slate-50 font-mono text-xs focus:border-blue-500 outline-none mb-4 text-black bg-white"
                   />
                   <div className="flex gap-4">
                       <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-md">Cancel</button>
                       <button onClick={handleBulkImport} className="flex-[2] py-2.5 bg-slate-900 text-white font-bold uppercase rounded-md hover:bg-black">Process Import</button>
                   </div>
               </div>
           </div>,
           document.body
       )}
    </div>
  );
};
