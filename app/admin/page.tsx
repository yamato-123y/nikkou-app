'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [form, setForm] = useState<any>({});

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) setSettings(await resS.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const saveMaster = async (key: string, newList: any[]) => {
    const newData = { ...settings, [key]: newList };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  // 追加後にフォームを完全にクリアする処理
  const addMaster = (key: string, newItem: any, formKeys: string[]) => {
    saveMaster(key, [...(settings[key] || []), newItem]);
    const cleared = { ...form };
    formKeys.forEach(k => cleared[k] = '');
    setForm(cleared);
  };

  const deleteMaster = (key: string, idx: number) => saveMaster(key, (settings[key] || []).filter((_:any, i:number) => i !== idx));

  // 登録後の金額・単価を直接変更した際の処理
  const updateItemPrice = (key: string, idx: number, field: string, value: any) => {
    const list = [...(settings[key] || [])];
    list[idx] = { ...list[idx], [field]: Number(value) || 0 };
    saveMaster(key, list);
  };

  // --- 計算ロジック & CSVダウンロード ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += ((settings.managers || []).find((x:any) => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let leaseC = 0;
    (r.machines || []).forEach((m: string) => leaseC += ((settings.leases || []).find((x:any) => x.name === m)?.price || 0));
    (r.ownMachines || []).forEach((m: string) => leaseC += ((settings.companyMachines || []).find((x:any) => x.name === m)?.price || 0));
    (r.vehicles || []).forEach((v: string) => leaseC += ((settings.vehicles || []).find((x:any) => x.name === v)?.price || 0));

    let dispC = 0;
    (r.disposals || []).forEach((d: any) => {
      const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
      dispC += (Number(d.quantity || 0) * uPrice);
    });

    let scrapC = 0;
    (r.scraps || []).forEach((sc: any) => {
      const uPrice = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item)?.price || 0;
      scrapC += (Number(sc.quantity || 0) * uPrice);
    });

    const fC = Number(r.fuel || 0);
    const eC = Number(r.etcPrice || 0);
    const pC = Number(r.parkingPrice || 0);
    const oC = Number(r.otherPrice || 0);
    const totalDailyCost = lCost + leaseC + dispC + fC + eC + pC + oC;

    return { lCost, leaseC, dispC, fC, eC, pC, oC, scrapC, totalDailyCost };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0, fuelCost = 0, etcCost = 0, parkingCost = 0, otherCost = 0, scrapTotal = 0;
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      laborCost += dc.lCost; leaseCost += dc.leaseC; disposalCost += dc.dispC;
      fuelCost += dc.fC; etcCost += dc.eC; parkingCost += dc.pC; otherCost += dc.oC; scrapTotal += dc.scrapC;
    });

    const totalCost = laborCost + leaseCost + disposalCost + fuelCost + etcCost + parkingCost + otherCost;
    const contractPrice = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName)?.price || 0;
    const profit = (contractPrice - totalCost) + scrapTotal;

    return { days: locMapped.length, laborCost, leaseCost, disposalCost, fuelCost, etcCost, parkingCost, otherCost, scrapTotal, total: totalCost, contractPrice, profit, reportsWithIndex: locMapped };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "責任者", "作業者", "重機", "車両", "軽油L", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      [...(r.machines||[]), ...(r.ownMachines||[])].join('/'), (r.vehicles||[]).join('/'), 
      r.fuel || 0, r.etcPrice || 0, r.parkingPrice || 0,
      r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${locName}_日報データ.csv`; link.click();
  };

  if (!isAuthed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl space-y-4 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center">🔒 管理画面ログイン</h1>
        <input type="password" placeholder="パスワードを入力" className="w-full p-3 border rounded-xl" onChange={e => setPassword(e.target.value)} />
        <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white py-3 rounded-xl font-bold">ログイン</button>
      </div>
    </div>
  );

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation));
  const locList = (settings.locations || []).map((l:any) => typeof l === 'string' ? {name: l, price: 0} : l);

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* ヘッダー */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-xl font-black">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">🔄 最新の状態に更新</button>
          <button onClick={() => setIsAuthed(false)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
        </div>
      </div>

      {/* 現場別 経費集計サマリー */}
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
              <th className="pb-3 text-center font-bold">詳細・CSV</th>
            </tr>
          </thead>
          <tbody className="divide-y font-bold text-base">
            {locList.map((loc:any) => {
              const c = calculateCosts(loc.name);
              return (
                <tr key={loc.name} className="hover:bg-slate-50 transition">
                  <td className="py-4 text-[#0066cc]">{loc.name}</td>
                  <td className="text-slate-700">¥{loc.price.toLocaleString()}</td>
                  <td>{c.days} 日</td>
                  <td>¥{c.total.toLocaleString()}</td>
                  <td className={c.profit >= 0 ? "text-emerald-600 font-black" : "text-red-600 font-black"}>¥{c.profit.toLocaleString()}</td>
                  <td className="text-center space-x-2">
                    <button onClick={() => setModalLocation(loc.name)} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button>
                    <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm shadow">CSV</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ⚙️ マスタ登録エリア（追加後に空欄クリア ＆ 登録後も単価直接変更可能） */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">⚙️ マスタ登録・単価設定</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. 現場 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏢 現場名一覧</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="新しい現場名" value={form.lName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, lName: e.target.value})} />
              <input type="number" placeholder="請負金額" value={form.lPrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, lPrice: e.target.value})} />
              <button onClick={() => addMaster('locations', {name: form.lName, price: Number(form.lPrice)||0}, ['lName', 'lPrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {locList.map((l:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{l.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={l.price || 0} onChange={(e)=>updateItemPrice('locations', idx, 'price', e.target.value)} className="w-24 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('locations', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 責任者 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👤 現場責任者＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="責任者名" value={form.mName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, mName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.mPrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, mPrice: e.target.value})} />
              <button onClick={() => addMaster('managers', {name: form.mName, price: Number(form.mPrice)||0}, ['mName', 'mPrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.managers || []).map((m:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{m.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={m.price || 0} onChange={(e)=>updateItemPrice('managers', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('managers', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 作業員 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👥 作業メンバー＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="メンバー名" value={form.wName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, wName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.wPrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, wPrice: e.target.value})} />
              <button onClick={() => addMaster('workers', {name: form.wName, price: Number(form.wPrice)||0}, ['wName', 'wPrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.workers || []).map((w:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{w.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={w.price || 0} onChange={(e)=>updateItemPrice('workers', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('workers', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. 自社車両 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚚 自社車両＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="車両名" value={form.vName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, vName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.vPrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, vPrice: e.target.value})} />
              <button onClick={() => addMaster('vehicles', {name: form.vName, price: Number(form.vPrice)||0}, ['vName', 'vPrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.vehicles || []).map((v:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{v.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={v.price || 0} onChange={(e)=>updateItemPrice('vehicles', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('vehicles', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. 自社重機 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚜 自社重機＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="重機名" value={form.cmName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, cmName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.cmPrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, cmPrice: e.target.value})} />
              <button onClick={() => addMaster('companyMachines', {name: form.cmName, price: Number(form.cmPrice)||0}, ['cmName', 'cmPrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.companyMachines || []).map((cm:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{cm.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={cm.price || 0} onChange={(e)=>updateItemPrice('companyMachines', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('companyMachines', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. リース重機 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏗️ リース重機＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="リース名" value={form.leaseName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, leaseName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.leasePrice || ''} className="w-24 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, leasePrice: e.target.value})} />
              <button onClick={() => addMaster('leases', {name: form.leaseName, price: Number(form.leasePrice)||0}, ['leaseName', 'leasePrice'])} className="bg-[#E56312] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.leases || []).map((ls:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{ls.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={ls.price || 0} onChange={(e)=>updateItemPrice('leases', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('leases', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. 処分場 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3 col-span-full lg:col-span-1">
            <h3 className="font-bold text-sm text-orange-600">🗑️ 処分場マスタ＆単価</h3>
            <div className="space-y-2">
              <input type="text" placeholder="処分場名" value={form.dLoc || ''} className="w-full p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, dLoc: e.target.value})} />
              <div className="flex gap-2">
                <input type="text" placeholder="品目" value={form.dItem || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, dItem: e.target.value})} />
                <input type="text" placeholder="単位(t)" value={form.dUnit || ''} className="w-16 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, dUnit: e.target.value})} />
                <input type="number" placeholder="単価" value={form.dPrice || ''} className="w-20 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, dPrice: e.target.value})} />
                <button onClick={() => addMaster('disposalLocations', {location: form.dLoc, item: form.dItem, unit: form.dUnit || 't', price: Number(form.dPrice)||0}, ['dLoc', 'dItem', 'dUnit', 'dPrice'])} className="bg-[#E56312] text-white px-3 py-2 rounded-lg font-bold text-sm shadow">追加</button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.disposalLocations || []).map((d:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{d.location} ({d.item}/{d.unit})</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={d.price || 0} onChange={(e)=>updateItemPrice('disposalLocations', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('disposalLocations', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. スクラップ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3 col-span-full lg:col-span-1">
            <h3 className="font-bold text-sm text-orange-600">♻️ スクラップマスタ＆単価</h3>
            <div className="space-y-2">
              <input type="text" placeholder="スクラップ場名" value={form.sLoc || ''} className="w-full p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, sLoc: e.target.value})} />
              <div className="flex gap-2">
                <input type="text" placeholder="品目" value={form.sItem || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, sItem: e.target.value})} />
                <input type="text" placeholder="単位(t)" value={form.sUnit || ''} className="w-16 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, sUnit: e.target.value})} />
                <input type="number" placeholder="単価" value={form.sPrice || ''} className="w-20 p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, sPrice: e.target.value})} />
                <button onClick={() => addMaster('scrapLocations', {location: form.sLoc, item: form.sItem, unit: form.sUnit || 't', price: Number(form.sPrice)||0}, ['sLoc', 'sItem', 'sUnit', 'sPrice'])} className="bg-[#E56312] text-white px-3 py-2 rounded-lg font-bold text-sm shadow">追加ボタン</button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.scrapLocations || []).map((sc:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{sc.location} ({sc.item}/{sc.unit})</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={sc.price || 0} onChange={(e)=>updateItemPrice('scrapLocations', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('scrapLocations', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 送信された日報一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-black">📥 送信された日報一覧</h2>
          <input type="text" placeholder="現場名で絞り込み..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-48" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-500 text-sm">
                <th className="pb-3 font-bold">日付</th>
                <th className="pb-3 font-bold">現場名</th>
                <th className="pb-3 font-bold">責任者 / 作業者</th>
                <th className="pb-3 font-bold">重機 / 車両</th>
                <th className="pb-3 font-bold">作業内容</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 font-bold">{r.date}</td>
                  <td className="py-3 font-bold text-[#0066cc]">{r.location}</td>
                  <td className="py-3 text-xs">{r.manager} / {(r.workers || []).join(', ')}</td>
                  <td className="py-3 text-xs">{[...(r.machines || []), ...(r.ownMachines || [])].join(', ') || '-'} / {(r.vehicles || []).join(', ') || '-'}</td>
                  <td className="py-3 text-xs">{r.workDescription || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-black">{modalLocation} (詳細分析)</h2>
                <p className="text-xs text-slate-500">お金の流れと日報ごとの内訳</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow">この現場のCSVダウンロード</button>
                <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">請負金額</div><div className="text-md font-black">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">合計経費</div><div className="text-md font-black text-emerald-700">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">粗利（売却益込）</div><div className="text-md font-black text-blue-700">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">稼働日数</div><div className="text-md font-black text-amber-700">{modalData.days}日</div></div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <h3 className="font-bold text-sm text-slate-700">📋 経費・収支の内訳明細（総合計）</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">人件費:</span><span className="font-bold">¥{modalData.laborCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">重機リース・自社重機:</span><span className="font-bold">¥{modalData.leaseCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">処分費:</span><span className="font-bold">¥{modalData.disposalCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">燃料代 (軽油):</span><span className="font-bold">¥{modalData.fuelCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">高速代・ETC:</span><span className="font-bold">¥{modalData.etcCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">駐車場代:</span><span className="font-bold">¥{modalData.parkingCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">その他雑費:</span><span className="font-bold">¥{modalData.otherCost.toLocaleString()}</span></div>
                <div className="bg-emerald-50 p-3 rounded-lg border flex justify-between col-span-full"><span className="text-emerald-700 font-bold">♻️ スクラップ売却計:</span><span className="font-black text-emerald-700">+ ¥{modalData.scrapTotal.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <h3 className="font-bold text-sm text-slate-700">📅 1日ごとの日報データ・経費明細</h3>
              {modalData.reportsWithIndex.length === 0 ? (
                <p className="text-xs text-slate-400">この現場の日報はまだありません</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {modalData.reportsWithIndex.map((r, idx) => {
                    const daily = calculateReportDailyCost(r);
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b pb-2 text-xs font-bold text-slate-600">
                          <span>📅 日付: {r.date}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">日報合計経費: ¥{daily.totalDailyCost.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-slate-400">責任者:</span> {r.manager || '-'}</div>
                          <div><span className="text-slate-400">作業員:</span> {(r.workers || []).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">重機:</span> {[...(r.machines || []), ...(r.ownMachines || [])].join(', ') || '-'}</div>
                          <div><span className="text-slate-400">車両:</span> {(r.vehicles || []).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">軽油:</span> {r.fuel || 0} L</div>
                          <div><span className="text-slate-400">ETC:</span> ¥{Number(r.etcPrice || 0).toLocaleString()}</div>
                          <div><span className="text-slate-400">駐車場代:</span> ¥{Number(r.parkingPrice || 0).toLocaleString()}</div>
                          <div><span className="text-slate-400">雑費({r.otherItem || 'なし'}):</span> ¥{Number(r.otherPrice || 0).toLocaleString()}</div>
                        </div>
                        {r.workDescription && (
                          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            <span className="font-bold text-slate-700">作業内容:</span> {r.workDescription}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
