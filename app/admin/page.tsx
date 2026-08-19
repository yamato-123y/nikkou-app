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

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const s = await resS.json();
        setLocations((s.locations || []).map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l));
        setManagers(s.managers || []);
        setWorkers(s.workers || []);
        setVehicles(s.vehicles || []);
        setCompanyMachines(s.companyMachines || []);
        setLeases(s.leases || []);
        setDisposalLocations(s.disposalLocations || []);
        setScrapLocations(s.scrapLocations || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  // 原価計算ロジック（駐車場代・自社重機対応版）
  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0, fuelCost = 0, etcCost = 0, otherCost = 0, scrapTotal = 0;
    
    locMapped.forEach(r => {
      // 人件費
      if (r.manager) laborCost += (managers.find(x => x.name === r.manager)?.price || 0);
      (r.workers || []).forEach((w: string) => laborCost += (workers.find(x => x.name === w)?.price || 0));
      
      // リース・自社重機・車両（複数選択対応）
      (r.machines || []).forEach((m: string) => leaseCost += (leases.find(x => x.name === m)?.price || 0));
      (r.ownMachines || []).forEach((m: string) => leaseCost += (companyMachines.find(x => x.name === m)?.price || 0));
      (r.vehicles || []).forEach((v: string) => leaseCost += (vehicles.find(x => x.name === v)?.price || 0));
      
      // 処分費
      (r.disposals || []).forEach((d: any) => {
        const uPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 0;
        disposalCost += (Number(d.quantity || 0) * uPrice);
      });

      // スクラップ収支
      (r.scraps || []).forEach((sc: any) => {
        const uPrice = scrapLocations.find(s => s.location === sc.location && s.item === sc.item)?.price || 0;
        scrapTotal += (Number(sc.quantity || 0) * uPrice);
      });

      fuelCost += Number(r.fuel || 0);
      etcCost += Number(r.etcPrice || 0);
      otherCost += Number(r.parkingPrice || 0) + Number(r.otherPrice || 0);
    });

    const totalCost = laborCost + leaseCost + disposalCost + fuelCost + etcCost + otherCost;
    const contractPrice = locations.find(l => l.name === locName)?.price || 0;
    const profit = (contractPrice - totalCost) + scrapTotal;

    return { total: totalCost, profit, contractPrice, laborCost, leaseCost, disposalCost, fuelCost, etcCost, otherCost, scrapTotal };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">🔒 ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white py-3 rounded-xl font-bold">ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
        <h1 className="text-xl font-black">📊 管理ダッシュボード</h1>
        <button onClick={() => setIsAuthed(false)} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm">ログアウト</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-4 border rounded-2xl bg-slate-50 space-y-2">
                <h3 className="font-bold text-blue-700">{loc.name}</h3>
                <div className="text-sm">売上: ¥{c.contractPrice.toLocaleString()}</div>
                <div className="text-sm font-bold text-emerald-600">粗利: ¥{c.profit.toLocaleString()}</div>
                <div className="text-xs text-slate-500">経費合計: ¥{c.total.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
