'use client';
import { useState } from 'react';

// 見やすい「昨日と同じ」ボタン（統一感のあるスタイル）
const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="bg-white text-orange-600 px-3 py-1 rounded border border-orange-300 font-bold hover:bg-orange-50 text-xs">
    昨日と同じ
  </button>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-1">現場日報入力</h1>
          <p className="text-sm font-bold text-gray-500">株式会社大和</p>
        </div>

        <form className="space-y-4">
          
          {/* 各項目のスタイルを統一 */}
          {[
            { label: '現場名', type: 'select', hasCopy: false },
            { label: '車両', type: 'select', hasCopy: true },
            { label: '自社作業員', type: 'checkbox', hasCopy: true },
            { label: '外注・派遣作業員', type: 'select', hasCopy: false },
            { label: '自社重機', type: 'select', hasCopy: true },
            { label: 'リース重機', type: 'select', hasCopy: true },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-orange-700">{item.label}</label>
                {item.hasCopy && <CopyButton onClick={() => {}} />}
              </div>
              {item.type === 'select' ? (
                <select className="w-full p-2.5 rounded border border-gray-300 text-base font-bold"></select>
              ) : (
                <div className="p-3 border border-gray-300 rounded min-h-[40px]"></div>
              )}
            </div>
          ))}

          {/* 経費項目 */}
          <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm space-y-3">
            <label className="text-sm font-bold text-orange-700 block">経費項目</label>
            <input type="number" placeholder="軽油 (L)" className="w-full p-2.5 rounded border border-gray-300 text-base font-bold" />
            <input type="number" placeholder="レギュラー購入金額 (円)" className="w-full p-2.5 rounded border border-gray-300 text-base font-bold" />
            <input type="number" placeholder="駐車場代 (円)" className="w-full p-2.5 rounded border border-gray-300 text-base font-bold" />
          </div>

          {/* 処分・スクラップ */}
          <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
            <label className="text-sm font-bold text-orange-700 block mb-2">処分内容</label>
            <select className="w-full p-2.5 rounded border border-gray-300 text-base font-bold mb-2"></select>
            <input type="number" placeholder="数量" className="w-full p-2.5 rounded border border-gray-300 text-base font-bold" />
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
            <label className="text-sm font-bold text-orange-700 block mb-2">スクラップ</label>
            <select className="w-full p-2.5 rounded border border-gray-300 text-base font-bold mb-2"></select>
            <input type="number" placeholder="数量" className="w-full p-2.5 rounded border border-gray-300 text-base font-bold" />
          </div>

          {/* 備考 */}
          <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
            <label className="text-sm font-bold text-orange-700 block mb-2">業務内容・備考</label>
            <textarea className="w-full h-24 p-2.5 rounded border border-gray-300 text-base font-bold"></textarea>
          </div>

          <button type="submit" className="w-full bg-orange-600 text-white font-bold text-lg py-4 rounded-lg shadow-md hover:bg-orange-700 transition">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
