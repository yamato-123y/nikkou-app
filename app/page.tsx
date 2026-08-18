'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [machine, setMachine] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [fuel, setFuel] = useState('');
  const [etc, setEtc] = useState('');
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => { fetch('/api/settings').then(res => res.json()).then(setSettings); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toLocaleDateString(), location, manager, workers, machine, vehicle, fuel, etc, disposals, scraps, workDescription: description })
    });
    setStatus('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center shadow-lg">株式会社大和 - 日報入力</h1>
      {status === 'success' && <div className="bg-emerald-500 text-white p-4 rounded-xl font-bold text-center">送信しました！</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 現場・車両・人・機材等の入力フォームをここに再構成 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3">📌 現場を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.locations?.map((l:string) => (
               <button type="button" key={l} onClick={() => setLocation(l)} className={`p-3 rounded-xl font-bold border-2 ${location === l ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{l}</button>
             ))}
           </div>
        </div>
        {/* 以下、責任者・重機・処分・スクラップ等の入力を同様に配置 */}
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-4 rounded-2xl shadow-lg">📩 送信する</button>
      </form>
    </div>
  );
}
