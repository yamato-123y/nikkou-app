'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<{name: string, price: number}[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<{ name: string; price: number }[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  // 新規追加用の状態
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationPrice, setNewLocationPrice] = useState(0);
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newDispLoc, setNewDispLoc] = useState('');
  const [newDispItem, setNewDispItem] = useState('ガラ');
  const [newDispUnit, setNewDispUnit] = useState('t');
  const [newDispPrice, setNewDispPrice] = useState(3000);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const s = await resS.json();
        setLocations((s.locations || []).map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l));
        setLeases(s.leases || []);
        setCompanyMachines(s.companyMachines || []);
        setVehicles(s.vehicles || []);
        setDisposalLocations(s.disposalLocations || []);
        setManagers(s.managers || []);
        setWorkers(s.workers || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isAuthed) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthed]);

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  const updateMaster = (key: string, data: any) => saveSettings({ locations, leases, companyMachines, vehicles, disposalLocations, managers, workers, [key]: data });

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-normal text-center text-slate-800">??管理画面ログイン</h1>
          <input type="password" placeholder="パスワードを入力" className="w-full p-3 border rounded-xl outline-none font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 font-sans text-slate-800 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-black">?? 管理ダッシュボード</h1>
        <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] text-white px-4 py-2.5 rounded-xl font-bold text-sm">ログアウト</button>
      </div>

      {/* マスタ登録エリア */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">?? マスタ登録</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 現場マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
            <h3 className="font-bold text-sm">?? 現場・請負金額</h3>
            <input placeholder="現場名" value={newLocationName} onChange={e=>setNewLocationName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            <input type="number" placeholder="金額" value={newLocationPrice} onChange={e=>setNewLocationPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
            <button onClick={() => { const up=[...locations, {name: newLocationName, price: newLocationPrice}]; setLocations(up); saveSettings({locations: up, leases, companyMachines, vehicles, disposalLocations, managers, workers}); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm">追加</button>
          </div>

          {/* リース重機マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
            <h3 className="font-bold text-sm">?? リース重機・日額</h3>
            <input placeholder="重機名" value={newLeaseName} onChange={e=>setNewLeaseName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            <input type="number" value={newLeasePrice} onChange={e=>setNewLeasePrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
            <button onClick={() => { const up=[...leases, {name: newLeaseName, price: newLeasePrice}]; setLeases(up); updateMaster('leases', up); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm">追加</button>
          </div>

          {/* 処分場マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
            <h3 className="font-bold text-sm">??? 処分場・品目</h3>
            <input placeholder="処分場名" value={newDispLoc} onChange={e=>setNewDispLoc(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            <input placeholder="品目" value={newDispItem} onChange={e=>setNewDispItem(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            <button onClick={() => { const up=[...disposalLocations, {location: newDispLoc, item: newDispItem, unit: newDispUnit, price: newDispPrice}]; setDisposalLocations(up); updateMaster('disposalLocations', up); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm">追加</button>
          </div>

          {/* 作業員マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
            <h3 className="font-bold text-sm">?? 作業員・日額</h3>
            <input placeholder="作業員名" value={newWorkerName} onChange={e=>setNewWorkerName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            <input type="number" value={newWorkerPrice} onChange={e=>setNewWorkerPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
            <button onClick={() => { const up=[...workers, {name: newWorkerName, price: newWorkerPrice}]; setWorkers(up); updateMaster('workers', up); }} className="w-full 
