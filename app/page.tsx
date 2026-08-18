'use client';
import { useState } from 'react';

// 再利用可能な「昨日と同じ」ボタンコンポーネント
const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded font-bold">
    昨日と同じ
  </button>
);

export default function Home() {
  const [report, setReport] = useState({
    location: '', workers: [] as string[], vehicle: '', heavyMachine: '',
    subcontractors: [] as any[], fuelLiters: '', regularCost: '',
    parkingCost: '', lease: '', scrap: '', disposal: '', description: ''
  });

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <h1 className="text-3xl font-black tracking-tight">現場日報入力</h1>
          <p className="text-blue-100 font-bold mt-1">株式会社大和</p>
        </header>

        <form className="p-6 space-y-8">
          {/* ① 現場 */}
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
            <label className="block font-black text-blue-900 mb-2 text-lg">① 現場名</label>
            <select className="w-full p-4 rounded-xl border-2 border-blue-200 text-xl font-bold"></select>
          </div>

          {/* ② 車両 */}
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <label className="font-black text-indigo-900 text-lg">② 車両</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-4 rounded-xl border-2 border-indigo-200 text-xl"></select>
          </div>

          {/* ③ 自社作業員 */}
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
            <div className="flex justify-between items-center mb-2">
              <label className="font-black text-emerald-900 text-lg">③ 自社作業員</label>
              <CopyButton onClick={() => {}} />
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-emerald-200">
              {/* チェックボックス */}
            </div>
          </div>

          {/* ④ 外注・派遣 */}
          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
            <label className="font-black text-purple-900 mb-2 block text-lg">④ 外注・派遣作業員</label>
            <select className="w-full p-4 rounded-xl border-2 border-purple-200 mb-2"></select>
            <input type="number" placeholder="人数" className="w-full p-4 rounded-xl border-2 border-purple-200" />
          </div>

          {/* ⑤ 自社重機 & ⑨ リース */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
              <div className="flex justify-between items-center mb-2">
                <label className="font-black text-amber-900 text-lg">⑤ 自社重機</label>
                <CopyButton onClick={() => {}} />
              </div>
              <select className="w-full p-4 rounded-xl border-2 border-amber-200"></select>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <div className="flex justify-between items-center mb-2">
                <label className="font-black text-orange-900 text-lg">⑨ リース</label>
                <CopyButton onClick={() => {}} />
              </div>
              <select className="w-full p-4 rounded-xl border-2 border-orange-200"></select>
            </div>
          </div>

          {/* ⑥～⑧ 経費項目 */}
          <div className="grid grid-cols-3 gap-3">
            {[ {label: '⑥ 軽油(L)', key: 'fuel'}, {label: '⑦ レギュラー(円)', key: 'reg'}, {label: '⑧ 駐車場(円)', key: 'park'} ].map(item => (
              <div key={item.key} className="bg-gray-50 p-4 rounded-xl">
                <label className="block font-bold text-gray-700 mb-1 text-sm">{item.label}</label>
                <input type="number" className="w-full p-3 rounded-lg border-2 border-gray-200 text-xl font-bold" />
              </div>
            ))}
          </div>

          {/* ⑩ 処分・スクラップ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100">
              <label className="font-black text-teal-900 mb-2 block">⑩-1 処分内容</label>
              <select className="w-full p-4 rounded-xl border-2 border-teal-200 mb-2"></select>
              <input type="number" placeholder="数量" className="w-full p-4 rounded-xl border-2 border-teal-200" />
            </div>
            <div className="bg-cyan-50 p-5 rounded-2xl border border-cyan-100">
              <label className="font-black text-cyan-900 mb-2 block">⑩-2 スクラップ</label>
              <select className="w-full p-4 rounded-xl border-2 border-cyan-200 mb-2"></select>
              <input type="number" placeholder="数量" className="w-full p-4 rounded-xl border-2 border-cyan-200" />
            </div>
          </div>

          {/* ⑪ 備考 */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <label className="font-black text-gray-800 mb-2 block text-lg">⑪ 備考</label>
            <textarea className="w-full h-24 p-4 rounded-xl border-2 border-gray-300"></textarea>
          </div>

          <button className="w-full bg-blue-600 text-white font-black text-2xl py-6 rounded-2xl shadow-xl hover:scale-105 transition-transform">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
