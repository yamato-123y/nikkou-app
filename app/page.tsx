'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('2tダンプ');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (Array.isArray(data.locations)) setLocationsList(data.locations);
          if (Array.isArray(data.leases)) {
            setLeasesList(data.leases.map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l));
          }
          if (Array.isArray(data.scrapLocations)) setScrapOptions(data.scrapLocations);
          if (Array.isArray(data.managers)) {
            setManagersList(data.managers.map((m: any) => typeof m === 'string' ? { name: m, price: 0 } : m));
          }
          if (Array.isArray(data.workers)) {
            setWorkersList(data.workers.map((w: any) => typeof w === 'string' ? { name: w, price: 0 } : w));
          }
          if (Array.isArray(data.vehicles)) setVehiclesList(data.vehicles);
        }
      }
    } catch (e) {
      console.error("設定取得エラー:", e);
    }
  };

  useEffect(() => {
    loadSettingsFromServer();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      date,
      locations: selectedLocations,
      managers: selectedManagers,
      workers: selectedWorkers,
      vehicle: selectedVehicle,
      leases: selectedLeases,
      fuelLiters,
      regularCost,
      parkingCost,
      disposals: disposalEntries,
      workDescription,
      photo,
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
      setSubmitted(true);
    } catch (e) {
      alert("送信に失敗しました");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => { setSubmitted(false); setPhoto(null); loadSettingsFromServer(); }} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full text-lg">
            続けて入力する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-4">
        
        <div className="bg-[#111827] text-white p-4 rounded-2xl shadow-md text-center">
          <div className="text-sm text-gray-300">📱 現場日報入力</div>
          <div className="text-xl font-extrabold">株式会社大和</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 日付 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <label className="block text-sm font-bold text-slate-700">【日付】</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 border border-slate-300 text-xl font-extrabold text-center"
            />
          </div>

          {/* 1. 現場の選択（ボタン式） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📍 現場の選択（複数選択可）
            </div>
            <div className="grid grid-cols-1 gap-2">
              {locationsList.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">現場が登録されていません</p>
              ) : (
                locationsList.map((loc) => {
                  const isSelected = selectedLocations.includes(loc);
                  return (
                    <button
                      type="button"
                      key={loc}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedLocations(selectedLocations.filter(item => item !== loc));
                        } else {
                          setSelectedLocations([...selectedLocations, loc]);
                        }
                      }}
                      className={`w-full p-4 rounded-xl font-bold text-left text-lg transition flex items-center justify-between border-2 ${
                        isSelected 
                          ? 'bg-orange-50 border-orange-600 text-orange-900 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{loc}</span>
                      <span className={`text-xl ${isSelected ? 'text-orange-600 font-black' : 'text-slate-300'}`}>
                        {isSelected ? '✓ 選択中' : '＋ 選択'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. 現場責任者（ボタン式） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              👤 現場責任者（複数選択可）
            </div>
            <div className="grid grid-cols-2 gap-2">
              {managersList.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">責任者が登録されていません</p>
              ) : (
                managersList.map((m) => {
                  const isSelected = selectedManagers.includes(m.name);
                  return (
                    <button
                      type="button"
                      key={m.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedManagers(selectedManagers.filter(item => item !== m.name));
                        } else {
                          setSelectedManagers([...selectedManagers, m.name]);
                        }
                      }}
                      className={`p-3 rounded-xl font-bold text-center text-base transition border-2 ${
                        isSelected 
                          ? 'bg-orange-50 border-orange-600 text-orange-900 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.name}
                      {isSelected && <div className="text-xs text-orange-600 font-extrabold mt-0.5">選択中</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 作業メンバー（ボタン式） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              👥 作業メンバー（複数選択可）
            </div>
            <div className="grid grid-cols-2 gap-2">
              {workersList.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">メンバーが登録されていません</p>
              ) : (
                workersList.map((w) => {
                  const isSelected = selectedWorkers.includes(w.name);
                  return (
                    <button
                      type="button"
                      key={w.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedWorkers(selectedWorkers.filter(item => item !== w.name));
                        } else {
                          setSelectedWorkers([...selectedWorkers, w.name]);
                        }
                      }}
                      className={`p-3 rounded-xl font-bold text-center text-base transition border-2 ${
                        isSelected 
                          ? 'bg-orange-50 border-orange-600 text-orange-900 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {w.name}
                      {isSelected && <div className="text-xs text-orange-600 font-extrabold mt-0.5">選択中</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. 車両・リース重機 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              🚜 車両・リース重機
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【車両】</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-lg font-bold"
              >
                {vehiclesList.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">【リース重機】（複数選択可）</label>
              <div className="grid grid-cols-1 gap-2">
                {leasesList.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">リース重機が登録されていません</p>
                ) : (
                  leasesList.map((l) => {
                    const isSelected = selectedLeases.includes(l.name);
                    return (
                      <button
                        type="button"
                        key={l.name}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLeases(selectedLeases.filter(item => item !== l.name));
                          } else {
                            setSelectedLeases([...selectedLeases, l.name]);
                          }
                        }}
                        className={`w-full p-3 rounded-xl font-bold text-left text-base transition flex items-center justify-between border-2 ${
                          isSelected 
                            ? 'bg-orange-50 border-orange-600 text-orange-900 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{l.name}</span>
                        <span className={`text-sm ${isSelected ? 'text-orange-600 font-black' : 'text-slate-300'}`}>
                          {isSelected ? '✓ 選択中' : '＋ 選択'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 4. 処分場のガラ搬出（新規追加・復元） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">🗑️ 4. 処分場のガラ搬出</span>
              <button
                type="button"
                onClick={() => setDisposalEntries([...disposalEntries, { location: '', item: '', unit: 't', quantity: '' }])}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-base font-bold shadow"
              >
                ＋ 追加する
              </button>
            </div>
            
            {disposalEntries.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">「＋ 追加する」を押して処分場を選択してください</p>
            )}

            {disposalEntries.map((entry, index) => (
              <div key={index} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">処分場・品目</span>
                  <button type="button" onClick={() => setDisposalEntries(disposalEntries.filter((_, i) => i !== index))} className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded">✕ 削除</button>
                </div>
                <select
                  value={entry.location}
                  onChange={(e) => {
                    const selected = scrapOptions.find(sc => `${sc.location} - ${sc.item}` === e.target.value);
                    const updated = [...disposalEntries];
                    if (selected) {
                      updated[index].location = selected.location;
                      updated[index].item = selected.item;
                      updated[index].unit = selected.unit || 't';
                    } else {
                      updated[index].location = '';
                      updated[index].item = '';
                    }
                    setDisposalEntries(updated);
                  }}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">処分場を選択してください</option>
                  {scrapOptions.map((sc, idx) => (
                    <option key={idx} value={`${sc.location} - ${sc.item}`}>
                      {sc.location} （品目: {sc.item} / 単位: {sc.unit}）
                    </option>
                  ))}
                </select>

                {entry.location && (
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-sm font-bold text-slate-600">
                      品目: <span className="text-blue-600 font-extrabold">{entry.item}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">数量:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={entry.quantity}
                        onChange={(e) => {
                          const updated = [...disposalEntries];
                          updated[index].quantity = e.target.value;
                          setDisposalEntries(updated);
                        }}
                        className="w-24 p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xl font-extrabold text-right"
                      />
                      <span className="font-bold text-slate-700 text-lg">{entry.unit}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 5. 写真アップロード項目（新規追加） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📷 現場写真のアップロード
            </div>
            <div className="space-y-3">
              <label className="block w-full text-center bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer transition">
                <span className="text-base font-bold text-slate-700 block mb-1">📸 写真を選択または撮影</span>
                <span className="text-xs text-slate-400">（スマホのカメラが起動します）</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>

              {photo && (
                <div className="relative bg-slate-50 p-2 rounded-xl border text-center space-y-2">
                  <img src={photo} alt="プレビュー" className="max-h-48 mx-auto rounded-lg shadow" />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    画像を削除する
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 6. 作業内容 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📝 本日の作業内容・備考
            </div>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="業務内容を入力してください"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-base font-bold h-28"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-2xl py-4 rounded-2xl shadow-lg transition"
          >
            📩 日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
