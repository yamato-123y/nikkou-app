'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // マスタデータ
  const [locations, setLocations] = useState<{name: string, price: number}[]>([]);
  const [managers, setManagers] = useState<{name: string, price: number}[]>([]);
  const [workers, setWorkers] = useState<{name: string, price: number}[]>([]);
  const [vehicles, setVehicles] = useState<{name: string, price: number}[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{name: string, price: number}[]>([]);
  const [leases, setLeases] = useState<{name: string, price: number}[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{location: string, item: string, unit: string, price: number}[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{location: string, item: string, unit: string, price: number}[]>([]);

  // 編集・追加用状態
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});

  const fetchData = async () => {
    const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
    if (resR.ok) setReports(await resR.json());
    if (resS.ok) {
      const s = await resS.json();
      setLocations(s.locations || []); setManagers(s.managers || []); setWorkers(s.workers || []);
      setVehicles(s.vehicles || []); setCompanyMachines(s.companyMachines || []); setLeases(s.leases || []);
      setDisposalLocations(s.disposalLocations || []); setScrapLocations(s.scrapLocations || []);
    }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const updateSettings = async (key: string, list: any[]) => {
    const data = { locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations, [key]: list };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setEditIdx(null); setForm({}); fetchData();
  };

  const handleEdit = (key: string, idx: number, item: any) => { setEditIdx(idx); setForm({ key, ...item }); };

  const handleDelete = (key: string, idx: number) => {
    const list = { locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations }[key as keyof typeof states] as any[];
    updateSettings(key, list.filter((_, i) => i !== idx));
  };

  const states = { locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations };

  // マスタ入力コンポーネント
  const MasterSection = ({ title, keyName, fields, list }: any) => (
    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
      <h3 className="font-bold text-sm text-orange-600">{title}</h3>
      {fields.map((f: string) => (
        <input key={f} placeholder={f} value={form.key === keyName ? form[f] : ''} onChange={e=>setForm({...form, [f]: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
      ))}
      <button onClick={() => updateSettings(keyName, editIdx !== null ? list.map((l:any, i:number)=>i===editIdx ? form : l) : [...list, form])} 
              className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm">{editIdx !== null ? '保存' : '追加'}</button>
      <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
        {list.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-center text-xs bg-white p-1 rounded">
            <span onClick={() => handleEdit(keyName, i, item)} className="cursor-pointer font-bold">{Object.values(item).join(' ')}</span>
            <button onClick={() => handleDelete(keyName, i)} className="text-red-500 font-bold">削除</button>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <input type="password" placeholder="パスワード" className="p-3 border rounded-xl" onChange={e => setPassword(e.target.value)} />
        <button onClick={() => (password === 'yamato123') && setIsAuthed(true)} className="ml-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-bold">ログイン</button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MasterSection title="🏢 現場" keyName="locations" fields={['name', 'price']} list={locations} />
        <MasterSection title="👤 責任者" keyName="managers" fields={['name', 'price']} list={managers} />
        <MasterSection title="👥 作業員" keyName="workers" fields={['name', 'price']} list={workers} />
        <MasterSection title="🚚 自社車両" keyName="vehicles" fields={['name', 'price']} list={vehicles} />
        <MasterSection title="🚜 自社重機" keyName="companyMachines" fields={['name', 'price']} list={companyMachines} />
        <MasterSection title="🏗️ リース" keyName="leases" fields={['name', 'price']} list={leases} />
        <MasterSection title="🗑️ 処分場" keyName="disposalLocations" fields={['location', 'item', 'unit', 'price']} list={disposalLocations} />
        <MasterSection title="♻️ スクラップ" keyName="scrapLocations" fields={['location', 'item', 'unit', 'price']} list={scrapLocations} />
      </div>
    </div>
  );
}
