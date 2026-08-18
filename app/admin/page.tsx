'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<string[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<{ name: string; price: number }[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  const fetchData = async () => {
    const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
    if (resR.ok) setReports(await resR.json());
    if (resS.ok) {
      const s = await resS.json();
      setLocations(s.locations || []);
      setLeases(s.leases || []);
      setCompanyMachines(s.companyMachines || []);
      setVehicles(s.vehicles || []);
      setDisposalLocations(s.disposalLocations || []);
      setScrapLocations(s.scrapLocations || []);
      setManagers(s.managers || []);
      setWorkers(s.workers || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  const updateMaster = (key: string, data: any) => saveSettings({ locations, leases, companyMachines, vehicles, disposalLocations, scrapLocations, managers, workers, [key]: data });
  
  const updateReport = async (index: number, newData: any) => {
    const updated = [...reports];
    updated[index] = { ...updated[index], ...newData };
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setEditingReportIndex(null);
    fetchData();
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName || r.locations?.includes(locName));
    let laborCost = 0, leaseCost = 0, disposalCost = 0;
    locMapped.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : [r.manager];
      mgrs.forEach((m: any) => laborCost += (managers.find(x => x.name === m)?.price || 20000));
      const wrks = Array.isArray(r.workers) ? r.workers : (r.workers ? r.workers.split(',') : []);
      wrks.forEach((w: any) => laborCost += (workers.find(x => x.name === w.trim())?.price || 15000));
      
      const mName = r.machine || r.lease;
      const vName = r.vehicle;
      leaseCost += (leases.find(x => x.name === mName)?.price || 0) + (companyMachines.find(x => x.name === mName)?.price || 0) + (vehicles.find(x => x.name === vName)?.price || 0);
      (r.disposals || []).forEach((d: any) => disposalCost += (Number(d.quantity || 0) * (disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000)));
    });
    return { days: locMapped.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center">管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl mb-4" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl">ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-black">📊 管理ダッシュボード</h1>
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">🔄 最新情報に更新</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">📥 送信された日報一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500 font-bold">
              <th className="p-3">日付</th><th>現場</th><th>責任者</th><th>重機/車両</th><th>内容</th><th>処分/スクラップ</th><th>操作</th>
            </tr></thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{editingReportIndex === i ? <input value={editForm.location} onChange={e=>setEditForm({...editForm, location: e.target.value})} className="border p-1 w-24"/> : r.location}</td>
                  <td className="p-3">{editingReportIndex === i ? <input value={editForm.manager} onChange={e=>setEditForm({...editForm, manager: e.target.value})} className="border p-1 w-20"/> : r.manager}</td>
                  <td className="p-3">{r.machine} / {r.vehicle}</td>
                  <td className="p-3">{editingReportIndex === i ? <input value={editForm.workDescription} onChange={e=>setEditForm({...editForm, workDescription: e.target.value})} className="border p-1 w-32"/> : r.workDescription}</td>
                  <td className="p-3 text-xs">{r.disposals?.map((d:any)=>`${d.location}:${d.quantity}t`).join(', ')}</td>
                  <td className="p-3">
                    {editingReportIndex === i ? <button onClick={() => updateReport(i, editForm)} className="bg-green-600 text-white px-2 py-1 rounded">保存</button> : <button onClick={() => { setEditingReportIndex(i); setEditForm(r); }} className="bg-blue-600 text-white px-2 py-1 rounded">編集</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
