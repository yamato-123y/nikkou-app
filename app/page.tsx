'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  const [date, setDate] = useState(new Date().toLocaleDateString('ja-JP').replace(/\//g, '/'));
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  // 複数選択対応用
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedOwnMachines, setSelectedOwnMachines] = useState<string[]>([]);
  
  const [fuel, setFuel] = useState('');
  const [etcPrice, setEtcPrice] = useState('');
  const [parkingPrice, setParkingPrice] = useState(''); // 追加
  const [otherItem, setOtherItem] = useState('');
  const [otherPrice, setOtherPrice] = useState('');
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data || {}));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers: selectedWorkers, 
        machines: selectedMachines, vehicles: selectedVehicles, ownMachines: selectedOwnMachines,
        fuel, etcPrice, parkingPrice, otherItem, otherPrice, disposals, scraps, workDescription: description
      })
    });
    setStatus('success');
    // フォームリセット等の処理...
    setTimeout(() => setStatus('idle'), 3000);
  };

  // 複数選択トグル関数
  const toggleSelection = (list: string[], item: string, setter: Function) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-100 min-h-screen">
      <h1 className="text-xl font-black text-center">📱 日報入力</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 現場・責任者等は既存のロジックで配置 */}
        
        {/* 重機・車両選択エリア */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
          <p className="font-bold text-sm text-orange-600">🚜 重機・車両（複数選択可）</p>
          
          <label className="text-xs font-bold">リース重機</label>
          <div className="grid grid-cols-2 gap-2">
            {(settings.leases || []).map((m: any) => (
              <button type="button" key={m.name} onClick={() => toggleSelection(selectedMachines, m.name, setSelectedMachines)}
                className={`p-2 rounded-xl text-xs ${selectedMachines.includes(m.name) ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{m.name}</button>
            ))}
          </div>

          <label className="text-xs font-bold">自社重機</label>
          <div className="grid grid-cols-2 gap-2">
            {(settings.companyMachines || []).map((m: any) => (
              <button type="button" key={m.name} onClick={() => toggleSelection(selectedOwnMachines, m.name, setSelectedOwnMachines)}
                className={`p-2 rounded-xl text-xs ${selectedOwnMachines.includes(m.name) ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{m.name}</button>
            ))}
          </div>

          <label className="text-xs font-bold">自社車両</label>
          <div className="grid grid-cols-2 gap-2">
            {(settings.vehicles || []).map((v: any) => (
              <button type="button" key={v.name} onClick={() => toggleSelection(selectedVehicles, v.name, setSelectedVehicles)}
                className={`p-2 rounded-xl text-xs ${selectedVehicles.includes(v.name) ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{v.name}</button>
            ))}
          </div>
        </div>

        {/* 経費入力 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <input type="number" placeholder="軽油(L)" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-2 border rounded-xl" />
           <input type="number" placeholder="ETC(円)" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-2 border rounded-xl" />
           <input type="number" placeholder="駐車場代(円)" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full p-2 border rounded-xl" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black py-4 rounded-2xl">送信</button>
      </form>
    </div>
  );
}
