// 処分場のガラ搬出セクションを以下に差し替えてください
<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
  <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
    🗑️ 4. スクラップ・処分場搬出
  </div>
  
  {disposalEntries.map((entry, index) => (
    <div key={index} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-slate-700">選択: {index + 1}</span>
        <button type="button" onClick={() => setDisposalEntries(disposalEntries.filter((_, i) => i !== index))} className="text-red-600 text-sm font-bold">✕ 削除</button>
      </div>

      {/* 処分場と品目を同時に決定 */}
      <select
        className="w-full p-4 rounded-xl bg-white border-2 border-slate-300 text-lg font-bold"
        value={`${entry.location}|${entry.item}`}
        onChange={(e) => {
          const [loc, item] = e.target.value.split('|');
          const updated = [...disposalEntries];
          updated[index] = { ...updated[index], location: loc, item: item };
          setDisposalEntries(updated);
        }}
      >
        <option value="">処分場と品目を選択...</option>
        {scrapOptions.map((sc, idx) => (
          <option key={idx} value={`${sc.location}|${sc.item}`}>
            {sc.location} - {sc.item}
          </option>
        ))}
      </select>

      {entry.location && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            placeholder="数量を入力"
            value={entry.quantity}
            onChange={(e) => {
              const updated = [...disposalEntries];
              updated[index].quantity = e.target.value;
              setDisposalEntries(updated);
            }}
            className="w-full p-4 rounded-xl bg-white border-2 border-slate-300 text-xl font-extrabold text-right"
          />
          <span className="font-bold text-slate-700 text-lg">t</span>
        </div>
      )}
    </div>
  ))}

  <button
    type="button"
    onClick={() => setDisposalEntries([...disposalEntries, { location: '', item: '', unit: 't', quantity: '' }])}
    className="w-full bg-emerald-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg"
  >
    ＋ スクラップ・処分場を追加
  </button>
</div>
