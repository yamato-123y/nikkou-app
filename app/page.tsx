'use client';
import { useState } from 'react';

// 見やすい「昨日と同じ」ボタン
const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="ml-4 bg-blue-100 text-blue-800 px-6 py-2 rounded-lg font-bold border-2 border-blue-300 hover:bg-blue-200">
    昨日と同じ内容をコピー
  </button>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-gray-200 text-center">
          <h1 className="text-4xl font-black text-gray-800 mb-2">現場日報入力</h1>
          <p className="text-2xl font-bold text-gray-500">株式会社大和</p>
        </div>

        <form className="space-y-8">
          
          {/* 現場名 */}
          <div className="bg-sky-50 p-6 rounded-2xl border-2 border-sky-200 shadow-sm">
            <label className="block text-2xl font-black text-sky-900 mb-4">現場名</label>
            <select className="w-full p-6 rounded-xl border-4 border-sky-300 text-2xl font-bold"></select>
          </div>

          {/* 車両 */}
          <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <label className="text-2xl font-black text-indigo-900">車両</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-6 rounded-xl border-4 border-indigo-300 text-2xl font-bold"></select>
          </div>

          {/* 自社作業員 */}
          <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <label className="text-2xl font-black text-emerald-900">自社作業員</label>
              <CopyButton onClick={() => {}} />
            </div>
            <div className="space-y-3 bg-white p-4 rounded-xl border-2 border-emerald-300">
              {/* チェックボックスリスト */}
            </div>
          </div>

          {/* 外注・派遣 */}
          <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-200 shadow-sm">
            <label className="block text-2xl font-black text-purple-900 mb-4">外注・派遣作業員</label>
            <select className="w-full p-6 rounded-xl border-4 border-purple-300 text-2xl font-bold mb-4"></select>
            <input type="number" placeholder="人数を入力" className="w-full p-6 rounded-xl border-4 border-purple-300 text-2xl font-bold" />
          </div>

          {/* 自社重機 */}
          <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <label className="text-2xl font-black text-amber-900">自社重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-6 rounded-xl border-4 border-amber-300 text-2xl font-bold"></select>
          </div>

          {/* 経費項目（1行ずつ） */}
          <div className="bg-gray-100 p-6 rounded-2xl border-2 border-gray-300 space-y-6">
            <div>
              <label className="block text-2xl font-black text-gray-800 mb-2">軽油 (L)</label>
              <input type="number" className="w-full p-6 rounded-xl border-4 border-gray-300 text-3xl font-bold" />
            </div>
            <div>
              <label className="block text-2xl font-black text-gray-800 mb-2">レギュラー購入金額 (円)</label>
              <input type="number" className="w-full p-6 rounded-xl border-4 border-gray-300 text-3xl font-bold" />
            </div>
            <div>
              <label className="block text-2xl font-black text-gray-800 mb-2">駐車場代 (円)</label>
              <input type="number" className="w-full p-6 rounded-xl border-4 border-gray-300 text-3xl font-bold" />
            </div>
          </div>

          {/* リース */}
          <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <label className="text-2xl font-black text-orange-900">リース重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-6 rounded-xl border-4 border-orange-300 text-2xl font-bold"></select>
          </div>

          {/* 処分内容 */}
          <div className="bg-teal-50 p-6 rounded-2xl border-2 border-teal-200 shadow-sm">
            <label className="block text-2xl font-black text-teal-900 mb-4">処分内容</label>
            <select className="w-full p-6 rounded-xl border-4 border-teal-300 text-2xl font-bold mb-4"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-6 rounded-xl border-4 border-teal-300 text-2xl font-bold" />
          </div>

          {/* スクラップ */}
          <div className="bg-cyan-50 p-6 rounded-2xl border-2 border-cyan-200 shadow-sm">
            <label className="block text-2xl font-black text-cyan-900 mb-4">スクラップ</label>
            <select className="w-full p-6 rounded-xl border-4 border-cyan-300 text-2xl font-bold mb-4"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-6 rounded-xl border-4 border-cyan-300 text-2xl font-bold" />
          </div>

          {/* 備考 */}
          <div className="bg-white p-6 rounded-2xl border-4 border-gray-300">
            <label className="block text-2xl font-black text-gray-800 mb-4">業務内容・備考</label>
            <textarea className="w-full h-48 p-6 rounded-xl border-4 border-gray-300 text-2xl font-bold"></textarea>
          </div>

          <button type="submit" className="w-full bg-blue-700 text-white font-black text-4xl py-10 rounded-3xl shadow-2xl hover:bg-blue-800 transition">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
