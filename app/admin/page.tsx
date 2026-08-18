'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [customFields, setCustomFields] = useState<{name: string, type: string}[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  // マスタ保存・読み込みロジックは前回同様 `persistAll` を使用します
  const saveCustomFields = (updated: any) => {
    setCustomFields(updated);
    // ... fetchData/saveSettings 処理を統合
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      {/* 項目追加管理エリア */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <h2 className="text-lg font-black mb-4">➕ 日報入力項目の追加管理</h2>
        <div className="flex gap-2">
          <input 
            placeholder="項目名 (例: 燃料代, 駐車場代)" 
            className="p-2 border rounded-lg"
            value={newFieldName} 
            onChange={e => setNewFieldName(e.target.value)} 
          />
          <select onChange={e => setNewFieldType(e.target.value)} className="p-2 border rounded-lg">
            <option value="text">テキスト</option>
            <option value="number">数値</option>
            <option value="file">画像アップロード</option>
          </select>
          <button onClick={() => saveCustomFields([...customFields, {name: newFieldName, type: newFieldType}])} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold">追加</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {customFields.map((f, i) => (
            <span key={i} className="bg-slate-200 px-3 py-1 rounded-full text-sm font-bold">
              {f.name} ({f.type})
              <button onClick={() => saveCustomFields(customFields.filter((_,idx)=>idx!==i))} className="ml-2 text-red-500">×</button>
            </span>
          ))}
        </div>
      </div>
      {/* 他のテーブル等は前回同様 */}
    </div>
  );
}
