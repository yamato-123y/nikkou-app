<div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900">🗑️ 処分費の内訳明細 ({modalLocation})</h3>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">処分場・品目ごとの数量・単価・金額の確認と、個別の金額上書きができます</p>
            </div>
            <button onClick={() => setShowDisposalModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
          </div>

          <div className="space-y-6">
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-orange-800">処分費 合計</div>
                <div className="text-2xl md:text-3xl font-bold text-orange-900 mt-1">{formatAmount(modalData.disposalCost)}</div>
              </div>
              {authRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">全体上書き(円):</span>
                  <input 
                    type="number" 
                    placeholder="金額" 
                    value={disposalOverrides[modalLocation]?.total ?? ''} 
                    onChange={e => handleDisposalOverrideChange(modalLocation, 'total', e.target.value)} 
                    className="w-32 p-2.5 border border-orange-400 rounded-xl text-right font-bold text-sm bg-white" 
                />
              </div>
              )}
            </div>

            {Object.keys(modalData.aggregatedDisposalBreakdown).length === 0 ? (
              <p className="text-base text-slate-500 text-center py-8">処分データはありません</p>
            ) : (
              Object.entries(modalData.aggregatedDisposalBreakdown).map(([dLoc, locData]) => (
                <div key={dLoc} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="font-bold text-lg text-slate-900">📍 処分場: {dLoc}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-orange-600 text-xl">{formatAmount(locData.total)}</span>
                      {authRole === 'admin' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600">上書き(円):</span>
                          <input 
                            type="number" 
                          placeholder="金額" 
                          value={disposalOverrides[modalLocation]?.[dLoc] ?? ''} 
                          onChange={e => handleDisposalOverrideChange(modalLocation, dLoc, e.target.value)} 
                          className="w-28 p-2 border border-slate-300 rounded-xl text-right font-bold text-sm bg-white" 
                        />
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(locData.items).map(([itemKey, itemData]) => {
                      const subKey = `${dLoc}__${itemKey}`;
                      const itemOverrideVal = disposalOverrides[modalLocation]?.[subKey] ?? '';
                      const isDetailsOpen = disposalDetailsOpen[subKey] || false;

                      return (
                        <div key={itemKey} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-800 text-base">📦 品目: {itemKey}</div>
                              <div className="text-sm text-slate-500 font-medium">
                                総数量: <span className="font-bold text-slate-800">{itemData.quantity}{itemData.unit}</span> × 単価: <span className="font-bold text-slate-800">{formatAmount(itemData.price)}</span> = <span className="font-bold text-orange-600">{formatAmount(itemData.total)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-end">
                              {authRole === 'admin' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-600">上書き(円):</span>
                                  <input 
                                    type="number" 
                                  placeholder="金額" 
                                  value={itemOverrideVal} 
                                  onChange={e => handleDisposalItemOverrideChange(modalLocation, dLoc, itemKey, e.target.value)} 
                                  className="w-28 p-2 border border-slate-300 rounded-xl text-right font-bold text-sm bg-white" 
                                />
                              </div>
                            )}
                            <button 
                              type="button"
                            onClick={() => setDisposalDetailsOpen({ ...disposalDetailsOpen, [subKey]: !isDetailsOpen })}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                          >
                            {isDetailsOpen ? '明細を隠す ▲' : '内訳明細を見る ▼'}
                          </button>
                        </div>
                        </div>

                        {isDetailsOpen && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 animate-fadeIn">
                            <div className="text-xs font-bold text-slate-500 uppercase">日付ごとの搬出実績</div>
                            <div className="space-y-1">
                              {itemData.details.map((det, dIdx) => (
                                <div key={dIdx} className="flex justify-between items-center text-xs md:text-sm bg-white p-2.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                                  <span>📅 {det.date}</span>
                                  <span>数量: <b>{det.quantity}{det.unit}</b> × 単価 {formatAmount(det.price)}</span>
                                  <span className="font-bold text-orange-600">{formatAmount(det.total)}</span>
                                </div>
                            ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button onClick={() => setShowDisposalModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
          </div>
        </div>
      )}

      {/* スクラップ売却内訳モーダル */}
      {showScrapModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">♻️ スクラップ売却 内訳・金額入力 ({modalLocation})</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">スクラップ場・品目ごとの数量確認と、売却金額の手動入力・上書きができます</p>
              </div>
              <button onClick={() => setShowScrapModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-6">
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-emerald-800">スクラップ売却 合計</div>
                  <div className="text-2xl md:text-3xl font-bold text-emerald-900 mt-1">+ {formatAmount(modalData.scrapTotal)}</div>
                </div>
                {authRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">全体上書き(円):</span>
                    <input 
                      type="number" 
                      placeholder="金額" 
                      value={scrapOverrides[modalLocation]?.total ?? ''} 
                      onChange={e => handleScrapOverrideChange(modalLocation, 'total', e.target.value)} 
                      className="w-32 p-2.5 border border-emerald-400 rounded-xl text-right font-bold text-sm bg-white" 
                    />
                  </div>
                )}
              </div>

              {Object.keys(modalData.aggregatedScrapBreakdown).length === 0 ? (
                <p className="text-base text-slate-500 text-center py-8">スクラップデータはありません</p>
              ) : (
                Object.entries(modalData.aggregatedScrapBreakdown).map(([key, data]) => {
                  const overrideVal = scrapOverrides[modalLocation]?.[key] ?? '';
                  const isDetailsOpen = scrapDetailsOpen[key] || false;

                  return (
                    <div key={key} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-lg text-slate-900">♻️ {key}</div>
                          <div className="text-sm text-slate-500 font-medium">総数量: <span className="font-bold text-slate-800">{data.quantity}</span></div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-end">
                          {authRole === 'admin' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-600">売却金額(円):</span>
                              <input 
                                type="number" 
                                placeholder="金額を入力" 
                                value={overrideVal} 
                                onChange={e => handleScrapOverrideChange(modalLocation, key, e.target.value)} 
                                className="w-32 p-2.5 border border-emerald-400 rounded-xl text-right font-bold text-sm bg-white" 
                              />
                            </div>
                          )}
                          <button 
                            type="button"
                            onClick={() => setScrapDetailsOpen({ ...scrapDetailsOpen, [key]: !isDetailsOpen })}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                          >
                            {isDetailsOpen ? '明細を隠す ▲' : '内訳明細を見る ▼'}
                          </button>
                        </div>
                      </div>

                      {isDetailsOpen && (
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn">
                          <div className="text-xs font-bold text-slate-500 uppercase">日付ごとの搬出実績</div>
                          <div className="space-y-1">
                            {data.details.map((det, dIdx) => (
                              <div key={dIdx} className="flex justify-between items-center text-xs md:text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium text-slate-700">
                                <span>📅 {det.date}</span>
                                <span>品目: <b>{det.item}</b></span>
                                <span className="font-bold text-emerald-700">数量: {det.quantity}{det.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowScrapModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
