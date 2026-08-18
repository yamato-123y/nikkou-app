'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  // 状態管理
  const [report, setReport] = useState({
    location: '',
    workers: [] as string[],
    vehicle: '',
    heavyMachine: '',
    subcontractors: [] as { name: string; count: string; type: '土工' | '解体工' }[],
    fuelLiters: '',
    regularCost: '',
    parkingCost: '',
    leaseItems: [] as string[],
    scraps: [] as { location: string; item: string; unit: string; quantity: string }[],
    description: ''
  });

  // 「昨日と同じ」ボタン機能（Local Storageに前回保存したデータを読み込む例）
  const loadYesterday = () => {
    const yesterdayData = localStorage.getItem('lastReport');
    if (yesterdayData) {
      setReport(JSON.parse(yesterdayData));
    } else {
      alert('前日のデータが見つかりませんでした。');
    }
  };

  const saveReport = () => {
    localStorage.setItem('lastReport', JSON.stringify(report));
    alert('日報を送信しました（保存完了）');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-3xl font-black text-center mb-6 text-gray-800">現場日報入力</h1>
        <button onClick={loadYesterday} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl text-xl mb-6 shadow-md hover:bg-orange-600 transition">
          🔄 昨日と同じ内容を入力
        </button>

        <form onSubmit={(e) => { e.preventDefault(); saveReport(); }} className="space-y-6">
          
          {/* ① 現場名 (Blue) */}
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <label className="block font-bold text-lg text-blue-900 mb-2">① 現場名</label>
            <select className="w-full p-4 rounded-lg border-2 border-blue-300 text-xl font-bold">
              <option>現場を選択してください</option>
            </select>
          </section>

          {/* ② 車両 (Indigo) */}
          <section className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <label className="block font-bold text-lg text-indigo-900 mb-2">② 車両</label>
            <select className="w-full p-4 rounded-lg border-2 border-indigo-300 text-xl font-bold"></select>
          </section>

          {/* ③ 自社作業員 (Emerald) */}
          <section className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <label className="block font-bold text-lg text-emerald-900 mb-2">③ 自社作業員</label>
            <div className="grid grid-cols-2 gap-2">
              {/* チェックボックスリスト */}
            </div>
          </section>

          {/* ④ 外注・派遣 (Purple) */}
          <section className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <label className="block font-bold text-lg text-purple-900 mb-2">④ 外注・派遣作業員</label>
            <div className="space-y-2">
              <input type="text" placeholder="人数を入力" className="w-full p-4 rounded-lg border-2 border-purple-300" />
              <select className="w-full p-4 rounded-lg border-2 border-purple-300">
                <option>作業内容を選択 (土工/解体工)</option>
              </select>
            </div>
          </section>

          {/* ⑤ 自社重機 (Amber) */}
          <section className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <label className="block font-bold text-lg text-amber-900 mb-2">⑤ 自社重機</label>
            <select className="w-full p-4 rounded-lg border-2 border-amber-300 text-xl"></select>
          </section>

          {/* ⑥～⑧ 経費項目 (Gray) */}
          <section className="grid grid-cols-3 gap-2">
            <div><label className="block font-bold text-sm">⑥ 軽油(L)</label><input type="number" className="w-full p-3 border-2 rounded-lg" /></div>
            <div><label className="block font-bold text-sm">⑦ レギュラー</label><input type="number" className="w-full p-3 border-2 rounded-lg" /></div>
            <div><label className="block font-bold text-sm">⑧ 駐車場</label><input type="number" className="w-full p-3 border-2 rounded-lg" /></div>
          </section>

          {/* ⑨ リース (Rose) */}
          <section className="bg-rose-50 p-4 rounded-xl border border-rose-200">
            <label className="block font-bold text-lg text-rose-900 mb-2">⑨ リース重機</label>
            <select className="w-full p-4 rounded-lg border-2 border-rose-300 text-xl"></select>
          </section>

          {/* ⑩ 処分内容 (Teal) */}
          <section className="bg-teal-50 p-4 rounded-xl border border-teal-200">
            <label className="block font-bold text-lg text-teal-900 mb-2">⑩ 処分内容</label>
            <select className="w-full p-4 rounded-lg border-2 border-teal-300 mb-2"></select>
            <div className="flex gap-2">
              <input type="number" placeholder="数量" className="w-1/2 p-4 border-2 rounded-lg" />
              <select className="w-1/2 p-4 border-2 rounded-lg"><option>t</option><option>㎥</option><option>kg</option></select>
            </div>
          </section>

          {/* ⑪ 備考 (Gray) */}
          <section>
            <label className="block font-bold text-lg mb-2">⑪ 業務内容・備考</label>
            <textarea className="w-full h-32 p-4 border-2 rounded-xl text-xl"></textarea>
          </section>

          <button type="submit" className="w-full bg-blue-600 text-white font-black text-2xl py-6 rounded-2xl shadow-xl hover:bg-blue-700">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
