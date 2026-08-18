'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  // サーバーから取得するマスタデータ
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);

  // 入力フォームの状態
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
  const [submitted, setSubmitted] = useState(false);

  // サーバーから設定データを読み込む
  const loadSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.locations) setLocationsList(data.locations);
          if (data.leases) setLeasesList(data.leases);
          if (data.scrapLocations) setScrapOptions(data.scrapLocations);
          if (data.managers) setManagersList(data.managers);
          if (data.workers) setWorkersList(data.workers);
          if (data.vehicles) setVehiclesList(data.vehicles);
        }
      }
    } catch (e) {
      console.error("設定取得エラー:", e);
    }
  };

  useEffect(() => {
    loadSettingsFromServer();
  }, []);

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
      createdAt: new Date().toISOString()
    };

    // サーバーへ日報を送信
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

  // （以下はフォームのUI部分です。前回のコードと構造は同じです）
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
          {/* フォームの内容は以前のものと同じ構成で使用してください */}
          {/* (各項目のレンダリング処理は省略していますが、以前のチェックボックスの仕組みをそのまま使えます) */}
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xl py-4 rounded-2xl shadow-lg transition">
            📩 日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
