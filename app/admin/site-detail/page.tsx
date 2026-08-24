'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SiteDetailContent() {
  const searchParams = useSearchParams();
  const siteName = searchParams.get('siteName') || '';

  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authRole, setAuthRole] = useState<'admin' | 'viewer' | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const url = `/api/site-summary?siteName=${encodeURIComponent(siteName)}&startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed && siteName) {
      fetchSummary();
    }
  }, [isAuthed, siteName]);

  // ログイン処理
  const handleLogin = (role: 'admin' | 'viewer') => {
    if (password === 'yamato123' || password === 'yamato') {
      setIsAuthed(true);
      setAuthRole(role);
    } else {
      alert('パスワードが間違っています。');
    }
  };

  // 🔒 未認証（ログイン前）の画面
  if (!isAuthed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1.5rem', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>現場詳細ログイン</h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>株式会社大和 音声日報システム</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="password" 
              placeholder="パスワードを入力" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin('admin')}
              style={{ padding: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontSize: '1rem', outline: 'none' }}
            />
            <button 
              onClick={() => handleLogin('admin')}
              style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              👑 管理者としてログイン（編集可）
            </button>
            <button 
              onClick={() => handleLogin('viewer')}
              style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              👀 閲覧専用としてログイン（見るだけ）
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!siteName) {
    return <div style={{ padding: '2rem' }}>現場名が指定されていません。</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1.5rem', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <a href="/admin" style={{ color: '#ea580c', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>← 管理画面トップへ戻る</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                🏗️ 現場別詳細集計: {siteName}
              </h1>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 'bold', backgroundColor: authRole === 'admin' ? '#ffedd5' : '#e2e8f0', color: authRole === 'admin' ? '#c2410c' : '#334155' }}>
                {authRole === 'admin' ? '👑 管理者モード' : '👀 閲覧専用モード'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => { setIsAuthed(false); setAuthRole(null); }}
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </div>

        {/* 閲覧専用の注意書き */}
        {authRole === 'viewer' && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '0.85rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
            ⚠️ 現在は「閲覧専用」モードです。安全にデータを閲覧・確認いただけます。
          </div>
        )}

        {/* 📅 日付指定（期間フィルター） */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#1e293b' }}>📅 集計期間の指定</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#475569' }}>開始日:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#475569' }}>終了日:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} />
            </div>
            <button onClick={fetchSummary} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.45rem 1.2rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
              🔍 指定期間で集計
            </button>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); fetchSummary(); }} style={{ backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '0.45rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                クリア
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>集計中...</p>
        ) : !data ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>データが取得できませんでした。</p>
        ) : (
          <>
            {/* 📊 集計サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>累計稼働日数</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{data.summary.totalDays} 日</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>累計投入人員数</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>{data.summary.totalWorkersCount} 人工</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>累計人件費</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#059669', margin: 0 }}>¥ {data.summary.totalLaborCost.toLocaleString()}</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>累計処分概算費用</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#d97706', margin: 0 }}>¥ {data.summary.totalDisposalCost.toLocaleString()}</p>
              </div>
            </div>

            {/* 🗑️ 処分場ごとの集計テーブル */}
            <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.85rem', color: '#1e293b' }}>🗑️ 処分場・品目別 搬出集計サマリー</h2>
              {Object.keys(data.summary.disposalSummary).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>期間中の処分実績はありません。</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', color: '#475569' }}>処分場 (品目)</th>
                        <th style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', color: '#475569' }}>累計搬出数量</th>
                        <th style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', color: '#475569' }}>概算処分費用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.summary.disposalSummary).map(([key, val]: [string, any], idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem 0.85rem', fontWeight: 'bold', color: '#0f172a' }}>{key}</td>
                          <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {val.amount.toFixed(1)} {val.unit}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', fontWeight: 'bold', color: '#d97706', fontSize: '0.95rem' }}>
                            ¥ {val.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 📋 日割り明細一覧 */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>📋 日割り明細一覧（日報）</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>日付</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>責任者 / 作業員</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>当日人工数</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>当日本人件費</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>処分内容 / 数量</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>当日処分概算費用</th>
                      <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>作業メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyList.map((day: any) => (
                      <tr key={day.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{day.date}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                          <div><strong>{day.manager}</strong></div>
                          <div style={{ color: '#64748b' }}>{day.workers}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{day.workerCount} 人</td>
                        <td style={{ padding: '0.85rem', fontWeight: 'bold', color: '#059669', fontSize: '0.9rem' }}>¥ {day.laborCost.toLocaleString()}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>{day.disposalText}</td>
                        <td style={{ padding: '0.85rem', fontWeight: 'bold', color: '#d97706', fontSize: '0.9rem' }}>¥ {day.dayDisposalCost.toLocaleString()}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem', maxWidth: '200px' }}>{day.content || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SiteDetailPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <SiteDetailContent />
    </Suspense>
  );
}
