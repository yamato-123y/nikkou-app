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

  // 経費内訳明細の手動編集用オーバーライドステート
  const [costOverrides, setCostOverrides] = useState<any>({});

  // 各項目の編集モードを管理するステート
  const [editingCostFields, setEditingCostFields] = useState<any>({});

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

  // 並び替え機能（上へ / 下へ）
  const moveMasterItem = (key: string, idx: number, direction: 'up' | 'down') => {
    const list = [...(settings[key] || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    saveMaster(key, list);
  };

  const updateItemPrice = (key: string, idx: number, field: string, value: any) => {
    const list = [...(settings[key] || [])];
    list[idx] = { ...list[idx], [field]: field === 'company' || field === 'task' ? value : (Number(value) || 0) };
    saveMaster(key, list);
  };

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

  const toggleCostFieldEdit = (locName: string, field: string) => {
    const current = editingCostFields[locName] || {};
    setEditingCostFields({
      ...editingCostFields,
      [locName]: {
        ...current,
        [field]: !current[field]
      }
    });
  };

  const handleDeleteReport = async (report: any, index: number) => {
    if (!confirm('この日報データを削除してもよろしいですか？')) return;
    const targetId = report.id || report._id || report.reportId;
    await fetch('/api/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId, index })
    });
    fetchData();
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingReport,
      id: editingReport.id || editingReport._id
    };
    const res = await fetch('/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setEditingReport(null);
      fetchData();
    } else {
      alert('更新に失敗しました。');
    }
  };

  // --- 計算ロジック ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += ((settings.managers || []).find((x:any) => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let subCost = 0;
    (r.subcontractors || []).forEach((sub: any) => {
      const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
      const unitP = subMaster?.price || 0;
      subCost += (Number(sub.count || 0) * unitP);
    });

    let leaseC = 0;
    (r.machines || []).forEach((m: string) => leaseC += ((settings.leases || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseHeavy || []).forEach((m: string) => leaseC += ((settings.leaseHeavy || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseAttach || []).forEach((m: string) => leaseC += ((settings.leaseAttach || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseOther || []).forEach((m: string) => leaseC += ((settings.leaseOther || []).find((x:any) => x.name === m)?.price || 0));

    let otherLeaseC = 0;
    (r.otherLeases || []).forEach((ol: any) => {
      otherLeaseC += Number(ol.price || 0);
    });

    let ownMachineC = 0;
    (r.ownMachines || []).forEach((m: string) => ownMachineC += ((settings.companyMachines || []).find((x:any) => x.name === m)?.price || 0));

    let vehicleC = 0;
    (r.vehicles || []).forEach((v: string) => vehicleC += ((settings.vehicles || []).find((x:any) => x.name === v)?.price || 0));

    let dispC = 0;
    const disposalBreakdown: {[locName: string]: number} = {};
    (r.disposals || []).forEach((d: any) => {
      const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
      const subT = Number(d.quantity || 0) * uPrice;
      dispC += subT;
      const locKey = d.location || 'その他処分場';
      disposalBreakdown[locKey] = (disposalBreakdown[locKey] || 0) + subT;
    });

    let scrapC = 0;
    const scrapBreakdown: {[key: string]: number} = {};
    (r.scraps || []).forEach((sc: any) => {
      const uPrice = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item)?.price || 0;
      const subT = Number(sc.quantity || 0) * uPrice;
      scrapC += subT;
      const scrapKey = `${sc.location || 'その他スクラップ場'} (${sc.item || '品目未指定'})`;
      scrapBreakdown[scrapKey] = (scrapBreakdown[scrapKey] || 0) + subT;
    });

    const fC = Number(r.fuel || 0);
    const eC = Number(r.etcPrice || 0);
    const pC = Number(r.parkingPrice || 0);
    const oC = Number(r.otherPrice || 0);
    const totalDailyCost = lCost + subCost + leaseC + otherLeaseC + ownMachineC + vehicleC + dispC + fC + eC + pC + oC;

    return { lCost, subCost, leaseC, otherLeaseC, ownMachineC, vehicleC, dispC, disposalBreakdown, fC, eC, pC, oC, scrapC, scrapBreakdown, totalDailyCost };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDisp = 0;
    let calcFuel = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotal = 0;
    const aggregatedDisposalBreakdown: {[loc: string]: number} = {};
    const aggregatedScrapBreakdown: {[key: string]: number} = {};
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcOtherLease += dc.otherLeaseC;
      calcOwnMachine += dc.ownMachineC;
      calcVehicle += dc.vehicleC;
      calcDisp += dc.dispC;

      Object.entries(dc.disposalBreakdown).forEach(([loc, val]) => {
        aggregatedDisposalBreakdown[loc] = (aggregatedDisposalBreakdown[loc] || 0) + val;
      });

      Object.entries(dc.scrapBreakdown).forEach(([key, val]) => {
        aggregatedScrapBreakdown[key] = (aggregatedScrapBreakdown[key] || 0) + val;
      });

      calcFuel += dc.fC; calcEtc += dc.eC; calcParking += dc.pC; calcOther += dc.oC; scrapTotal += dc.scrapC;
    });

    const ov = costOverrides[locName] || {};
    const laborCost = ov.labor !== '' && ov.labor !== undefined ? Number(ov.labor) : calcLabor;
    const subCostTotal = ov.sub !== '' && ov.sub !== undefined ? Number(ov.sub) : calcSub;
    const leaseCost = ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease;
    const otherLeaseCost = ov.otherLease !== '' && ov.otherLease !== undefined ? Number(ov.otherLease) : calcOtherLease;
    const ownMachineCost = ov.ownMachine !== '' && ov.ownMachine !== undefined ? Number(ov.ownMachine) : calcOwnMachine;
    const vehicleCost = ov.vehicle !== '' && ov.vehicle !== undefined ? Number(ov.vehicle) : calcVehicle;
    const disposalCost = ov.disposal !== '' && ov.disposal !== undefined ? Number(ov.disposal) : calcDisp;
    const fuelCost = ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel;
    const etcCost = ov.etc !== '' && ov.etc !== undefined ? Number(ov.etc) : calcEtc;
    const parkingCost = ov.parking !== '' && ov.parking !== undefined ? Number(ov.parking) : calcParking;
    const otherCost = ov.other !== '' && ov.other !== undefined ? Number(ov.other) : calcOther;

    const sumOverrideCost = laborCost + subCostTotal + leaseCost + otherLeaseCost + ownMachineCost + vehicleCost + disposalCost + fuelCost + etcCost + parkingCost + otherCost;
    const baseContractPrice = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName)?.price || 0;
    const profit = (baseContractPrice - sumOverrideCost) + scrapTotal;

    return { 
      days: locMapped.length, 
      laborCost, 
      subCostTotal, 
      leaseCost, 
      otherLeaseCost,
      ownMachineCost,
      vehicleCost,
      disposalCost, 
      aggregatedDisposalBreakdown,
      fuelCost, 
      etcCost, 
      parkingCost, 
      otherCost, 
      scrapTotal,
      aggregatedScrapBreakdown,
      total: sumOverrideCost, 
      contractPrice: baseContractPrice, 
      profit, 
      reportsWithIndex: locMapped 
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "責任者", "作業者", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
      [...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || [])].join('/'),
      (r.otherLeases || []).map((ol:any)=>`${ol.name}(¥${ol.price})`).join('/'),
      (r.ownMachines || []).join('/'),
      (r.vehicles || []).join('/'), 
      r.fuel || 0, r.etcPrice || 0, r.parkingPrice || 0,
      r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${locName}_日報データ.csv`; link.click();
  };

  if (!isAuthed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl space-y-6 w-full max-w-sm border border-slate-100">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-slate-800">管理者ログイン</h1>
          <p className="text-sm text-slate-400">株式会社大和 音声日報システム</p>
        </div>
        <div className="space-y-4">
          <input 
            type="password" 
            placeholder="パスワードを入力" 
            className="w-full p-4 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" 
            onChange={e => setPassword(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && ((password === 'yamato123' || password === 'yamato') && setIsAuthed(true))}
          />
          <button 
            onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} 
            className="w-full bg-[#E56312] hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-base shadow-md shadow-orange-500/20 transition"
          >
            ログインする
          </button>
        </div>
      </div>
    </div>
  );

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation));
  const locList = (settings.locations || []).map((l:any) => typeof l === 'string' ? {name: l, price: 0} : l);

  return (
    <div className="p-4 md:p-8 bg-slate-100 min-h-screen space-y-6 md:space-y-8 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* 🚀 ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">📊 現場日報・原価管理ダッシュボード</h1>
          <p className="text-sm text-slate-400 font-medium">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 px-5 py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2">
            🔄 最新データに更新
          </button>
          <button onClick={() => setIsAuthed(false)} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-bold text-sm transition">
            ログアウト
          </button>
        </div>
      </div>

      {/* 🏢 現場別 経費集計サマリー */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <h2 className="text-xl font-black text-slate-900">🏢 現場別 経費集計サマリー</h2>
        
        <div className="block md:hidden space-y-4">
          {locList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-600 text-base">{loc.name}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    粗利: ¥{c.profit.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-xs gap-2 text-slate-500 font-medium border-y border-slate-200/60 py-3">
                  <div>請負: <span className="text-slate-900 font-bold text-sm block">¥{c.contractPrice.toLocaleString()}</span></div>
                  <div>日数: <span className="text-slate-900 font-bold text-sm block">{c.days}日</span></div>
                  <div>経費: <span className="text-slate-900 font-bold text-sm block">¥{c.total.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalLocation(loc.name)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-sm transition">詳細分析</button>
                  <button onClick={() => downloadLocationCSV(loc.name)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold shadow-sm transition">CSV出力</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-4 px-4">現場名</th>
                <th className="pb-4 px-4">請負金額</th>
                <th className="pb-4 px-4">稼働日数</th>
                <th className="pb-4 px-4">合計経費</th>
                <th className="pb-4 px-4">粗利</th>
                <th className="pb-4 px-4 text-center">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base font-medium">
              {locList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-5 px-4 font-bold text-blue-600">{loc.name}</td>
                    <td className="py-5 px-4 text-slate-700 font-bold">¥{c.contractPrice.toLocaleString()}</td>
                    <td className="py-5 px-4 text-slate-700">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold">¥{c.total.toLocaleString()}</td>
                    <td className={`py-5 px-4 font-black ${c.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ¥{c.profit.toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-center space-x-3">
                      <button onClick={() => setModalLocation(loc.name)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm">
                        詳細分析 →
                      </button>
                      <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm">
                        CSV
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚙️ マスタ登録・単価設定エリア */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h2 className="text-xl font-black text-slate-900">⚙️ マスタ登録・単価設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {[
            { title: "🏢 現場名一覧", key: "locations", nameKey: "name", addForm: ['lName', 'lPrice'], placeholders: ["新しい現場名", "請負金額"], type: "locations" },
            { title: "👤 現場責任者＆日額単価", key: "managers", nameKey: "name", addForm: ['mName', 'mPrice'], placeholders: ["責任者名", "日額"], type: "managers" },
            { title: "👥 作業メンバー＆日額単価", key: "workers", nameKey: "name", addForm: ['wName', 'wPrice'], placeholders: ["メンバー名", "日額"], type: "workers" },
            { title: "🏢 外注会社・作業内容・単価", key: "subcontractors", isSub: true },
            { title: "🚚 自社車両＆日額単価", key: "vehicles", nameKey: "name", addForm: ['vName', 'vPrice'], placeholders: ["車両名", "日額"], type: "vehicles" },
            { title: "🚜 自社重機＆日額単価", key: "companyMachines", nameKey: "name", addForm: ['cmName', 'cmPrice'], placeholders: ["重機名", "日額"], type: "companyMachines" },
            { title: "🚜 リース：重機＆日額単価", key: "leaseHeavy", nameKey: "name", addForm: ['lhName', 'lhPrice'], placeholders: ["重機名", "日額"], type: "leaseHeavy" },
            { title: "⚙️ リース：アタッチメント＆日額単価", key: "leaseAttach", nameKey: "name", addForm: ['laName', 'laPrice'], placeholders: ["アタッチメント名", "日額"], type: "leaseAttach" },
            { title: "🛠️ リース：その他 機械・機器＆日額単価", key: "leaseOther", nameKey: "name", addForm: ['loName', 'loPrice'], placeholders: ["機械・機器名", "日額"], type: "leaseOther" },
            { title: "🗑️ 処分場マスタ＆単価", key: "disposalLocations", isDisp: true },
            { title: "♻️ スクラップマスタ＆単価", key: "scrapLocations", isScrap: true },
          ].map((sec, idx) => (
            <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wider">{sec.title}</h3>
              
              {/* 各追加フォーム */}
              {sec.isSub ? (
                <div className="space-y-2">
                  <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subComp: e.target.value})} />
                  <div className="grid grid-cols-12 gap-2">
                    <input type="text" placeholder="作業内容" value={form.subTask || ''} className="col-span-7 p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subTask: e.target.value})} />
                    <input type="number" placeholder="単価" value={form.subPrice || ''} className="col-span-5 p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subPrice: e.target.value})} />
                  </div>
                  <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">追加</button>
                </div>
              ) : sec.isDisp || sec.isScrap ? (
                <div className="space-y-2">
                  <input type="text" placeholder={sec.isDisp ? "処分場名" : "スクラップ場名"} value={form[sec.isDisp ? 'dLoc' : 'sLoc'] || ''} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dLoc' : 'sLoc']: e.target.value})} />
                  <div className="grid grid-cols-12 gap-2">
                    <input type="text" placeholder="品目" value={form[sec.isDisp ? 'dItem' : 'sItem'] || ''} className="col-span-4 p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dItem' : 'sItem']: e.target.value})} />
                    <input type="text" placeholder="単位" value={form[sec.isDisp ? 'dUnit' : 'sUnit'] || ''} className="col-span-3 p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dUnit' : 'sUnit']: e.target.value})} />
                    <input type="number" placeholder="単価" value={form[sec.isDisp ? 'dPrice' : 'sPrice'] || ''} className="col-span-5 p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dPrice' : 'sPrice']: e.target.value})} />
                  </div>
                  <button onClick={() => addMaster(sec.key, {location: form[sec.isDisp ? 'dLoc' : 'sLoc'], item: form[sec.isDisp ? 'dItem' : 'sItem'], unit: form[sec.isDisp ? 'dUnit' : 'sUnit'] || 't', price: Number(form[sec.isDisp ? 'dPrice' : 'sPrice'])||0}, sec.isDisp ? ['dLoc', 'dItem', 'dUnit', 'dPrice'] : ['sLoc', 'sItem', 'sUnit', 'sPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">追加</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                  <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                  <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0}, sec.addForm)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">追加</button>
                </div>
              )}

              {/* 一覧リスト（並び替えボタン付き） */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200/60 rounded-xl p-3 space-y-2">
                {(settings[sec.key] || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">登録データがありません</p>
                ) : (
                  (settings[sec.key] || []).map((item:any, idx:number)=>(
                    <div key={idx} className="py-2.5 flex justify-between items-center text-sm font-medium gap-2">
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => moveMasterItem(sec.key, idx, 'up')} 
                          disabled={idx === 0}
                          className="w-6 h-6 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition"
                          title="上へ"
                        >
                          ▲
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveMasterItem(sec.key, idx, 'down')} 
                          disabled={idx === (settings[sec.key] || []).length - 1}
                          className="w-6 h-6 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition"
                          title="下へ"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="truncate text-slate-800 font-bold flex-1 px-1">
                        {sec.isSub ? `${item.company} / ${item.task}` : sec.isDisp || sec.isScrap ? `${item.location} (${item.item}/${item.unit})` : item.name}
                      </span>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400">¥</span>
                        <input type="number" value={item.price || 0} onChange={(e)=>updateItemPrice(sec.key, idx, 'price', e.target.value)} className="w-20 p-2 border border-slate-200 rounded-xl text-right text-sm font-bold bg-slate-50" />
                        <button type="button" onClick={()=>deleteMaster(sec.key, idx)} className="text-rose-500 hover:text-rose-700 font-bold text-xs ml-1">削除</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* 📥 送信された日報一覧 */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl font-black text-slate-900">📥 送信された日報一覧</h2>
          <input 
            type="text" 
            placeholder="🔍 現場名で絞り込み..." 
            value={filterLocation} 
            onChange={e => setFilterLocation(e.target.value)} 
            className="p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none w-full md:w-72 transition" 
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-4 px-4">日付</th>
                <th className="pb-4 px-4">現場名</th>
                <th className="pb-4 px-4">責任者 / 作業者 / 外注</th>
                <th className="pb-4 px-4">重機 / 車両</th>
                <th className="pb-4 px-4">作業内容</th>
                <th className="pb-4 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium">
              {filteredReports.map((r, i) => (
                <tr key={r.id || r._id || i} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-4 font-bold text-slate-800">{r.date}</td>
                  <td className="py-4 px-4 font-bold text-blue-600">{r.location}</td>
                  <td className="py-4 px-4 text-slate-700 space-y-1">
                    <div>{r.manager} / {(r.workers || []).join(', ')}</div>
                    {(r.subcontractors || []).length > 0 && (
                      <div className="text-orange-600 font-bold">
                        外注: {(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-600">{[...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.ownMachines || []), ...(r.vehicles || [])].join(', ') || '-'}</td>
                  <td className="py-4 px-4 text-slate-600 max-w-xs truncate">{r.workDescription || '-'}</td>
                  <td className="py-4 px-4 text-center space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingReport({ ...r })} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2 rounded-xl font-bold transition shadow-sm text-xs">編集</button>
                    <button onClick={() => handleDeleteReport(r, i)} className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 px-4 py-2 rounded-xl font-bold transition shadow-sm text-xs">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✏️ 日報編集モーダル */}
      {editingReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleUpdateReport} className="bg-white rounded-3xl w-full max-w-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">✏️ 日報内容の編集</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">日付</label>
                <input type="text" value={editingReport.date || ''} onChange={e=>setEditingReport({...editingReport, date: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base bg-slate-50/50" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">現場名</label>
                <select value={editingReport.location || ''} onChange={e=>setEditingReport({...editingReport, location: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base bg-white">
                  {locList.map((l:any)=><option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">現場責任者</label>
                <select value={editingReport.manager || ''} onChange={e=>setEditingReport({...editingReport, manager: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base bg-white">
                  <option value="">選択なし</option>
                  {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">軽油 (L)</label>
                <input type="number" value={editingReport.fuel || 0} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">高速代・ETC (円)</label>
                <input type="number" value={editingReport.etcPrice || 0} onChange={e=>setEditingReport({...editingReport, etcPrice: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1.5">駐車場代 (円)</label>
                <input type="number" value={editingReport.parkingPrice || 0} onChange={e=>setEditingReport({...editingReport, parkingPrice: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base" />
              </div>
            </div>

            {/* 作業員 */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <label className="text-sm font-bold text-orange-600 block">作業員（社員）</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(settings.workers || []).map((w:any) => {
                  const isChecked = (editingReport.workers || []).includes(w.name);
                  return (
                    <label key={w.name} className={`p-3.5 border rounded-2xl text-sm flex items-center gap-3 cursor-pointer transition ${isChecked ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" checked={isChecked} onChange={(e)=>{
                        const cur = editingReport.workers || [];
                        const next = e.target.checked ? [...cur, w.name] : cur.filter((x:string)=>x!==w.name);
                        setEditingReport({...editingReport, workers: next});
                      }} className="rounded accent-orange-600 w-4 h-4" />
                      <span className="font-bold">{w.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 🚜 自社重機 */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <label className="text-sm font-bold text-orange-600 block">自社重機</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(settings.companyMachines || []).map((cm:any) => {
                  const isChecked = (editingReport.ownMachines || []).includes(cm.name);
                  return (
                    <label key={cm.name} className={`p-3.5 border rounded-2xl text-sm flex items-center gap-3 cursor-pointer transition ${isChecked ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" checked={isChecked} onChange={(e)=>{
                        const cur = editingReport.ownMachines || [];
                        const next = e.target.checked ? [...cur, cm.name] : cur.filter((x:string)=>x!==cm.name);
                        setEditingReport({...editingReport, ownMachines: next});
                      }} className="rounded accent-orange-600 w-4 h-4" />
                      <span className="font-bold">{cm.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 🚚 自社車両 */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <label className="text-sm font-bold text-orange-600 block">自社車両</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(settings.vehicles || []).map((v:any) => {
                  const isChecked = (editingReport.vehicles || []).includes(v.name);
                  return (
                    <label key={v.name} className={`p-3.5 border rounded-2xl text-sm flex items-center gap-3 cursor-pointer transition ${isChecked ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" checked={isChecked} onChange={(e)=>{
                        const cur = editingReport.vehicles || [];
                        const next = e.target.checked ? [...cur, v.name] : cur.filter((x:string)=>x!==v.name);
                        setEditingReport({...editingReport, vehicles: next});
                      }} className="rounded accent-orange-600 w-4 h-4" />
                      <span className="font-bold">{v.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 🗑️ 処分場への搬出 */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-orange-600 block">処分場への搬出</label>
                <button type="button" onClick={() => {
                  const cur = editingReport.disposals || [];
                  setEditingReport({ ...editingReport, disposals: [...cur, { location: '', item: '', quantity: 0, unit: 't' }] });
                }} className="bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs px-3 py-1.5 rounded-xl font-bold transition">＋ 処分行を追加</button>
              </div>
              <div className="space-y-3">
                {(editingReport.disposals || []).map((d:any, idx:number) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <input type="text" placeholder="処分場名" value={d.location || ''} onChange={e => {
                      const list = [...editingReport.disposals];
                      list[idx] = { ...list[idx], location: e.target.value };
                      setEditingReport({ ...editingReport, disposals: list });
                    }} className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                    <input type="text" placeholder="品目" value={d.item || ''} onChange={e => {
                      const list = [...editingReport.disposals];
                      list[idx] = { ...list[idx], item: e.target.value };
                      setEditingReport({ ...editingReport, disposals: list });
                    }} className="w-28 p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                    <input type="number" placeholder="数量" value={d.quantity || 0} onChange={e => {
                      const list = [...editingReport.disposals];
                      list[idx] = { ...list[idx], quantity: Number(e.target.value) };
                      setEditingReport({ ...editingReport, disposals: list });
                    }} className="w-20 p-2.5 border border-slate-200 rounded-xl text-sm bg-white text-right" />
                    <span className="text-xs text-slate-500 font-bold">t</span>
                    <button type="button" onClick={() => {
                      const list = (editingReport.disposals || []).filter((_:any, i:number) => i !== idx);
                      setEditingReport({ ...editingReport, disposals: list });
                    }} className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* ♻️ スクラップの搬出 */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-orange-600 block">スクラップの搬出</label>
                <button type="button" onClick={() => {
                  const cur = editingReport.scraps || [];
                  setEditingReport({ ...editingReport, scraps: [...cur, { location: '', item: '', quantity: 0, unit: 't' }] });
                }} className="bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs px-3 py-1.5 rounded-xl font-bold transition">＋ スクラップ行を追加</button>
              </div>
              <div className="space-y-3">
                {(editingReport.scraps || []).map((sc:any, idx:number) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <input type="text" placeholder="スクラップ場名" value={sc.location || ''} onChange={e => {
                      const list = [...editingReport.scraps];
                      list[idx] = { ...list[idx], location: e.target.value };
                      setEditingReport({ ...editingReport, scraps: list });
                    }} className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                    <input type="text" placeholder="品目" value={sc.item || ''} onChange={e => {
                      const list = [...editingReport.scraps];
                      list[idx] = { ...list[idx], item: e.target.value };
                      setEditingReport({ ...editingReport, scraps: list });
                    }} className="w-28 p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                    <input type="number" placeholder="数量" value={sc.quantity || 0} onChange={e => {
                      const list = [...editingReport.scraps];
                      list[idx] = { ...list[idx], quantity: Number(e.target.value) };
                      setEditingReport({ ...editingReport, scraps: list });
                    }} className="w-20 p-2.5 border border-slate-200 rounded-xl text-sm bg-white text-right" />
                    <span className="text-xs text-slate-500 font-bold">t</span>
                    <button type="button" onClick={() => {
                      const list = (editingReport.scraps || []).filter((_:any, i:number) => i !== idx);
                      setEditingReport({ ...editingReport, scraps: list });
                    }} className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1">削除</button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-500 block mb-1.5">作業内容</label>
              <textarea value={editingReport.workDescription || ''} onChange={e=>setEditingReport({...editingReport, workDescription: e.target.value})} className="w-full p-4 border border-slate-200 rounded-2xl text-base h-28" />
            </div>

            <div className="flex gap-4 pt-3">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-base shadow-md transition">更新を保存する</button>
              <button type="button" onClick={() => setEditingReport(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-bold text-base transition">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 🔍 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{modalLocation} <span className="text-base font-normal text-slate-400">（詳細分析）</span></h2>
                <p className="text-sm text-slate-400">原価・収支および内訳明細</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">CSV出力</button>
                <button onClick={() => setModalLocation(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100"><div className="text-sm text-slate-500 font-medium">請負金額</div><div className="text-lg md:text-xl font-black text-slate-800 mt-1">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100/60"><div className="text-sm text-emerald-600 font-medium">合計経費</div><div className="text-lg md:text-xl font-black text-emerald-700 mt-1">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100/60"><div className="text-sm text-blue-600 font-medium">利益（売却益込）</div><div className="text-lg md:text-xl font-black text-blue-700 mt-1">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-100/60"><div className="text-sm text-amber-600 font-medium">稼働日数</div><div className="text-lg md:text-xl font-black text-amber-700 mt-1">{modalData.days}日</div></div>
            </div>

            {/* 📋 経費・収支の内訳明細（編集可能カード） */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-5">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-bold text-base text-slate-800">📋 経費・収支の内訳明細（編集可能）</h3>
                <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow-sm transition">🔍 処分費の内訳を確認</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {[
                  { key: 'labor', label: '社員人件費', val: costOverrides[modalLocation]?.labor ?? modalData.laborCost },
                  { key: 'sub', label: '外注人件費', val: costOverrides[modalLocation]?.sub ?? modalData.subCostTotal },
                  { key: 'lease', label: 'リース合計', val: costOverrides[modalLocation]?.lease ?? modalData.leaseCost },
                  { key: 'otherLease', label: 'その他リース', val: costOverrides[modalLocation]?.otherLease ?? modalData.otherLeaseCost },
                  { key: 'ownMachine', label: '自社重機', val: costOverrides[modalLocation]?.ownMachine ?? modalData.ownMachineCost },
                  { key: 'vehicle', label: '自社車両', val: costOverrides[modalLocation]?.vehicle ?? modalData.vehicleCost },
                  { key: 'disposal', label: '🗑️ 処分費 (合計)', val: costOverrides[modalLocation]?.disposal ?? modalData.disposalCost, isDisposal: true },
                  { key: 'fuel', label: '燃料代 (軽油)', val: costOverrides[modalLocation]?.fuel ?? modalData.fuelCost },
                  { key: 'etc', label: '高速代・ETC', val: costOverrides[modalLocation]?.etc ?? modalData.etcCost },
                  { key: 'parking', label: '駐車場代', val: costOverrides[modalLocation]?.parking ?? modalData.parkingCost },
                  { key: 'other', label: 'その他雑費', val: costOverrides[modalLocation]?.other ?? modalData.otherCost },
                ].map((item) => {
                  const isEditing = editingCostFields[modalLocation]?.[item.key];
                  return (
                    <div key={item.key} className={`bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between gap-3 ${item.isDisposal ? 'col-span-full md:col-span-1' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${item.isDisposal ? 'text-orange-600' : 'text-slate-500'}`}>{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleCostFieldEdit(modalLocation, item.key)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          {isEditing ? '🔒 完了' : '✏️ 編集'}
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400 font-bold text-lg">¥</span>
                          <input
                            type="number"
                            value={costOverrides[modalLocation]?.[item.key] ?? (item.isDisposal ? modalData.disposalCost : (item.key === 'labor' ? modalData.laborCost : item.key === 'sub' ? modalData.subCostTotal : item.key === 'lease' ? modalData.leaseCost : item.key === 'otherLease' ? modalData.otherLeaseCost : item.key === 'ownMachine' ? modalData.ownMachineCost : item.key === 'vehicle' ? modalData.vehicleCost : item.key === 'fuel' ? modalData.fuelCost : item.key === 'etc' ? modalData.etcCost : item.key === 'parking' ? modalData.parkingCost : modalData.otherCost))}
                            onChange={e => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-right text-base bg-slate-50"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="font-black text-slate-900 text-xl">
                          ¥{Number(item.val || 0).toLocaleString()}
                        </div>
                      )}

                      {item.isDisposal && (
                        <div className="text-xs text-slate-500 mt-2 space-y-1 border-t border-slate-100 pt-2">
                          {Object.entries(modalData.aggregatedDisposalBreakdown).length === 0 ? (
                            <div>内訳なし</div>
                          ) : (
                            Object.entries(modalData.aggregatedDisposalBreakdown).map(([locName, val]: [string, any]) => (
                              <div key={locName} className="flex justify-between">
                                <span>・{locName}:</span>
                                <span className="font-bold">¥{val.toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col gap-2 col-span-full shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800 font-bold text-sm">♻️ スクラップ売却計</span>
                    <span className="font-black text-emerald-700 text-lg">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 border-t border-emerald-200/60 pt-2">
                    {Object.entries(modalData.aggregatedScrapBreakdown).length === 0 ? (
                      <div>内訳なし</div>
                    ) : (
                      Object.entries(modalData.aggregatedScrapBreakdown).map(([scrapKey, val]: [string, any]) => (
                        <div key={scrapKey} className="flex justify-between">
                          <span>・{scrapKey}:</span>
                          <span className="font-black text-emerald-700">+ ¥{val.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 📅 1日ごとの日報データ・経費明細 */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h3 className="font-bold text-base text-slate-800">📅 1日ごとの日報データ・経費明細</h3>
              {modalData.reportsWithIndex.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">この現場の日報はまだありません</p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {modalData.reportsWithIndex.map((r, idx) => {
                    const daily = calculateReportDailyCost(r);
                    return (
                      <div key={r.id || r._id || idx} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 text-sm font-bold text-slate-700">
                          <span className="text-blue-600 text-base">📅 {r.date}</span>
                          <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold">日報合計経費: ¥{daily.totalDailyCost.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-700">
                          <div><span className="text-slate-400 block text-xs">責任者</span> <span className="font-bold">{r.manager || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">作業員</span> <span className="font-bold">{(r.workers || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">外注</span> <span className="font-bold">{(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">重機リース</span> <span className="font-bold">{(r.leaseHeavy || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">アタッチメント</span> <span className="font-bold">{(r.leaseAttach || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">その他機械</span> <span className="font-bold">{(r.leaseOther || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">自社重機</span> <span className="font-bold">{(r.ownMachines || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-400 block text-xs">自社車両</span> <span className="font-bold">{(r.vehicles || []).join(', ') || '-'}</span></div>
                        </div>
                        {r.workDescription && (
                          <div className="text-sm text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <span className="font-bold text-slate-800 block mb-1">作業内容:</span> {r.workDescription}
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

      {/* 🗑️ 処分費詳細モーダル */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">🗑️ {modalLocation} - 処分内容一覧</h3>
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition">閉じる</button>
            </div>

            <div className="space-y-3">
              {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => ({ ...d, date: r.date }))).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">搬出された処分データはありません</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="grid grid-cols-4 bg-slate-50 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div>日付</div>
                    <div>処分場名</div>
                    <div>品目</div>
                    <div className="text-right">数量・金額</div>
                  </div>
                  {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => {
                    const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
                    const subTotal = Number(d.quantity || 0) * uPrice;
                    return (
                      <div key={idx} className="grid grid-cols-4 p-4 text-sm items-center bg-white hover:bg-slate-50/50 transition">
                        <div className="font-bold text-slate-800">{r.date}</div>
                        <div className="text-slate-700">{d.location || '-'}</div>
                        <div className="text-slate-700">{d.item || '-'}</div>
                        <div className="text-right font-bold text-slate-900">{Number(d.quantity || 0)} {d.unit || 't'} <span className="text-slate-400 font-normal block text-xs">(¥{subTotal.toLocaleString()})</span></div>
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
