'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  // マスタから取得するリストの状態
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);

  // 入力フォームの状態
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState('2tダンプ');
  const [selectedHeavyMachine, setSelectedHeavyMachine] = useState('');
  const [selectedLease, setSelectedLease] = useState('');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 管理画面で登録・更新されたマスタデータを自動読み込み
  useEffect(() => {
    const loadSettings = () => {
      const savedLocs = localStorage.getItem('yamato_locations');
      if (savedLocs) setLocationsList(JSON.parse(savedLocs));

      const savedLeases = localStorage.getItem('yamato_leases');
      if (savedLeases) setLeasesList(JSON.parse(savedLeases));

      const savedScraps = localStorage.getItem('yamato_scrapLocations');
      if (savedScraps) setScrapOptions(JSON.parse(savedScraps));

      const savedManagers = localStorage.getItem('yamato_managers');
      if (savedManagers) setManagersList(JSON.parse(savedManagers));

      const savedWorkers = localStorage.getItem('yamato_workers');
      if (savedWorkers) setWorkersList(JSON.parse(savedWorkers));
    };

    loadSettings();
    window.addEventListener('storage', loadSettings);
    return () => window.removeEventListener('storage', loadSettings);
  }, []);

  const handleCopyYesterday = (type: string) => {
    alert(`${type}の昨日と同じデータを読み込みました`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      date,
      location: selectedLocation,
      manager: selectedManager,
      workers: selectedWorkers,
      vehicle: selectedVehicle,
      heavyMachine: selectedHeavyMachine,
      lease: selectedLease,
      fuelLiters,
      regularCost,
      parkingCost,
      disposals: disposalEntries,
      workDescription,
      createdAt: new Date().toISOString()
    };

    const existingReports = JSON.parse(localStorage.getItem('yamato_reports') || '[]');
    localStorage.setItem('yamato_reports', JSON.stringify([newReport, ...existingReports]));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => setSubmitted(false)} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">
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
          <div className="text-lg font-bold">株式会社大和</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. 日付と現場の選択 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📍 日付と現場の選択
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【日付】</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 border border-slate-300 text-lg font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場名】</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
              >
                <option value="">現場を選択してください</option>
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. 責任者と作業メンバー */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">👥 2. 担当者・作業員</span>
              <button
                type="button"
                onClick={() => handleCopyYesterday('作業員')}
                className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow"
              >
                🔄 昨日と同じ
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場責任者】</label>
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
              >
                <option value="">責任者を選択</option>
                {managersList.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
