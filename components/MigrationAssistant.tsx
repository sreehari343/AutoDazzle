import React, { useState } from 'react';
import { analyzeDataStructure } from '../services/geminiService.ts';
import { AIAnalysisResult, Transaction } from '../types.ts';
import { useERP } from '../contexts/ERPContext.tsx';
import { 
  Upload, Database, Loader2, Lock, RefreshCcw, Cloud, 
  Wifi, ImageIcon, Copy, Sparkles, X, Code, Landmark, AlertCircle, FileSpreadsheet, FileJson, Link2, ShieldCheck, WifiOff
} from 'lucide-react';

export const MigrationAssistant: React.FC = () => {
  const { 
    accounts, restoreData, updateLogo, updatePassword, bulkAddTransactions, 
    isCloudConnected, syncStatus, lastSyncError, connectToCloud, syncAllLocalToCloud 
  } = useERP();
  
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'MIGRATION' | 'PROFILE' | 'CLOUD'>('CLOUD');
  const [loading, setLoading] = useState(false);
  
  // Cloud States
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem('erp_cloud_url') || '');
  const [cloudKey, setCloudKey] = useState(localStorage.getItem('erp_cloud_key') || '');
  const [isLinking, setIsLinking] = useState(false);

  const [passSuper, setPassSuper] = useState('');
  const [passStaff, setPassStaff] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const handleCloudConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinking(true);
    const success = await connectToCloud(cloudUrl, cloudKey);
    setIsLinking(false);
    if (success) alert("✅ Cloud Link Established! Syncing...");
  };

  const handleFullSystemBackup = () => {
    const backupObj = { version: '2.2', timestamp: new Date().toISOString(), modules: { accounts, financials: accounts } };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto_dazzle_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("Restore local data from this file?")) restoreData(data);
      } catch (err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const cleanNum = (val: any) => {
      if (val === undefined || val === null) return 0;
      const str = String(val).trim();
      if (!str || str === '-' || str === '#ERROR!') return 0;
      const cleaned = str.replace(/[^0-9.-]+/g, '');
      return parseFloat(cleaned) || 0;
  };

  const handleMasterImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportLoading(true);

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const rows = text.split('\n').filter(r => r.trim()).map(row => {
                  const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                  return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
              }).filter(row => row.length > 0);

              if (rows.length === 0) { alert("File is empty."); setImportLoading(false); return; }

              const firstRow = rows[0];
              const isHeader = firstRow && (String(firstRow[0]).toLowerCase().includes('date') || String(firstRow[1]).toLowerCase().includes('acc'));
              const dataRows = isHeader ? rows.slice(1) : rows;
              
              const newTxs: Transaction[] = [];
              dataRows.forEach((row, idx) => {
                  if (row.length < 5) return;
                  const date = row[0] || new Date().toISOString().split('T')[0];
                  const accName = row[1] || 'Imported Entry';
                  const debit = cleanNum(row[3]);
                  const credit = cleanNum(row[4]);
                  const desc = row[5] || accName;

                  if (debit > 0) newTxs.push({ id: `imp-dr-${Date.now()}-${idx}`, date, type: 'EXPENSE', category: accName, amount: debit, description: desc, method: 'TRANSFER' });
                  if (credit > 0) newTxs.push({ id: `imp-cr-${Date.now()}-${idx}`, date, type: 'INCOME', category: accName, amount: credit, description: desc, method: 'TRANSFER' });
              });

              if (newTxs.length > 0 && window.confirm(`Import ${newTxs.length} entries?`)) {
                  bulkAddTransactions(newTxs);
                  alert(`Successfully imported ${newTxs.length} records.`);
              }
          } catch (err) { alert("Error processing CSV."); }
          setImportLoading(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Control</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
             <button onClick={() => setActiveTab('CLOUD')} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'CLOUD' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>Cloud Link</button>
             <button onClick={() => setActiveTab('PROFILE')} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Security</button>
             <button onClick={() => setActiveTab('BACKUP')} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'BACKUP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Local Backup</button>
             <button onClick={() => setActiveTab('MIGRATION')} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'MIGRATION' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Import CSV</button>
        </div>
      </div>

      {activeTab === 'CLOUD' && (
        <div className="animate-fade-in-up space-y-6">
            <div className={`p-8 rounded-3xl border-4 ${isCloudConnected ? 'bg-emerald-50 border-emerald-500 shadow-[8px_8px_0px_0px_rgba(16,185,129,0.2)]' : 'bg-slate-50 border-slate-300'} transition-all`}>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${isCloudConnected ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                                {isCloudConnected ? <Cloud size={32}/> : <WifiOff size={32}/>}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none">Remote Database Link</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${isCloudConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isCloudConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {syncStatus === 'SYNCING' ? 'Synchronizing Module Data...' : (isCloudConnected ? 'Cloud Active: Secured Backup' : 'System Offline: Local Storage Only')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleCloudConnect} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Supabase Project URL</label>
                                <input required value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full p-4 border-4 border-slate-200 rounded-2xl font-bold text-black outline-none focus:border-blue-500 bg-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Supabase Anon Key</label>
                                <input required type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR..." className="w-full p-4 border-4 border-slate-200 rounded-2xl font-bold text-black outline-none focus:border-blue-500 bg-white" />
                            </div>
                            <div className="flex gap-4">
                                <button type="submit" disabled={isLinking} className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isCloudConnected ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                    {isLinking ? <Loader2 size={18} className="animate-spin"/> : <Link2 size={18}/>}
                                    {isCloudConnected ? 'Update Cloud Link' : 'Establish Remote Link'}
                                </button>
                                {isCloudConnected && (
                                    <button type="button" onClick={syncAllLocalToCloud} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                                        <RefreshCcw size={18}/> Force Sync
                                    </button>
                                )}
                            </div>
                        </form>
                        
                        {lastSyncError && (
                            <div className="p-4 bg-red-100 border-l-4 border-red-600 text-red-800 text-xs font-bold rounded flex items-center gap-3">
                                <AlertCircle size={18}/>
                                <div>
                                    <p className="uppercase tracking-widest font-black">Sync Failure Detected</p>
                                    <p className="mt-1 font-mono">{lastSyncError}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-64 bg-white/50 border-4 border-white rounded-[32px] p-6 text-black">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Cloud Schema Guide</h4>
                        <div className="space-y-4">
                            <p className="text-[10px] leading-relaxed font-bold text-slate-600">Ensure the following tables exist in your Supabase Public schema with <strong>UUID or Text</strong> primary keys:</p>
                            <ul className="space-y-1">
                                {['customers', 'jobs', 'inventory', 'staff', 'services', 'transactions', 'accounts'].map(t => (
                                    <li key={t} className="text-[10px] font-mono bg-white p-1 rounded border border-slate-200">✅ {t}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'MIGRATION' && (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg">
                <div className="bg-white p-6 rounded-lg shadow-sm max-w-lg">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> 6-Column CSV Master Importer</h5>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-10 hover:border-indigo-500 cursor-pointer bg-indigo-50/50 group">
                        {importLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-400 mb-3" size={32}/>}
                        <span className="text-sm font-bold text-indigo-800">Select Ledger CSV File</span>
                        <input type="file" accept=".csv" disabled={importLoading} className="hidden" onChange={handleMasterImport} />
                    </label>
                    <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200">
                        <p className="text-[9px] font-mono text-slate-600 leading-tight uppercase">Columns: Date, Acc Name, Acc Type, Debit, Credit, Description</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <FileJson size={32} className="mx-auto mb-4 text-blue-600"/>
                <h4 className="text-xl font-black text-slate-900 uppercase mb-4">Export Database</h4>
                <button onClick={handleFullSystemBackup} className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase text-xs">Generate Local Backup</button>
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <RefreshCcw size={32} className="mx-auto mb-4 text-red-600"/>
                <h4 className="text-xl font-black text-slate-900 uppercase mb-4">Restore Database</h4>
                <label className="w-full block">
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-black uppercase text-xs text-center cursor-pointer">Upload Local Backup</div>
                </label>
            </div>
        </div>
      )}

      {activeTab === 'PROFILE' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up">
              <h4 className="font-black text-slate-800 uppercase text-xs mb-6">Security & Password Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Admin Passcode</label>
                      <input type="password" value={passSuper} onChange={e => setPassSuper(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-50 font-bold text-black" />
                      <button onClick={() => { updatePassword('SUPER_ADMIN', passSuper); alert('Master Passcode Updated!'); }} className="bg-red-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase">Update Master</button>
                  </div>
                  <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Portal Passcode</label>
                      <input type="password" value={passStaff} onChange={e => setPassStaff(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-50 font-bold text-black" />
                      <button onClick={() => { updatePassword('STAFF', passStaff); alert('Staff Passcode Updated!'); }} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase">Update Staff</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
