
import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService';
import { AIAnalysisResult, Transaction } from '../types';
import { useERP } from '../contexts/ERPContext';
import { Upload, Database, FileText, CheckCircle, Loader2, AlertTriangle, Download, ShieldCheck, Server, Lock, RefreshCcw, Trash2, Cloud, Wifi, Smartphone, Laptop, Image as ImageIcon, Building, Key, ShieldAlert, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    customers, jobs, transactions, staff, inventory, accounts, 
    restoreData, resetToFactory, connectToCloud, isCloudConnected, syncStatus,
    logoUrl, updateLogo, currentUserRole, updatePassword, bulkAddTransactions
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'CLOUD' | 'MIGRATION' | 'PROFILE'>('PROFILE');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transaction Import State
  const [txImportText, setTxImportText] = useState('');

  // Profile Form State
  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');

  // Cloud Form State
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('supabase_key') || '');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
      setIsConnecting(true);
      await connectToCloud(cloudUrl, cloudKey);
      setIsConnecting(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    if (passSuper) updatePassword('SUPER_ADMIN', passSuper);
    if (passStaff) updatePassword('STAFF', passStaff);
    setPassSuper('');
    setPassStaff('');
    alert('✅ Credentials Updated Successfully!');
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeDataStructure(inputText);
      setResult(analysis);
    } catch (err) {
      setError("Failed to analyze data. Please verify your API Key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTxImport = () => {
      if (!txImportText.trim()) return;
      
      const lines = txImportText.split('\n').filter(l => l.trim());
      const newTxs: Transaction[] = lines.map((line, idx) => {
          const [date, type, cat, amt, desc, method] = line.split(',').map(s => s.trim());
          
          return {
              id: `tx-hist-${Date.now()}-${idx}`,
              date: date || new Date().toISOString().split('T')[0],
              type: (type?.toUpperCase() === 'EXPENSE' ? 'EXPENSE' : 'INCOME'),
              category: cat || 'General',
              amount: parseFloat(amt) || 0,
              description: desc || 'Imported Transaction',
              method: (method as any) || 'CASH'
          };
      });

      if (window.confirm(`Ready to import ${newTxs.length} historical transactions?`)) {
          bulkAddTransactions(newTxs);
          setTxImportText('');
          alert("Historical data imported successfully!");
      }
  };

  const copyTxTemplate = () => {
      const tpl = "2024-11-01, INCOME, Service Sales, 5000, Daily Sales, CASH\n2024-11-02, EXPENSE, Rent, 15000, Shop Rent Nov, TRANSFER";
      navigator.clipboard.writeText(tpl);
      alert("Template copied to clipboard!");
  };

  const handleFullSystemBackup = () => {
    const systemData = {
        timestamp: new Date().toISOString(),
        version: "2.0",
        company: "Auto Dazzle Spa",
        modules: {
            customers: customers,
            jobs: jobs,
            financials: accounts,
            transactions: transactions,
            staff: staff,
            inventory: inventory
        }
    };
    const dataStr = JSON.stringify(systemData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `AutoDazzle_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        if (e.target?.result) {
          try {
            const parsedData = JSON.parse(e.target.result as string);
            restoreData(parsedData);
          } catch (err) {
            alert("Error parsing backup file.");
          }
        }
      };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Settings & Access</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('CLOUD')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import</button>
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 w-full text-left tracking-widest">Brand Identity</h4>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6 bg-slate-50 group relative">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <ImageIcon size={32} className="text-slate-300" />
                    )}
                </div>
                <label className="w-full">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <div className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] text-center cursor-pointer hover:bg-black transition-all shadow-md">
                        Update Logo
                    </div>
                </label>
                <p className="text-[10px] text-slate-400 mt-4 text-center font-medium">Auto-scales for Invoices & Reports.</p>
            </div>
            
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 flex items-center gap-2 tracking-widest">
                        <Lock size={14} className="text-red-600"/> Security & Access Control
                    </h4>
                    
                    <form onSubmit={handleUpdatePasswords} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Master Admin Passcode</label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter new Master pass"
                                        value={passSuper}
                                        onChange={e => setPassSuper(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-600/20 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Staff Portal Passcode</label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter new Staff pass"
                                        value={passStaff}
                                        onChange={e => setPassStaff(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-600/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase">
                                SECURITY ALERT: ONLY THE SUPER ADMIN CAN ACCESS THIS TAB. CHANGING THESE CODES WILL IMMEDIATELY REQUIRE RE-AUTHENTICATION FOR RELEVANT ROLES.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="px-8 py-3 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">
                                Save Credentials
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 uppercase text-[10px] mb-4 flex items-center gap-2 tracking-widest">
                        <Building size={14}/> Business Info
                    </h4>
                    <div className="grid grid-cols-2 gap-4 opacity-60">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entity Name</label>
                            <input type="text" defaultValue="Auto Dazzle Detailing Spa" className="w-full p-2 border border-slate-300 rounded-md text-sm font-bold bg-slate-50" readOnly />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Primary Currency</label>
                            <input type="text" defaultValue="INR (₹)" className="w-full p-2 border border-slate-300 rounded-md text-sm font-bold bg-slate-50" readOnly />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tax Engine</label>
                            <input type="text" defaultValue="GST (18%)" className="w-full p-2 border border-slate-300 rounded-md text-sm font-bold bg-slate-50" readOnly />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'CLOUD' && (
         <div className="space-y-6">
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-lg shadow-xl border-b-4 border-red-600">
                 <div className="flex items-center gap-4 mb-4">
                     <div className="p-3 bg-white/10 rounded-lg"><Cloud size={24} className="text-red-500" /></div>
                     <div>
                         <h3 className="text-2xl font-black uppercase tracking-tighter">Device Sync</h3>
                         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global Data Continuity</p>
                     </div>
                 </div>
                 <div className="flex items-center justify-center gap-8 mt-10">
                    <Laptop size={40} className="opacity-40"/>
                    <div className="h-0.5 w-16 bg-white/10"></div>
                    <Server size={40} className="text-red-600 opacity-90"/>
                    <div className="h-0.5 w-16 bg-white/10"></div>
                    <Smartphone size={40} className="opacity-40"/>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                     <h4 className="font-black text-slate-800 uppercase text-[10px] mb-6 tracking-widest">Supabase Integration</h4>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Project Endpoint</label>
                             <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-red-600/20" placeholder="https://xyz.supabase.co" />
                         </div>
                         <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Service Role Key</label>
                             <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-red-600/20" placeholder="..." />
                         </div>
                         <button 
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className={`w-full py-3 rounded-lg font-black text-white uppercase text-[10px] tracking-[0.2em] shadow-lg transition-all ${isCloudConnected ? 'bg-green-600' : 'bg-slate-900 hover:bg-black'}`}
                         >
                             {isConnecting ? 'Authenticating...' : isCloudConnected ? 'Sync Active' : 'Establish Link'}
                         </button>
                     </div>
                 </div>

                 <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                     <h4 className="font-black text-slate-800 uppercase text-[10px] mb-4 tracking-widest">Go-Live Checklist</h4>
                     <div className="space-y-3">
                         <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                             <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isCloudConnected ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                 <CheckCircle2 size={14}/>
                             </div>
                             <span className="text-[10px] font-bold text-slate-600 uppercase">1. Cloud Link Status</span>
                         </div>
                         <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                             <div className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-400">
                                 <CheckCircle2 size={14}/>
                             </div>
                             <span className="text-[10px] font-bold text-slate-600 uppercase">2. Import Services (Excel)</span>
                         </div>
                         <div className="p-3 bg-amber-50 rounded border border-amber-100 flex gap-2">
                             <AlertCircle size={16} className="text-amber-600 shrink-0"/>
                             <p className="text-[9px] text-amber-800 font-bold uppercase leading-tight">
                                 GitHub Note: If your page is blank on GitHub, you MUST run "npm run build" and upload the "dist" folder. GitHub cannot read .tsx files directly.
                             </p>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {activeTab === 'BACKUP' && (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 text-center">
                <ShieldCheck size={64} className="mx-auto text-green-500 mb-6" />
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Immutable Backups</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Localized snapshots for cold storage</p>
                
                <div className="flex flex-col md:flex-row gap-4 justify-center max-w-lg mx-auto">
                    <button onClick={handleFullSystemBackup} className="flex-1 py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black shadow-lg">
                        Export Full State
                    </button>
                    <div className="relative flex-1">
                       <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                       <button className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-colors">
                          Import State File
                       </button>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <button onClick={resetToFactory} className="text-red-500 text-xs font-bold uppercase hover:text-red-700 flex items-center justify-center gap-2 mx-auto">
                        <Trash2 size={14} /> Reset to Factory Settings
                    </button>
                </div>
             </div>
      )}
      
      {activeTab === 'MIGRATION' && (
          <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                        <FileText size={20} className="text-blue-600"/> Historical Transactions
                    </h4>
                    <button onClick={copyTxTemplate} className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 font-bold flex items-center gap-1 border border-blue-200">
                        <Copy size={12}/> Copy Format Template
                    </button>
                </div>
                
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Required CSV Columns:</p>
                    <code className="text-xs font-mono bg-white p-2 rounded border border-slate-200 block mb-2 text-slate-700">YYYY-MM-DD, TYPE, Category, Amount, Description, Method</code>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Values for TYPE: <b>INCOME</b> or <b>EXPENSE</b>.<br/>
                        Values for Method: <b>CASH, CARD, UPI, TRANSFER</b>.
                    </p>
                </div>

                <textarea 
                    className="w-full h-48 p-4 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-600/20 outline-none mb-4 text-black" 
                    value={txImportText} 
                    onChange={(e) => setTxImportText(e.target.value)} 
                    placeholder={`2024-11-01, INCOME, Service Sales, 5000, Daily Sales, CASH\n2024-11-02, EXPENSE, Rent, 15000, Shop Rent Nov, TRANSFER`}
                />
                <div className="flex justify-end">
                    <button onClick={handleBulkTxImport} disabled={!txImportText} className="px-6 py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black disabled:bg-slate-300">
                        Import Transaction History
                    </button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};
