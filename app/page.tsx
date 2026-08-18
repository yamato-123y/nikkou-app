'use client';
import { useState } from 'react';

// 見やすい「昨日と同じ」ボタン
const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="ml-4 bg-blue-100 text-blue-800 px-4 py-1.5 rounded-lg font-bold border border-blue-300 hover:bg-blue-200 text-sm">
    昨日と同じ内容をコピー
  </button>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">現場日報入力</h1>
          <p className="text-lg font-bold text-gray-500">株式会社大和</p>
        </div>

        <form className="space-y-6">
          
          {/* 現場名 */}
          <div className="bg-sky-50 p-5 rounded-xl border border-sky-200 shadow-sm">
            <label className="block text-lg font-bold text-sky-900 mb-2">現場名</label>
            <select className="w-full p-3 rounded-lg border border-sky-300 text-lg font-bold"></select>
          </div>

          {/* 車両 */}
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-lg font-bold text-indigo-900">車両</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-3 rounded-lg border border-indigo-300 text-lg font-bold"></select>
          </div>

          {/* 自社作業員 */}
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-lg font-bold text-emerald-900">自社作業員</label>
              <CopyButton onClick={() => {}} />
            </div>
            <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-300 text-lg">
              {/* チェックボックスリスト */}
            </div>
          </div>

          {/* 外注・派遣 */}
          <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm">
            <label className="block text-lg font-bold text-purple-900 mb-2">外注・派遣作業員</label>
            <select className="w-full p-3 rounded-lg border border-purple-300 text-lg font-bold mb-2"></select>
            <input type="number" placeholder="人数を入力" className="w-full p-3 rounded-lg border border-purple-300 text-lg font-bold" />
          </div>

          {/* 自社重機 */}
          <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-lg font-bold text-amber-900">自社重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-3 rounded-lg border border-amber-300 text-lg font-bold"></select>
          </div>

          {/* 経費項目（1行ずつ） */}
          <div className="bg-gray-100 p-5 rounded-xl border border-gray-300 space-y-4">
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-1">軽油 (L)</label>
              <input type="number" className="w-full p-3 rounded-lg border border-gray-300 text-lg font-bold" />
            </div>
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-1">レギュラー購入金額 (円)</label>
              <input type="number" className="w-full p-3 rounded-lg border border-gray-300 text-lg font-bold" />
            </div>
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-1">駐車場代 (円)</label>
              <input type="number" className="w-full p-3 rounded-lg border border-gray-300 text-lg font-bold" />
            </div>
          </div>

          {/* リース */}
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-lg font-bold text-orange-900">リース重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-3 rounded-lg border border-orange-300 text-lg font-bold"></select>
          </div>

          {/* 処分内容 */}
          <div className="bg-teal-50 p-5 rounded-xl border border-teal-200 shadow-sm">
            <label className="block text-lg font-bold text-teal-900 mb-2">処分内容</label>
            <select className="w-full p-3 rounded-lg border border-teal-300 text-lg font-bold mb-2"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-3 rounded-lg border border-teal-300 text-lg font-bold" />
          </div>

          {/* スクラップ */}
          <div className="bg-cyan-50 p-5 rounded-xl border border-cyan-200 shadow-sm">
            <label className="block text-lg font-bold text-cyan-900 mb-2">スクラップ</label>
            <select className="w-full p-3 rounded-lg border border-cyan-300 text-lg font-bold mb-2"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-3 rounded-lg border border-cyan-300 text-lg font-bold" />
          </div>

          {/* 備考 */}
          <div className="bg-white p-5 rounded-xl border-2 border-gray-300">
            <label className="block text-lg font-bold text-gray-800 mb-2">業務内容・備考</label>
            <textarea className="w-full h-32 p-3 rounded-lg border border-gray-300 text-lg font-bold"></textarea>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold text-xl py-4 rounded-xl shadow-md hover:bg-blue-700 transition">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
