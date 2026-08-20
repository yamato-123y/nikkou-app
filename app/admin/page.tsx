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

  // 編集用ステート
  const [editingReport, setEditingReport] = useState<any | null>(null);

  // 処分費詳細モーダル用ステート
  const [showDisposalModal, setShowDisposalModal] = useState(false);

  // 経費内訳明細の手動編集用オーバーライドステート（現場名ごとに各費用の値を保持）
  const [costOverrides, setCostOverrides] = useState<any>({});

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const sData = await resS.json();
        setSettings(sData || {});
        if (sData.costOverrides) setCostOverrides(sData.costOverrides);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const saveMaster = async (key: string, newList: any[]) => {
    const newData = { ...settings, [key]: newList };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  const addMaster = (key: string, newItem: any, formKeys: string[]) => {
    saveMaster(key, [...(settings[key] || []), newItem]);
    const cleared = { ...form };
    formKeys.forEach(k => cleared[k] = '');
    setForm(cleared);
  };

  const deleteMaster = (key: string, idx: number) => saveMaster(key, (settings[key] || []).filter((_:any, i:number) => i !== idx));

  const updateItemPrice = (key: string, idx: number, field: string, value: any) => {
    const list = [...(settings[key] || [])];
    list[idx] = { ...list[idx], [field]: field === 'company' || field === 'task' ? value : (Number(value) || 0) };
    saveMaster(key, list);
  };

  // 経費内訳明細の個別金額変更の保存
  const handleCostOverrideChange = async (locName: string, field: string, val: string) => {
    const newOverrides = {
      ...costOverrides,
      [locName]: {
        ...(costOverrides[locName] || {}),
        [field]: val
      }
    };
    setCostOverrides(newOverrides);
    const newData = { ...settings, costOverrides: newOverrides };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  };

  // 日報の削除
  const handleDeleteReport = async (report: any, index: number) => {
    if (!confirm('この日報データを削除してもよろしいですか？')) return;
    const targetId = report.id || report._id || report.reportId || index;
    await fetch('/api/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId, index })
    });
    fetchData();
  };

  // 日報の更新（全項目編集対応）
  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingReport,
      id: editingReport.id || editingReport._id
    };
    await fetch('/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setEditingReport(null);
    fetchData();
  };

  // --- 計算ロジック ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += ((settings.managers || []).find((x:any) => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let subCost = 0;
    (r.subcontractors || []).forEach((sub: any) => {
      // 統合された subcontractors マスタから会社名と作業内容が一致するものの単価を取得
      const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
      const unitP = subMaster?.price || 0;
      subCost += (Number(sub.count || 0) * unitP);
    });

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
    const totalDailyCost = lCost + subCost + leaseC + dispC + fC + eC + pC + oC;

    return { lCost, subCost, leaseC, dispC, fC, eC, pC, oC, scrapC, totalDailyCost };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcDisp = 0, calcFuel = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotal = 0;
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcDisp += dc.dispC;
      calcFuel += dc.fC; calcEtc += dc.eC; calcParking += dc.pC; calcOther += dc.oC; scrapTotal += dc.scrapC;
    });

    const ov = costOverrides[locName] || {};
    const laborCost = ov.labor !== '' && ov.labor !== undefined ? Number(ov.labor) : calcLabor;
    const subCostTotal = ov.sub !== '' && ov.sub !== undefined ? Number(ov.sub) : calcSub;
    const leaseCost = ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease;
    const disposalCost = ov.disposal !== '' && ov.disposal !== undefined ? Number(ov.disposal) : calcDisp;
    const fuelCost = ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel;
    const etcCost = ov.etc !== '' && ov.etc !== undefined ? Number(ov.etc) : calcEtc;
    const parkingCost = ov.parking !== '' && ov.parking !== undefined ? Number(ov.parking) : calcParking;
    const otherCost = ov.other !== '' && ov.other !== undefined ? Number(ov.other) : calcOther;

    const sumOverrideCost = laborCost + subCostTotal + leaseCost + disposalCost + fuelCost + etcCost + parkingCost + otherCost;
    const baseContractPrice = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName)?.price || 0;
    const profit = (baseContractPrice - sumOverrideCost) + scrapTotal;

    return { 
      days: locMapped.length, 
      laborCost, 
      subCostTotal, 
      leaseCost, 
      disposalCost, 
      fuelCost, 
      etcCost, 
      parkingCost, 
      otherCost, 
      scrapTotal, 
      total: sumOverrideCost, 
      contractPrice: baseContractPrice, 
      profit, 
      reportsWithIndex: locMapped 
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "責任者", "作業者", "外注", "重機", "車両", "軽油L", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
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
    <div className="p-3 md:p-6 bg-slate-100 min-h-screen space-y-6 md:space-y-8 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 md:p-6 rounded-2xl shadow-sm border gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-black">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">🔄 最新に更新</button>
          <button onClick={() => setIsAuthed(false)} className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
        </div>
      </div>

      {/* 現場別 経費集計サマリー */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計サマリー</h2>
        
        <div className="block md:hidden space-y-3">
          {locList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-4 bg-slate-50 rounded-xl border space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#0066cc]">{loc.name}</span>
                  <span className={c.profit >= 0 ? "text-emerald-600 text-xs" : "text-red-600 text-xs"}>粗利: ¥{c.profit.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 text-xs gap-1 text-slate-600">
                  <div>請負: ¥{c.contractPrice.toLocaleString()}</div>
                  <div>日数: {c.days}日</div>
                  <div>経費: ¥{c.total.toLocaleString()}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModalLocation(loc.name)} className="flex-1 bg-[#0066cc] text-white py-2 rounded-lg text-xs font-bold shadow">詳細分析</button>
                  <button onClick={() => downloadLocationCSV(loc.name)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold shadow">CSV</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                    <td className="text-slate-700">¥{c.contractPrice.toLocaleString()}</td>
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
      </div>

      {/* ⚙️ マスタ登録エリア */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">⚙️ マスタ登録・単価設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏢 現場名一覧</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="新しい現場名" value={form.lName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, lName: e.target.value})} />
              <input type="number" placeholder="請負金額" value={form.lPrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, lPrice: e.target.value})} />
              <button onClick={() => addMaster('locations', {name: form.lName, price: Number(form.lPrice)||0}, ['lName', 'lPrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {locList.map((l:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{l.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={l.price || 0} onChange={(e)=>updateItemPrice('locations', idx, 'price', e.target.value)} className="w-20 md:w-24 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('locations', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👤 現場責任者＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="責任者名" value={form.mName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, mName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.mPrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, mPrice: e.target.value})} />
              <button onClick={() => addMaster('managers', {name: form.mName, price: Number(form.mPrice)||0}, ['mName', 'mPrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.managers || []).map((m:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{m.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={m.price || 0} onChange={(e)=>updateItemPrice('managers', idx, 'price', e.target.value)} className="w-16 md:w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('managers', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👥 作業メンバー＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="メンバー名" value={form.wName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, wName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.wPrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, wPrice: e.target.value})} />
              <button onClick={() => addMaster('workers', {name: form.wName, price: Number(form.wPrice)||0}, ['wName', 'wPrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.workers || []).map((w:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{w.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={w.price || 0} onChange={(e)=>updateItemPrice('workers', idx, 'price', e.target.value)} className="w-16 md:w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('workers', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 統合された「外注会社・作業内容・単価」マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3 col-span-full lg:col-span-1">
            <h3 className="font-bold text-sm text-orange-600">🏢 外注会社・作業内容・単価</h3>
            <div className="space-y-2">
              <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, subComp: e.target.value})} />
              <div className="grid grid-cols-12 gap-1">
                <input type="text" placeholder="作業内容" value={form.subTask || ''} className="col-span-7 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, subTask: e.target.value})} />
                <input type="number" placeholder="単価" value={form.subPrice || ''} className="col-span-5 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, subPrice: e.target.value})} />
              </div>
              <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.subcontractors || []).map((sub:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{sub.company} / {sub.task}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={sub.price || 0} onChange={(e)=>updateItemPrice('subcontractors', idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('subcontractors', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚚 自社車両＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="車両名" value={form.vName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, vName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.vPrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, vPrice: e.target.value})} />
              <button onClick={() => addMaster('vehicles', {name: form.vName, price: Number(form.vPrice)||0}, ['vName', 'vPrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.vehicles || []).map((v:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{v.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={v.price || 0} onChange={(e)=>updateItemPrice('vehicles', idx, 'price', e.target.value)} className="w-16 md:w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('vehicles', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚜 自社重機＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="重機名" value={form.cmName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, cmName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.cmPrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, cmPrice: e.target.value})} />
              <button onClick={() => addMaster('companyMachines', {name: form.cmName, price: Number(form.cmPrice)||0}, ['cmName', 'cmPrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.companyMachines || []).map((cm:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{cm.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={cm.price || 0} onChange={(e)=>updateItemPrice('companyMachines', idx, 'price', e.target.value)} className="w-16 md:w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('companyMachines', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏗️ リース重機＆日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="リース名" value={form.leaseName || ''} className="flex-1 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, leaseName: e.target.value})} />
              <input type="number" placeholder="日額" value={form.leasePrice || ''} className="w-20 md:w-24 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, leasePrice: e.target.value})} />
              <button onClick={() => addMaster('leases', {name: form.leaseName, price: Number(form.leasePrice)||0}, ['leaseName', 'leasePrice'])} className="bg-[#E56312] text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm shadow shrink-0">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-lg p-2 space-y-1">
              {(settings.leases || []).map((ls:any, idx:number)=>(
                <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-bold gap-2">
                  <span className="truncate">{ls.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400">日額 ¥</span>
                    <input type="number" value={ls.price || 0} onChange={(e)=>updateItemPrice('leases', idx, 'price', e.target.value)} className="w-16 md:w-20 p-1 border rounded text-right text-xs" />
                    <button onClick={()=>deleteMaster('leases', idx)} className="text-red-500 ml-1">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3 col-span-full lg:col-span-1">
            <h3 className="font-bold text-sm text-orange-600">🗑️ 処分場マスタ＆単価</h3>
            <div className="space-y-2">
              <input type="text" placeholder="処分場名" value={form.dLoc || ''} className="w-full p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, dLoc: e.target.value})} />
              <div className="grid grid-cols-12 gap-1">
                <input type="text" placeholder="品目" value={form.dItem || ''} className="col-span-4 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, dItem: e.target.value})} />
                <input type="text" placeholder="単位" value={form.dUnit || ''} className="col-span-3 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, dUnit: e.target.value})} />
                <input type="number" placeholder="単価" value={form.dPrice || ''} className="col-span-5 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, dPrice: e.target.value})} />
              </div>
              <button onClick={() => addMaster('disposalLocations', {location: form.dLoc, item: form.dItem, unit: form.dUnit || 't', price: Number(form.dPrice)||0}, ['dLoc', 'dItem', 'dUnit', 'dPrice'])} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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

          <div className="bg-slate-50 p-4 rounded-xl border space-y-3 col-span-full lg:col-span-1">
            <h3 className="font-bold text-sm text-orange-600">♻️ スクラップマスタ＆単価</h3>
            <div className="space-y-2">
              <input type="text" placeholder="スクラップ場名" value={form.sLoc || ''} className="w-full p-2 border rounded-lg text-sm bg-white" onChange={e=>setForm({...form, sLoc: e.target.value})} />
              <div className="grid grid-cols-12 gap-1">
                <input type="text" placeholder="品目" value={form.sItem || ''} className="col-span-4 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, sItem: e.target.value})} />
                <input type="text" placeholder="単位" value={form.sUnit || ''} className="col-span-3 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, sUnit: e.target.value})} />
                <input type="number" placeholder="単価" value={form.sPrice || ''} className="col-span-5 p-2 border rounded-lg text-sm bg-white min-w-0" onChange={e=>setForm({...form, sPrice: e.target.value})} />
              </div>
              <button onClick={() => addMaster('scrapLocations', {location: form.sLoc, item: form.sItem, unit: form.sUnit || 't', price: Number(form.sPrice)||0}, ['sLoc', 'sItem', 'sUnit', 'sPrice'])} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-black">📥 送信された日報一覧</h2>
          <input type="text" placeholder="現場名で絞り込み..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-full md:w-48" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-500 text-sm">
                <th className="pb-3 font-bold">日付</th>
                <th className="pb-3 font-bold">現場名</th>
                <th className="pb-3 font-bold">責任者 / 作業者 / 外注</th>
                <th className="pb-3 font-bold">重機 / 車両</th>
                <th className="pb-3 font-bold">作業内容</th>
                <th className="pb-3 font-bold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.map((r, i) => (
                <tr key={r.id || r._id || i} className="hover:bg-slate-50">
                  <td className="py-3 font-bold">{r.date}</td>
                  <td className="py-3 font-bold text-[#0066cc]">{r.location}</td>
                  <td className="py-3 text-xs">
                    {r.manager} / {(r.workers || []).join(', ')}
                    {(r.subcontractors || []).length > 0 && (
                      <div className="text-orange-600 mt-0.5">
                        外注: {(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-xs">{[...(r.machines || []), ...(r.ownMachines || [])].join(', ') || '-'} / {(r.vehicles || []).join(', ') || '-'}</td>
                  <td className="py-3 text-xs">{r.workDescription || '-'}</td>
                  <td className="py-3 text-center space-x-2 whitespace-nowrap">
                    <button onClick={() => setEditingReport(r)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-100">編集</button>
                    <button onClick={() => handleDeleteReport(r, i)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 日報編集モーダル（全項目編集対応） */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateReport} className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <h2 className="text-lg font-black border-b pb-2">✏️ 日報内容の編集（全項目）</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">日付</label>
                <input type="text" value={editingReport.date || ''} onChange={e=>setEditingReport({...editingReport, date: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">現場名</label>
                <select value={editingReport.location || ''} onChange={e=>setEditingReport({...editingReport, location: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm bg-white">
                  {locList.map((l:any)=><option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">現場責任者</label>
                <select value={editingReport.manager || ''} onChange={e=>setEditingReport({...editingReport, manager: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm bg-white">
                  <option value="">選択なし</option>
                  {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">軽油 (L)</label>
                <input type="number" value={editingReport.fuel || 0} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">高速代・ETC (円)</label>
                <input type="number" value={editingReport.etcPrice || 0} onChange={e=>setEditingReport({...editingReport, etcPrice: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">駐車場代 (円)</label>
                <input type="number" value={editingReport.parkingPrice || 0} onChange={e=>setEditingReport({...editingReport, parkingPrice: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
            </div>

            {/* 作業員の編集 */}
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-bold text-orange-600 block">作業員（社員）</label>
              <div className="grid grid-cols-2 gap-2">
                {(settings.workers || []).map((w:any) => {
                  const isChecked = (editingReport.workers || []).includes(w.name);
                  return (
                    <label key={w.name} className={`p-2 border rounded-lg text-xs flex items-center gap-2 cursor-pointer ${isChecked ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>
                      <input type="checkbox" checked={isChecked} onChange={(e)=>{
                        const current = editingReport.workers || [];
                        const next = e.target.checked ? [...current, w.name] : current.filter((x:string)=>x!==w.name);
                        setEditingReport({...editingReport, workers: next});
                      }} className="rounded" />
                      {w.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 外注作業員の編集 */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-orange-600">外注・派遣作業員</label>
                <button type="button" onClick={() => {
                  const subs = editingReport.subcontractors || [];
                  setEditingReport({...editingReport, subcontractors: [...subs, {company: '', task: '', count: ''}]});
                }} className="bg-emerald-600 text-white text-xs px-2 py-1 rounded font-bold">＋ 追加</button>
              </div>
              {(editingReport.subcontractors || []).map((sub:any, idx:number)=>(
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded border">
                  <select value={sub.company} onChange={e=>{
                    const subs = [...(editingReport.subcontractors || [])];
                    subs[idx].company = e.target.value;
                    setEditingReport({...editingReport, subcontractors: subs});
                  }} className="col-span-4 p-1.5 border rounded text-xs bg-white">
                    <option value="">会社名...</option>
                    {Array.from(new Set((settings.subcontractors || []).map((s:any)=>s.company))).map((comp:any)=>(
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                  <select value={sub.task} onChange={e=>{
                    const subs = [...(editingReport.subcontractors || [])];
                    subs[idx].task = e.target.value;
                    setEditingReport({...editingReport, subcontractors: subs});
                  }} className="col-span-5 p-1.5 border rounded text-xs bg-white">
                    <option value="">作業内容...</option>
                    {(settings.subcontractors || []).filter((s:any)=>!sub.company || s.company === sub.company).map((s:any, i:number)=>(
                      <option key={i} value={s.task}>{s.task}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="人数" value={sub.count} onChange={e=>{
                    const subs = [...(editingReport.subcontractors || [])];
                    subs[idx].count = e.target.value;
                    setEditingReport({...editingReport, subcontractors: subs});
                  }} className="col-span-2 p-1.5 border rounded text-xs bg-white" />
                  <button type="button" onClick={()=>{
                    const subs = (editingReport.subcontractors || []).filter((_:any,i:number)=>i!==idx);
                    setEditingReport({...editingReport, subcontractors: subs});
                  }} className="col-span-1 text-red-500 font-bold text-center">✕</button>
                </div>
              ))}
            </div>

            {/* 重機・車両の編集 */}
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-bold text-orange-600 block">重機・車両</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-1">リース重機</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto border p-1 rounded bg-slate-50">
                    {(settings.leases || []).map((m:any)=>{
                      const checked = (editingReport.machines || []).includes(m.name);
                      return (
                        <label key={m.name} className="flex items-center gap-1">
                          <input type="checkbox" checked={checked} onChange={e=>{
                            const cur = editingReport.machines || [];
                            const next = e.target.checked ? [...cur, m.name] : cur.filter((x:string)=>x!==m.name);
                            setEditingReport({...editingReport, machines: next});
                          }} />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1">自社重機</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto border p-1 rounded bg-slate-50">
                    {(settings.companyMachines || []).map((m:any)=>{
                      const checked = (editingReport.ownMachines || []).includes(m.name);
                      return (
                        <label key={m.name} className="flex items-center gap-1">
                          <input type="checkbox" checked={checked} onChange={e=>{
                            const cur = editingReport.ownMachines || [];
                            const next = e.target.checked ? [...cur, m.name] : cur.filter((x:string)=>x!==m.name);
                            setEditingReport({...editingReport, ownMachines: next});
                          }} />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1">自社車両</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto border p-1 rounded bg-slate-50">
                    {(settings.vehicles || []).map((v:any)=>{
                      const checked = (editingReport.vehicles || []).includes(v.name);
                      return (
                        <label key={v.name} className="flex items-center gap-1">
                          <input type="checkbox" checked={checked} onChange={e=>{
                            const cur = editingReport.vehicles || [];
                            const next = e.target.checked ? [...cur, v.name] : cur.filter((x:string)=>x!==v.name);
                            setEditingReport({...editingReport, vehicles: next});
                          }} />
                          <span className="truncate">{v.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">作業内容</label>
              <textarea value={editingReport.workDescription || ''} onChange={e=>setEditingReport({...editingReport, workDescription: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm h-20" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl font-bold text-sm shadow hover:bg-orange-700">更新を保存</button>
              <button type="button" onClick={() => setEditingReport(null)} className="flex-1 bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 md:p-4 z-40">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-4 md:p-6 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg md:text-xl font-black">{modalLocation} (詳細分析)</h2>
                <p className="text-xs text-slate-500">お金の流れと原価詳細</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs md:text-sm font-bold shadow">CSV</button>
                <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-3 py-2 rounded-xl text-xs md:text-sm font-bold">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">請負金額</div><div className="text-sm md:text-md font-black">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">合計経費</div><div className="text-sm md:text-md font-black text-emerald-700">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">利益（売却益込）</div><div className="text-sm md:text-md font-black text-blue-700">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">稼働日数</div><div className="text-sm md:text-md font-black text-amber-700">{modalData.days}日</div></div>
            </div>

            {/* 経費・収支の内訳明細 */}
            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-700">📋 経費・収支の内訳明細（総合計・編集可能）</h3>
                <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow hover:bg-orange-700">🔍 処分費の内訳を確認</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                
                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">社員人件費</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.labor ?? modalData.laborCost} onChange={e=>handleCostOverrideChange(modalLocation, 'labor', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">外注人件費</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.sub ?? modalData.subCostTotal} onChange={e=>handleCostOverrideChange(modalLocation, 'sub', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">重機リース・自社重機</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.lease ?? modalData.leaseCost} onChange={e=>handleCostOverrideChange(modalLocation, 'lease', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">処分費</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.disposal ?? modalData.disposalCost} onChange={e=>handleCostOverrideChange(modalLocation, 'disposal', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">燃料代 (軽油)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.fuel ?? modalData.fuelCost} onChange={e=>handleCostOverrideChange(modalLocation, 'fuel', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">高速代・ETC</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.etc ?? modalData.etcCost} onChange={e=>handleCostOverrideChange(modalLocation, 'etc', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">駐車場代</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.parking ?? modalData.parkingCost} onChange={e=>handleCostOverrideChange(modalLocation, 'parking', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-bold">その他雑費</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">¥</span>
                    <input type="number" value={costOverrides[modalLocation]?.other ?? modalData.otherCost} onChange={e=>handleCostOverrideChange(modalLocation, 'other', e.target.value)} className="w-full p-1.5 border rounded font-bold text-right" />
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border flex justify-between items-center col-span-full">
                  <span className="text-emerald-700 font-bold text-xs">♻️ スクラップ売却計</span>
                  <span className="font-black text-emerald-700">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                </div>

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
                      <div key={r.id || r._id || idx} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b pb-2 text-xs font-bold text-slate-600">
                          <span>📅 日付: {r.date}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">日報合計経費: ¥{daily.totalDailyCost.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-slate-400">責任者:</span> {r.manager || '-'}</div>
                          <div><span className="text-slate-400">作業員:</span> {(r.workers || []).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">外注:</span> {(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">重機:</span> {[...(r.machines || []), ...(r.ownMachines || [])].join(', ') || '-'}</div>
                          <div><span className="text-slate-400">車両:</span> {(r.vehicles || []).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">軽油:</span> {r.fuel || 0} L</div>
                          <div><span className="text-slate-400">ETC:</span> ¥{Number(r.etcPrice || 0).toLocaleString()}</div>
                          <div><span className="text-slate-400">駐車場代:</span> ¥{Number(r.parkingPrice || 0).toLocaleString()}</div>
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

      {/* 処分費詳細モーダル（処分内容一覧） */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-slate-800">🗑️ {modalLocation} - 処分内容一覧</h3>
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition">閉じる</button>
            </div>

            <div className="space-y-3">
              {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => ({ ...d, date: r.date }))).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">搬出された処分データはありません</p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-4 bg-slate-100 p-3 text-xs font-bold text-slate-600">
                    <div>日付</div>
                    <div>処分場名</div>
                    <div>品目</div>
                    <div className="text-right">数量・金額</div>
                  </div>
                  {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => {
                    const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
                    const subTotal = Number(d.quantity || 0) * uPrice;
                    return (
                      <div key={idx} className="grid grid-cols-4 p-3 text-xs items-center bg-white">
                        <div className="font-bold">{r.date}</div>
                        <div>{d.location || '-'}</div>
                        <div>{d.item || '-'}</div>
                        <div className="text-right font-bold">{Number(d.quantity || 0)} {d.unit || 't'} (¥{subTotal.toLocaleString()})</div>
                      </div>
                    );
                  }))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
