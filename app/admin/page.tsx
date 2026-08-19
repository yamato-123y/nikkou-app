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

  // 編集・追加用
  const [inputs, setInputs] = useState<any>({});
  const [editIdx, setEditIdx] = useState<{[key: string]: number | null}>({});
  const [modalLocation, setModalLocation] = useState<string | null>(null);

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

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  // --- 原価計算ロジック（Aタイプ維持） ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += (managers.find(x => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += (workers.find(x => x.name === w)?.price || 0));
    let leaseC = 0;
    (r.machines || []).forEach((m: string) => leaseC += (leases.find(x => x.name === m)?.price || 0));
    (r.ownMachines || []).forEach((m: string) => leaseC += (companyMachines.find(x => x.name === m)?.price || 0));
    (r.vehicles || []).forEach((v: string) => leaseC += (vehicles.find(x => x.name === v)?.price || 0));
    let dispC = 0;
    (r.disposals || []).forEach((d: any) => { const uPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 0; dispC += (Number(d.quantity || 0) * uPrice); });
    let scrapC = 0;
    (r.scraps || []).forEach((sc: any) => { const uPrice = scrapLocations.find(s => s.location === sc.location && s.item === sc.item)?.price || 0; scrapC += (Number(sc.quantity || 0) * uPrice); });
    return { lCost, leaseC, dispC, fC: Number(r.fuel || 0), eC: Number(r.etcPrice || 0), pC: Number(r.parkingPrice || 0), oC: Number(r.otherPrice || 0), scrapC, totalDailyCost: lCost + leaseC + dispC + Number(r.fuel||0) + Number(r.etcPrice||0) + Number(r.parkingPrice||0) + Number(r.otherPrice||0) };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let labor=0, lease=0, disp=0, fuel=0, etc=0, park=0, other=0, scrap=0;
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      labor += dc.lCost; lease += dc.leaseC; disp += dc.dispC; fuel += dc.fC; etc += dc.eC; park += dc.pC; other += dc.oC; scrap += dc.scrapC;
    });
    const totalCost = labor+lease+disp+fuel+etc+park+other;
    const contract = locations.find(l => l.name === locName)?.price || 0;
    return { days: locMapped.length, total: totalCost, contractPrice: contract, profit: (contract - totalCost) + scrap, laborCost: labor, leaseCost: lease, disposalCost: disp, fuelCost: fuel, etcCost: etc, parkingCost: park, otherCost: other, scrapTotal: scrap, reportsWithIndex: locMapped };
  };

  const downloadLocationCSV = (locName: string) => {
    const headers = ["日付", "現場名", "作業者", "重機", "車両", "軽油L", "ETC", "駐車場", "雑費", "内容"];
    const rows = reports.filter(r => r.location === locName).map(r => [r.date, r.location, (r.workers || []).join('/'), [...(r.machines||[]), ...(r.ownMachines||[])].join('/'), (r.vehicles||[]).join('/'), r.fuel, r.etcPrice, r.parkingPrice, r.otherPrice, r.workDescription]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${locName}_日報.csv`; link.click();
  };

  const handleAction = (key: string, action: 'save' | 'delete' | 'edit', index?: number, item?: any) => {
    const statesMap: any = { locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations };
    let list = [...statesMap[key]];
    if (action === 'delete') {
      list.splice(index!, 1);
      saveSettings({ ...statesMap, [key]: list });
    } else if (action === 'edit') {
      setInputs({ ...inputs, [key]: item });
      setEditIdx({ ...editIdx, [key]: index! });
    } else if (action === 'save') {
      if (editIdx[key] !== null && editIdx[key] !== undefined) list[editIdx[key]!] = inputs[key];
      else list.push(inputs[key]);
      saveSettings({ ...statesMap, [key]: list });
      setInputs({ ...inputs, [key]: {} }); setEditIdx({ ...editIdx, [key]: null });
    }
  };

  if (!isAuthed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl space-y-4">
        <input type="password" placeholder="パスワード" className="p-3 border rounded-xl" onChange={e => setPassword(e.target.value)} />
        <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold">ログイン</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
        <h1 className="text-xl font-black">📊 管理ダッシュボード</h1>
        <button onClick={() => setIsAuthed(false)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold">ログアウト</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-4 border rounded-2xl bg-slate-50">
                <h3 className="font-bold text-blue-700">{loc.name}</h3>
                <p className="text-sm">売上: ¥{c.contractPrice.toLocaleString()} / 粗利: ¥{c.profit.toLocaleString()}</p>
                <div className="mt-2 space-x-2">
                  <button onClick={() => setModalLocation(loc.name)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">詳細分析</button>
                  <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">CSV</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[{t:'現場', k:'locations', f:['name','price']}, {t:'責任者', k:'managers', f:['name','price']}, {t:'作業員', k:'workers', f:['name','price']}, {t:'自社車両', k:'vehicles', f:['name','price']}, {t:'自社重機', k:'companyMachines', f:['name','price']}, {t:'リース', k:'leases', f:['name','price']}, {t:'処分場', k:'disposalLocations', f:['location','item','unit','price']}, {t:'スクラップ', k:'scrapLocations', f:['location','item','unit','price']}].map((s:any) => (
          <div key={s.k} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
            <h3 className="font-bold text-sm text-orange-600">{s.t}</h3>
            {s.f.map((f:string) => <input key={f} placeholder={f} value={inputs[s.k]?.[f] || ''} onChange={e => setInputs({...inputs, [s.k]: {...inputs[s.k], [f]: e.target.value}})} className="w-full p-1 border rounded text-xs" />)}
            <button onClick={() => handleAction(s.k, 'save')} className="w-full bg-orange-600 text-white text-xs py-1 rounded">{editIdx[s.k]!==null?'保存':'追加'}</button>
            <div className="max-h-24 overflow-y-auto mt-2 text-[10px] divide-y">
              {({ locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations } as any)[s.k].map((item:any, i:number) => (
                <div key={i} className="flex justify-between py-1">
                  <span onClick={()=>handleAction(s.k,'edit',i,item)} className="cursor-pointer text-blue-600">{Object.values(item).join(' ')}</span>
                  <button onClick={()=>handleAction(s.k,'delete',i)} className="text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
