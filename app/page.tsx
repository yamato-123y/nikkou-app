'use client';
import { useState, useEffect } from 'react';

export default function ReportSubmitPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // 日報入力フォームの状態
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    client: '',
    startDate: '',
    manager: '',
    workers: [] as string[],
    jobTypes: {} as { [key: string]: string },
    subcontractors: [] as Array<{ company: string; task: string; count: string }>,
    disposals: [] as Array<{ location: string; item: string; quantity: string; unit: string }>,
    scraps: [] as Array<{ location: string; item: string; quantity: string; unit: string }>,
    ownMachines: [] as string[],
    vehicles: [] as string[],
    leaseHeavy: [] as string[],
    leaseAttach: [] as string[],
    leaseOther: [] as string[],
    ishikawaHeavy: [] as string[],
    ishikawaAttach: [] as string[],
    ishikawaOther: [] as string[],
    ishikawaCustomMachines: [] as Array<{ name: string; count: string }>,
    mokCustomMachines: [] as Array<{ name: string; count: string }>,
    otherLeases: [] as Array<{ company: string; name: string; count: string }>,
    otherMachines: '',
    fuel: '',
    regularPrice: '',
    etcPrice: '',
    parkingPrice: '',
    otherItem: '',
    otherPrice: '',
    workDescription: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) {
        const rData = await resR.json();
        setReports(rData);
      }
      if (resS.ok) {
        const sData = await resS.json();
        if (sData && Object.keys(sData).length > 0) {
          setSettings(sData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.location) {
      alert('日付と現場名は必須です。');
      return;
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        // フォームの一部をリセット
        setForm(prev => ({
          ...prev,
          workDescription: '',
          fuel: '',
          regularPrice: '',
          etcPrice: '',
          parkingPrice: '',
          otherPrice: '',
          otherItem: ''
        }));
        fetchData();
      } else {
        alert('日報の送信に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans text-xl font-bold text-slate-600">
        🔄 データを読み込んでいます...
      </div>
    );
  }

  const locList = (settings.locations || []).map((l: any) => (typeof l === 'string' ? l : l.name));
  const activeLocList = locList.filter((locName: string) => {
    const matched = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName);
    return typeof matched === 'object' ? !matched.isFinished : true;
  });

  return (
    <div className="p-3 md:p-10 bg-slate-100 min-h-screen space-y-6 w-full max-w-4xl mx-auto font-sans text-slate-800 text-base">

      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce font-bold">
          <span className="text-2xl">✨</span>
          <span>日報を送信しました！</span>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">📝 現場日報 送信システム</h1>
        <p className="text-sm md:text-base text-slate-500 font-medium">株式会社大和 音声日報・入力フォーム</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 基本情報 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">📍 基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">日付</label>
              <input 
                type="date" 
                value={form.date} 
                onChange={e => setForm({ ...form, date: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white" 
                required 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">現場名</label>
              <select 
                value={form.location} 
                onChange={e => setForm({ ...form, location: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-blue-600" 
                required
              >
                <option value="">現場を選択してください</option>
                {activeLocList.map((loc: string) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">請負先</label>
              <input 
                type="text" 
                placeholder="例: 〇〇建設" 
                value={form.client} 
                onChange={e => setForm({ ...form, client: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">現場開始日</label>
              <input 
                type="date" 
                value={form.startDate} 
                onChange={e => setForm({ ...form, startDate: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">職長</label>
              <select 
                value={form.manager} 
                onChange={e => setForm({ ...form, manager: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white"
              >
                <option value="">職長を選択...</option>
                {(settings.managers || []).map((m: any) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 作業員 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">👥 作業メンバー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(settings.workers || []).map((w: any) => {
              const checked = form.workers.includes(w.name);
              return (
                <label key={w.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={e => {
                      const updated = e.target.checked ? [...form.workers, w.name] : form.workers.filter(x => x !== w.name);
                      setForm({ ...form, workers: updated });
                    }}
                    className="rounded text-orange-600 w-4 h-4"
                  />
                  <span className="truncate">{w.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 職種人数 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">🏷️ 職種ごとの人数</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(settings.jobTypes || []).map((j: any) => (
              <div key={j.name} className="bg-slate-50 p-3 rounded-2xl border flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-700">{j.name}</span>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0"
                  value={form.jobTypes[j.name] || ''}
                  onChange={e => {
                    setForm({
                      ...form,
                      jobTypes: { ...form.jobTypes, [j.name]: e.target.value }
                    });
                  }}
                  className="w-20 p-2 border rounded-xl text-center font-bold text-sm bg-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 外注・派遣 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">👤 外注・派遣作業員</h2>
            <button 
              type="button" 
              onClick={() => setForm({ ...form, subcontractors: [...form.subcontractors, { company: '', task: '', count: '' }] })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs"
            >
              ＋ 外注を追加
            </button>
          </div>
          {form.subcontractors.map((sub, sIdx) => {
            const uniqueCompanies = Array.from(new Set((settings.subcontractors || []).map((s: any) => s.company).filter(Boolean)));
            const availableTasks = (settings.subcontractors || []).filter((s: any) => s.company === sub.company).map((s: any) => s.task);
            return (
              <div key={sIdx} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">外注会社名</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sub.company} 
                      onChange={e => {
                        const updated = [...form.subcontractors];
                        updated[sIdx] = { ...updated[sIdx], company: e.target.value, task: '' };
                        setForm({ ...form, subcontractors: updated });
                      }}
                    >
                      <option value="">会社を選択...</option>
                      {uniqueCompanies.map((comp: any) => <option key={comp} value={comp}>{comp}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">作業内容</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sub.task} 
                      onChange={e => {
                        const updated = [...form.subcontractors];
                        updated[sIdx] = { ...updated[sIdx], task: e.target.value };
                        setForm({ ...form, subcontractors: updated });
                      }}
                    >
                      <option value="">内容を選択...</option>
                      {availableTasks.map((t: any, idx: number) => <option key={idx} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">人数</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sub.count} 
                      onChange={e => {
                        const updated = [...form.subcontractors];
                        updated[sIdx] = { ...updated[sIdx], count: e.target.value };
                        setForm({ ...form, subcontractors: updated });
                      }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = form.subcontractors.filter((_, i) => i !== sIdx);
                      setForm({ ...form, subcontractors: updated });
                    }} 
                    className="bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl font-bold text-xs"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 処分データ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">🗑️ 処分場・搬出データ</h2>
            <button 
              type="button" 
              onClick={() => setForm({ ...form, disposals: [...form.disposals, { location: '', item: '', quantity: '', unit: 't' }] })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs"
            >
              ＋ 処分を追加
            </button>
          </div>
          {form.disposals.map((disp, dIdx) => {
            const uniqueDispLocations = Array.from(new Set((settings.disposalLocations || []).map((d: any) => d.location).filter(Boolean)));
            const availableDispItems = (settings.disposalLocations || []).filter((d: any) => d.location === disp.location);
            return (
              <div key={dIdx} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">処分場名</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={disp.location} 
                      onChange={e => {
                        const updated = [...form.disposals];
                        updated[dIdx] = { ...updated[dIdx], location: e.target.value, item: '' };
                        setForm({ ...form, disposals: updated });
                      }}
                    >
                      <option value="">処分場を選択...</option>
                      {uniqueDispLocations.map((loc: any) => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">品目</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={disp.item} 
                      onChange={e => {
                        const updated = [...form.disposals];
                        const selectedItemObj = availableDispItems.find((d: any) => d.item === e.target.value);
                        updated[dIdx] = { ...updated[dIdx], item: e.target.value, unit: selectedItemObj?.unit || 't' };
                        setForm({ ...form, disposals: updated });
                      }}
                    >
                      <option value="">品目を選択...</option>
                      {availableDispItems.map((d: any, idx: number) => <option key={idx} value={d.item}>{d.item} ({d.unit})</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">数量 ({disp.unit || 't'})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0" 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={disp.quantity} 
                      onChange={e => {
                        const updated = [...form.disposals];
                        updated[dIdx] = { ...updated[dIdx], quantity: e.target.value };
                        setForm({ ...form, disposals: updated });
                      }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = form.disposals.filter((_, i) => i !== dIdx);
                      setForm({ ...form, disposals: updated });
                    }} 
                    className="bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl font-bold text-xs"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* スクラップデータ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">♻️ スクラップ搬出データ</h2>
            <button 
              type="button" 
              onClick={() => setForm({ ...form, scraps: [...form.scraps, { location: '', item: '', quantity: '', unit: 'kg' }] })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs"
            >
              ＋ スクラップを追加
            </button>
          </div>
          {form.scraps.map((sc, scIdx) => {
            const uniqueScrapLocations = Array.from(new Set((settings.scrapLocations || []).map((s: any) => s.location).filter(Boolean)));
            const availableScrapItems = (settings.scrapLocations || []).filter((s: any) => s.location === sc.location);
            return (
              <div key={scIdx} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">スクラップ場名</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sc.location} 
                      onChange={e => {
                        const updated = [...form.scraps];
                        updated[scIdx] = { ...updated[scIdx], location: e.target.value, item: '' };
                        setForm({ ...form, scraps: updated });
                      }}
                    >
                      <option value="">スクラップ場を選択...</option>
                      {uniqueScrapLocations.map((loc: any) => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">品目</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sc.item} 
                      onChange={e => {
                        const updated = [...form.scraps];
                        const selectedItemObj = availableScrapItems.find((s: any) => s.item === e.target.value);
                        updated[scIdx] = { ...updated[scIdx], item: e.target.value, unit: selectedItemObj?.unit || 'kg' };
                        setForm({ ...form, scraps: updated });
                      }}
                    >
                      <option value="">品目を選択...</option>
                      {availableScrapItems.map((s: any, idx: number) => <option key={idx} value={s.item}>{s.item} ({s.unit})</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">数量 ({sc.unit || 'kg'})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0" 
                      className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" 
                      value={sc.quantity} 
                      onChange={e => {
                        const updated = [...form.scraps];
                        updated[scIdx] = { ...updated[scIdx], quantity: e.target.value };
                        setForm({ ...form, scraps: updated });
                      }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = form.scraps.filter((_, i) => i !== scIdx);
                      setForm({ ...form, scraps: updated });
                    }} 
                    className="bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl font-bold text-xs"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 自社重機・車両 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">🚛 自社保有（重機・車両）</h2>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【自社重機】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.companyMachines || []).map((cm: any) => {
                const checked = form.ownMachines.includes(cm.name);
                return (
                  <label key={cm.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      onChange={e => {
                        const updated = e.target.checked ? [...form.ownMachines, cm.name] : form.ownMachines.filter(x => x !== cm.name);
                        setForm({ ...form, ownMachines: updated });
                      }}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <span className="truncate">{cm.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 block">【自社車両】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.vehicles || []).map((v: any) => {
                const checked = form.vehicles.includes(v.name);
                return (
                  <label key={v.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      onChange={e => {
                        const updated = e.target.checked ? [...form.vehicles, v.name] : form.vehicles.filter(x => x !== v.name);
                        setForm({ ...form, vehicles: updated });
                      }}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <span className="truncate">{v.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* リース機器（MOK・南大阪建機） */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">🏢 南大阪建機（MOK）リース</h2>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【重機】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.leaseHeavy || []).map((m: any) => {
                const checked = form.leaseHeavy.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.leaseHeavy, m.name] : form.leaseHeavy.filter(x => x !== m.name);
                      setForm({ ...form, leaseHeavy: updated });
                    }} className="rounded text-blue-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【アタッチメント】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.leaseAttach || []).map((m: any) => {
                const checked = form.leaseAttach.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.leaseAttach, m.name] : form.leaseAttach.filter(x => x !== m.name);
                      setForm({ ...form, leaseAttach: updated });
                    }} className="rounded text-blue-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【その他の機械・機器】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.leaseOther || []).map((m: any) => {
                const checked = form.leaseOther.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.leaseOther, m.name] : form.leaseOther.filter(x => x !== m.name);
                      setForm({ ...form, leaseOther: updated });
                    }} className="rounded text-blue-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* リスト以外の自由入力機械 */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 block">📦 リスト以外の機械・機器（自由入力）</label>
              <button type="button" onClick={() => {
                setForm({ ...form, mokCustomMachines: [...form.mokCustomMachines, { name: '', count: '1' }] });
              }} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition">＋ 追加する</button>
            </div>
            {form.mokCustomMachines.map((cm, cmIdx) => (
              <div key={cmIdx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">リース内容（品名）</label>
                    <input 
                      type="text" 
                      placeholder="例: 発電機" 
                      value={cm.name} 
                      onChange={e => {
                        const list = [...form.mokCustomMachines];
                        list[cmIdx] = { ...list[cmIdx], name: e.target.value };
                        setForm({ ...form, mokCustomMachines: list });
                      }}
                      className="w-full p-2.5 border rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">個数</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={cm.count} 
                      onChange={e => {
                        const list = [...form.mokCustomMachines];
                        list[cmIdx] = { ...list[cmIdx], count: e.target.value };
                        setForm({ ...form, mokCustomMachines: list });
                      }}
                      className="w-full p-2.5 border rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => {
                    const list = form.mokCustomMachines.filter((_, i) => i !== cmIdx);
                    setForm({ ...form, mokCustomMachines: list });
                  }} className="bg-rose-100 text-rose-700 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-200 transition">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 石川県出張用リース */}
        <div className="bg-indigo-50/60 p-6 rounded-3xl shadow-sm border border-indigo-200 space-y-4">
          <h2 className="text-lg font-bold text-indigo-900">🗾 石川県出張用リース機器</h2>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【（石川県）重機】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.ishikawaHeavy || []).map((m: any) => {
                const checked = form.ishikawaHeavy.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-indigo-100 border-indigo-400 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.ishikawaHeavy, m.name] : form.ishikawaHeavy.filter(x => x !== m.name);
                      setForm({ ...form, ishikawaHeavy: updated });
                    }} className="rounded text-indigo-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【（石川県）アタッチメント】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.ishikawaAttach || []).map((m: any) => {
                const checked = form.ishikawaAttach.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-indigo-100 border-indigo-400 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.ishikawaAttach, m.name] : form.ishikawaAttach.filter(x => x !== m.name);
                      setForm({ ...form, ishikawaAttach: updated });
                    }} className="rounded text-indigo-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">【（石川県）その他機械・機器】</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(settings.ishikawaOther || []).map((m: any) => {
                const checked = form.ishikawaOther.includes(m.name);
                return (
                  <label key={m.name} className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer text-sm font-medium transition ${checked ? 'bg-indigo-100 border-indigo-400 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      const updated = e.target.checked ? [...form.ishikawaOther, m.name] : form.ishikawaOther.filter(x => x !== m.name);
                      setForm({ ...form, ishikawaOther: updated });
                    }} className="rounded text-indigo-600 w-4 h-4" />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 石川用自由入力機械 */}
          <div className="space-y-3 pt-2 border-t border-indigo-200">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-indigo-900 block">📦 リスト以外の機械・機器（自由入力）</label>
              <button type="button" onClick={() => {
                setForm({ ...form, ishikawaCustomMachines: [...form.ishikawaCustomMachines, { name: '', count: '0' }] });
              }} className="bg-blue-600 text-white text-xs px-3.5 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-xs">＋ 追加する</button>
            </div>
            {form.ishikawaCustomMachines.map((cm, cmIdx) => (
              <div key={cmIdx} className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">リース内容（品名）</label>
                    <input 
                      type="text" 
                      placeholder="例: 発電機" 
                      value={cm.name} 
                      onChange={e => {
                        const list = [...form.ishikawaCustomMachines];
                        list[cmIdx] = { ...list[cmIdx], name: e.target.value };
                        setForm({ ...form, ishikawaCustomMachines: list });
                      }}
                      className="w-full p-2.5 border rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">個数</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={cm.count} 
                      onChange={e => {
                        const list = [...form.ishikawaCustomMachines];
                        list[cmIdx] = { ...list[cmIdx], count: e.target.value };
                        setForm({ ...form, ishikawaCustomMachines: list });
                      }}
                      className="w-full p-2.5 border rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => {
                    const list = form.ishikawaCustomMachines.filter((_, i) => i !== cmIdx);
                    setForm({ ...form, ishikawaCustomMachines: list });
                  }} className="bg-rose-100 text-rose-700 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-200 transition">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">⛽ 燃料・経費</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">軽油 (L)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={form.fuel} 
                onChange={e => setForm({ ...form, fuel: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-right" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">レギュラー購入分 (円)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={form.regularPrice} 
                onChange={e => setForm({ ...form, regularPrice: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-right" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">高速代・ETC (円)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={form.etcPrice} 
                onChange={e => setForm({ ...form, etcPrice: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-right" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">駐車場代 (円)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={form.parkingPrice} 
                onChange={e => setForm({ ...form, parkingPrice: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-right" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">雑費名</label>
              <input 
                type="text" 
                placeholder="例: 文房具など" 
                value={form.otherItem} 
                onChange={e => setForm({ ...form, otherItem: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">雑費金額 (円)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={form.otherPrice} 
                onChange={e => setForm({ ...form, otherPrice: e.target.value })} 
                className="w-full p-3.5 border border-slate-300 rounded-2xl font-bold bg-slate-50 focus:bg-white text-right" 
              />
            </div>
          </div>
        </div>

        {/* 作業内容メモ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">📝 作業内容メモ</h2>
          <textarea 
            rows={4} 
            value={form.workDescription} 
            onChange={e => setForm({ ...form, workDescription: e.target.value })} 
            className="w-full p-4 border border-slate-300 rounded-2xl font-medium bg-slate-50 focus:bg-white leading-relaxed" 
            placeholder="本日の作業内容や特記事項を入力してください..." 
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20 transition"
        >
          🚀 日報を送信する
        </button>

      </form>
    </div>
  );
}
