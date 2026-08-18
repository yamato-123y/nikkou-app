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
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  // 新規追加用
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
        const locs = (s.locations || []).map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l);
        setLocations(locs);
        setLeases(s.leases || []);
        setCompanyMachines(s.companyMachines || []);
        setVehicles(s.vehicles || []);
        setDisposalLocations(s.disposalLocations || []);
        setScrapLocations(s.scrapLocations || []);
        setManagers(s.managers || []);
        setWorkers(s.workers || []);
      }
    } catch (e) { console.error(e); }
  };

  const downloadAllCSV = () => {
    const headers = ["日付", "現場名", "責任者", "作業者", "重機", "車両", "軽油L", "ETC", "作業内容"];
    const rows = reports.map(r => [r.date, r.location, r.manager, (r.workers || []).join(','), r.machine, r.vehicle, r.fuel, r.etcPrice, r.workDescription]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `全日報データ_${new Date().toLocaleDateString()}.csv`;
    link.click();
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

  const updateMaster = (key: string, data: any) => saveSettings({ locations, leases, companyMachines, vehicles, disposalLocations, scrapLocations, managers, workers, [key]: data });

  const updateReport = async (index: number, newData: any) => {
    const updated = [...reports];
    updated[index] = { ...updated[index], ...newData };
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setEditingReportIndex(null);
    fetchData();
  };

  const handleDeleteReport = async (index: number) => {
    const updated = reports.filter((_, i) => i !== index);
    setReports(updated);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    fetchData();
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName || r.locations?.includes(locName));
    let laborCost = 0, leaseCost = 0, disposalCost = 0, fuelCost = 0, etcCost = 0, otherCost = 0;
    
    locMapped.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : (r.manager ? [r.manager] : []);
      mgrs.forEach((m: any) => laborCost += (managers.find(x => x.name === m)?.price || 20000));
      const wrks = Array.isArray(r.workers) ? r.workers : (typeof r.workers === 'string' ? r.workers.split(',') : []);
      wrks.forEach((w: any) => laborCost += (workers.find(x => x.name === w.trim())?.price || 15000));
      
      const mName = r.machine || r.lease;
      leaseCost += (leases.find(x => x.name === mName)?.price || 0);
      
      (r.disposals || []).forEach((d: any) => {
        const unitPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000;
        disposalCost += (Number(d.quantity || 0) * unitPrice);
      });

      fuelCost += Number(r.fuelPrice || 0);
      etcCost += Number(r.etcPrice || 0);
      otherCost += Number(r.otherPrice || 0);
    });

    const totalCost = laborCost + leaseCost + disposalCost + fuelCost + etcCost + otherCost;
    const contractPrice = locations.find(l => l.name === locName)?.price || 0;
    const profit = contractPrice - totalCost;

    return { days: locMapped.length, laborCost, leaseCost, disposalCost, fuelCost, etcCost, otherCost, total: totalCost, contractPrice, profit, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-normal text-center text-slate-800">🔒管理画面ログイン</h1>
          <input type="password" placeholder="パスワードを入力" className="w-full p-3 border rounded-xl outline-none font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation) || r.locations?.includes(filterLocation));

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 font-sans text-slate-800 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-xl font-black">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500 mt-0.5">株式会社大和 音声日報システム</p>
        </div>
        <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計サマリー</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-slate-500 text-sm">
              <th className="pb-3 font-bold">現場名</th>
              <th className="pb-3 font-bold">請負金額</th>
              <th className="pb-3 font-bold">稼働日数</th>
              <th className="pb-3 font-bold">合計経費</th>
              <th className="pb-3 font-bold">粗利</th>
              <th className="pb-3 text-center font-bold">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y font-bold text-base">
            {locations.map(locObj => {
              const c = calculateCosts(locObj.name);
              return (
                <tr key={locObj.name} className="hover:bg-slate-50 transition">
                  <td className="py-4 text-[#0066cc]">{locObj.name}</td>
                  <td className="text-slate-700">¥{locObj.price.toLocaleString()}</td>
                  <td>{c.days} 日</td>
                  <td>¥{c.total.toLocaleString()}</td>
                  <td className={c.profit >= 0 ? "text-emerald-600 font-black" : "text-red-600 font-black"}>¥{c.profit.toLocaleString()}</td>
                  <td className="text-center">
                    <button onClick={() => setModalLocation(locObj.name)} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">⚙️ マスタ登録（現場・担当者・リース・処分場）</h2>
        {/* ...（マスタ登録エリアのHTMLは以前と同じなのでここに入ります）... */}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-black">📥 送信された日報一覧</h2>
          <div className="flex gap-2">
            <button onClick={downloadAllCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow">全日報CSVダウンロード</button>
            <input type="text" placeholder="現場名で絞り込み..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-48" />
          </div>
        </div>
        {/* ...（テーブル表示部分は以前と同じ）... */}
      </div>
      
      {/* 詳細モーダルエリアは以前のものを維持 */}
    </div>
  );
}
