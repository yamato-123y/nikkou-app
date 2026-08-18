// 以下の部分を管理画面の「処分場マスタ」エリアの入力フォームに置き換えてください
<div className="space-y-2">
  <input
    type="text"
    placeholder="処分場名"
    value={newScrapLoc}
    onChange={(e) => setNewScrapLoc(e.target.value)}
    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
  />
  <select
    value={newScrapItem}
    onChange={(e) => setNewScrapItem(e.target.value)}
    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
  >
    <option value="">品目を選択</option>
    <option value="鉄">鉄</option>
    <option value="アルミ">アルミ</option>
    <option value="銅">銅</option>
    <option value="その他">その他</option>
  </select>
  <div className="flex gap-2 items-center">
    <span className="text-xs font-bold text-slate-600">単価¥</span>
    <input
      type="number"
      value={newScrapPrice}
      onChange={(e) => setNewScrapPrice(Number(e.target.value))}
      className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
    />
    <button onClick={() => handleAdd('scrap')} className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
  </div>
</div>
