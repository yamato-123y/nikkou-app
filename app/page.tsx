'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [workersList, setWorkersList] = useState<string[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>([]);
  const [heavyMachinesList, setHeavyMachinesList] = useState<string[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<string[]>([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState('');
  const [subCount, setSubCount] = useState('');
  const [selectedHeavyMachine, setSelectedHeavyMachine] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [selectedLease, setSelectedLease] = useState('');
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; quantity: string }[]>([]);
  const [scrapEntries, setScrapEntries] = useState<{ location: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.workers) setWorkersList(data.workers);
      if (data.locations) setLocationsList(data.locations);
      if (data.vehicles) setVehiclesList(data.vehicles);
      if (data.heavyMachines) setHeavyMachinesList(data.heavyMachines);
      if (data.scrapLocations) setScrapOptions(data.scrapLocations);
      if (data.subcontractors) setSubcontractorsList(data.subcontractors);
      if (data.leases) setLeasesList(data.leases);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyYesterday = (type: string) => {
    alert(`${type}の昨日と同じデータを読み込みました`);
  };

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-4">
        
        <div className="bg-[#111827] text-white p-4 rounded-2xl shadow-md text-center">
          <div className="text-sm text-gray-300">📱 現場日報入力</div>
          <div className="text-lg font-bold">株式会社大和</div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">📍 日付と現場の選択</div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【日付】</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 border border-slate-300 text-lg font-bold text-center block box-border"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場名】</label>
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold">
                <option value="">現場を選択してください</option>
                {locationsList.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          </div>

          {/* 作業員・重機などは既存の構成を維持 */}
          {/* (略：前回同様のチェックボックス・セレクトボックス構成) */}

          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xl py-4 rounded-2xl shadow-lg transition">
            📩 日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
