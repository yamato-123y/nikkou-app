'use client';
import { useState } from 'react';

// 「昨日と同じ」ボタン（コンパクトサイズ）
const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-md font-bold border border-orange-300 hover:bg-orange-200 text-xs">
    昨日と同じ
  </button>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        
        {/* ヘッダー */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-0.5">現場日報入力</h1>
          <p className="text-sm font-bold text-gray-500">株式会社大和</p>
        </div>

        <form className="space-y-4">
          
          {/* 現場名 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">現場名</label>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white"></select>
          </div>

          {/* 車両 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-bold text-orange-900">車両</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white"></select>
          </div>

          {/* 自社作業員 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-bold text-orange-900">自社作業員</label>
              <CopyButton onClick={() => {}} />
            </div>
            <div className="p-3 bg-white rounded-lg border border-orange-300 text-sm min-h-[50px]">
              {/* チェックボックスリスト */}
            </div>
          </div>

          {/* 外注・派遣 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">外注・派遣作業員</label>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white mb-2"></select>
            <input type="number" placeholder="人数を入力" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
          </div>

          {/* 自社重機 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-bold text-orange-900">自社重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white"></select>
          </div>

          {/* 経費項目（1行ずつ・コンパクト） */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 space-y-3">
            <div>
              <label className="block text-sm font-bold text-orange-900 mb-1">軽油 (L)</label>
              <input type="number" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-orange-900 mb-1">レギュラー購入金額 (円)</label>
              <input type="number" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-orange-900 mb-1">駐車場代 (円)</label>
              <input type="number" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
            </div>
          </div>

          {/* リース */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-bold text-orange-900">リース重機</label>
              <CopyButton onClick={() => {}} />
            </div>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white"></select>
          </div>

          {/* 処分内容 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">処分内容</label>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white mb-2"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
          </div>

          {/* スクラップ */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">スクラップ</label>
            <select className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white mb-2"></select>
            <input type="number" placeholder="数量を入力" className="w-full p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white" />
          </div>

          {/* 備考 */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">業務内容・備考</label>
            <textarea className="w-full h-24 p-2.5 rounded-lg border border-orange-300 text-base font-bold bg-white"></textarea>
          </div>

          <button type="submit" className="w-full bg-orange-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-md hover:bg-orange-700 transition">
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
