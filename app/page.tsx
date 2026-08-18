'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  // ... (状態管理やuseEffectなどは変更なし)

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-4">
        
        <div className="bg-[#111827] text-white p-4 rounded-2xl shadow-md text-center">
          <div className="text-sm text-gray-300">📱 現場日報入力</div>
          <div className="text-lg font-bold">株式会社大和</div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📍 日付と現場の選択
            </div>
            
            {/* ここが重要：コンテナで幅を制御し、inputをフル幅にします */}
            <div className="w-full">
              <label className="block text-sm font-bold text-slate-700 mb-1">【日付】</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 border border-slate-300 text-lg font-bold text-center block"
                style={{ 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none' // iOS対策
                }}
              />
            </div>

            <div className="w-full">
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場名】</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold block"
                style={{ maxWidth: '100%', boxSizing: 'border-box' }}
              >
                <option value="">現場を選択してください</option>
                {locationsList.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          </div>

          {/* ... その他の項目 ... */}

          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xl py-4 rounded-2xl shadow-lg transition">
            📩 日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
