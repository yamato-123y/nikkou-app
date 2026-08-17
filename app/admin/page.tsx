'use client';

import React, { useState, useEffect } from 'react';

interface Report {
  id: string;
  createdAt: string;
  date?: string;
  siteName?: string;
  manager?: string;
  workers?: string;
  lease?: string;
  content?: string;
  safety?: string;
  photoUrl?: string;
}

interface DisposalSite {
  id: string;
  name: string;
  item: string;
  unit: string;
  price?: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [filterSite, setFilterSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  // マスタ設定用ステート
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [managers, setManagers] = useState<string[]>([]);
  const [workersList, setWorkersList] = useState<string[]>([]);
  const [leaseList, setLeaseList] = useState<string[]>([]);
  const [disposalSites, setDisposalSites] = useState<DisposalSite[]>([]);
  const [rates, setRates] = useState<{ [key: string]: number }>({});

  const [newSite, setNewSite] = useState('');
  const [newManager, setNewManager] = useState('');
  const [newWorker, setNewWorker] = useState('');
  const [newLease, setNewLease] = useState('');

  // 処分場追加用
  const [dispName, setDispName] = useState('');
  const [dispItem, setDispItem] = useState('');
  const [dispUnit, setDispUnit] = useState('t');
  const [dispPrice, setDispPrice] = useState('');

  // モーダル用ステート
  const [activeModalSite, setActiveModalSite] = useState<string | null>(null);
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token === 'authenticated') {
      setIsAuthenticated(true);
      fetchReports();
      fetchSettings();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_token', 'authenticated');
        setIsAuthenticated(true);
        fetchReports();
        fetchSettings();
      } else {
        setLoginError(data.message || 'ログイン失敗');
      }
    } catch (err) {
      setLoginError('通信エラーが発生しました');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteNames(data.settings.siteNames || []);
        setManagers(data.settings.managers || []);
        setWorkersList(data.settings.workersList || []);
        setLeaseList(data.settings.leaseList || []);
        setDisposalSites(data.settings.disposalSites || []);
        setRates(data.settings.rates || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveMasterSettings = async (
    updatedSites: string[],
    updatedManagers: string[],
    updatedWorkers: string[],
    updatedLeases: string[],
    updatedDisposals: DisposalSite[],
    updatedRates: { [key: string]: number }
  ) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteNames: updatedSites,
          managers: updatedManagers,
          workersList: updatedWorkers,
          leaseList: updatedLeases,
          disposalSites: updatedDisposals,
          rates: updatedRates,
        }),
      });
      setSiteNames(updatedSites);
      setManagers(updatedManagers);
      setWorkersList(updatedWorkers);
      setLeaseList(updatedLeases);
      setDisposalSites(updatedDisposals);
      setRates(updatedRates);
    } catch (err) {
      alert('設定の保存に失敗しました');
    }
  };

  const handleRateChange = (name: string, val: string) => {
    const num = parseInt(val, 10) || 0;
    const newRates = { ...rates, [name]: num };
    saveMasterSettings(siteNames, managers, workersList, leaseList, disposalSites, newRates);
  };

  const handleDisposalPriceChange = (id: string, val: string) => {
    const num = parseInt(val, 10) || 0;
    const updated = disposalSites.map((d) => (d.id === id ? { ...d, price: num } : d));
    saveMasterSettings(siteNames, managers, workersList, leaseList, updated, rates);
  };

  const handleAddSite = () => {
    if (!newSite.trim()) return;
    const updated = [...siteNames, newSite.trim()];
    saveMasterSettings(updated, managers, workersList, leaseList, disposalSites, rates);
    setNewSite('');
  };

  const handleDeleteSite = (index: number) => {
    const updated = siteNames.filter((_, i) => i !== index);
    saveMasterSettings(updated, managers, workersList, leaseList, disposalSites, rates);
  };

  const handleAddManager = () => {
    if (!newManager.trim()) return;
    const updated = [...managers, newManager.trim()];
    saveMasterSettings(siteNames, updated, workersList, leaseList, disposalSites, rates);
    setNewManager('');
  };

  const handleDeleteManager = (index: number) => {
    const updated = managers.filter((_, i) => i !== index);
    saveMasterSettings(siteNames, updated, workersList, leaseList, disposalSites, rates);
  };

  const handleAddWorker = () => {
    if (!newWorker.trim()) return;
    const updated = [...workersList, newWorker.trim()];
    saveMasterSettings(siteNames, managers, updated, leaseList, disposalSites, rates);
    setNewWorker('');
  };

  const handleDeleteWorker = (index: number) => {
    const updated = workersList.filter((_, i) => i !== index);
    saveMasterSettings(siteNames, managers, updated, leaseList, disposalSites, rates);
  };

  const handleAddLease = () => {
    if (!newLease.trim()) return;
    const updated = [...leaseList, newLease.trim()];
    saveMasterSettings(siteNames, managers, workersList, updated, disposalSites, rates);
    setNewLease('');
  };

  const handleDeleteLease = (index: number) => {
    const updated = leaseList.filter((_, i) => i !== index);
    saveMasterSettings(siteNames, managers, workersList, updated, disposalSites, rates);
  };

  const handleAddDisposal = () => {
    if (!dispName.trim()) return;
    const newItem: DisposalSite = {
      id: Date.now().toString(),
      name: dispName.trim(),
      item: dispItem.trim() || '混合',
      unit: dispUnit,
      price: parseInt(dispPrice, 10) || 0,
    };
    const updated = [...disposalSites, newItem];
    saveMasterSettings(siteNames, managers, workersList, leaseList, updated, rates);
    setDispName('');
    setDispItem('');
    setDispPrice('');
  };

  const handleDeleteDisposal = (id: string) => {
    const updated = disposalSites.filter((d) => d.id !== id);
    saveMasterSettings(siteNames, managers, workersList, leaseList, updated, rates);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この日報を削除してもよろしいですか？')) return;
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchReports();
    } catch (err) {
      alert('通信エラーが発生しました。');
    }
  };

  const handleUpdate = async () => {
    if (!editingReport) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReport),
      });
      const data = await res.json();
      if (data.success) {
        setEditingReport(null);
        fetchReports();
      }
    } catch (err) {
      alert('通信エラーが発生しました。');
    }
  };

  // 各金額計算処理 (リース費の正しい集計ロジックを追加)
  const getReportDetails = (r: Report) => {
    let labor = 0;
    if (r.manager && rates[r.manager]) labor += rates[r.manager];
    if (r.workers && r.workers !== '作業員未選択') {
      r.workers.split('、').forEach((w) => {
        const name = w.trim();
        if (rates[name]) labor += rates[name];
      });
    }

    let lease = 0;
    if (r.lease && r.lease !== '重機なし') {
      r.lease.split('、').forEach((l) => {
        const name = l.trim();
        if (rates[name]) lease += rates[name];
      });
    }

    let disposal = 0;
    if (r.safety && r.safety !== '処分なし') {
      r.safety.split('、').forEach((itemStr) => {
        const match = itemStr.match(/(.+)\((.+)\):\s*([\d.]+)(.+)/);
        if (match) {
          const siteNameParsed = match[1].trim();
          const itemParsed = match[2].trim();
          const amountParsed = parseFloat(match[3]) || 0;
          const master = disposalSites.find((d) => d.name === siteNameParsed || d.item === itemParsed);
          disposal += amountParsed * (master?.price || 0);
        }
      });
    }

    return { labor, lease, disposal, total: labor + lease + disposal };
  };

  // 現場別サマリー計算
  const siteSummaryList = siteNames.map((site) => {
    const siteReports = reports.filter((r) => r.siteName === site);
    let laborSum = 0;
    let leaseSum = 0;
    let disposalSum = 0;

    siteReports.forEach((r) => {
      const d = getReportDetails(r);
      laborSum += d.labor;
      leaseSum += d.lease;
      disposalSum += d.disposal;
    });

    return {
      site,
      days: siteReports.length,
      labor: laborSum,
      lease: leaseSum,
      disposal: disposalSum,
      total: laborSum + leaseSum + disposalSum,
    };
  });

  const filteredReports = reports.filter((r) =>
    filterSite ? (r.siteName || '').includes(filterSite) : true
  );

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#1f2937' }}>
            🔒 事務員用 管理画面ログイン
          </h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>
            {loginError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{loginError}</p>}
            <button type="submit" style={{ width: '100%', backgroundColor: '#ea580c', color: 'white', padding: '0.75rem', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  // モーダル表示用データの抽出
  const modalReports = reports.filter((r) => {
    if (r.siteName !== activeModalSite) return false;
    const dStr = r.date ? r.date.replace(/\//g, '-') : r.createdAt;
    if (modalStartDate && new Date(dStr) < new Date(modalStartDate)) return false;
    if (modalEndDate && new Date(dStr) > new Date(modalEndDate + 'T23:59:59')) return false;
    return true;
  });

  const modalSummary = modalReports.reduce(
    (acc, r) => {
      const d = getReportDetails(r);
      acc.labor += d.labor;
      acc.lease += d.lease;
      acc.disposal += d.disposal;
      acc.total += d.total;
      return acc;
    },
    { labor: 0, lease: 0, disposal: 0, total: 0 }
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1.5rem', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#0f172a' }}>📊 日報管理・原価詳細ダッシュボード</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>株式会社大和 音声日報システム</p>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#334155', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            ログアウト
          </button>
        </div>

        {/* 🏢 現場別 経費集計サマリー */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏢 現場別 経費集計サマリー
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>現場名</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>稼働日数</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>人件費</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>リース費</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>処分費</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>合計経費</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {siteSummaryList.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#0284c7' }}>{s.site}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem' }}>{s.days} 日</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem' }}>¥ {s.labor.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: s.lease > 0 ? '#0284c7' : 'inherit', fontWeight: s.lease > 0 ? 'bold' : 'normal' }}>
                      ¥ {s.lease.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem' }}>¥ {s.disposal.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#059669', fontSize: '0.95rem' }}>¥ {s.total.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => {
                          setActiveModalSite(s.site);
                          setModalStartDate('');
                          setModalEndDate('');
                        }}
                        style={{
                          backgroundColor: '#0284c7',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        詳細 ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ⚙️ マスタ登録エリア */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>⚙️ マスタ登録 (現場・担当者・リース・処分場)</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
            {/* 現場名登録 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem' }}>🏢 現場名一覧</h3>
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <input type="text" placeholder="新しい現場名" value={newSite} onChange={(e) => setNewSite(e.target.value)} style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                <button onClick={handleAddSite} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>追加</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {siteNames.map((s, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <span>{s}</span>
                    <button onClick={() => handleDeleteSite(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🚜 リース・重機設定 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem' }}>🚜 リース・重機マスタ ＆ 日額単価</h3>
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <input type="text" placeholder="例: 0.2ユンボ" value={newLease} onChange={(e) => setNewLease(e.target.value)} style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                <button onClick={handleAddLease} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>追加</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {leaseList.map((l, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <span>{l}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>日額¥</span>
                      <input type="number" value={rates[l] || ''} placeholder="15000" onChange={(e) => handleRateChange(l, e.target.value)} style={{ width: '65px', padding: '0.2rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                      <button onClick={() => handleDeleteLease(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🗑️ 処分場設定 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem' }}>🗑️ 処分場マスタ ＆ 単価設定</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <input type="text" placeholder="処分場名 (例: 堺処分場)" value={dispName} onChange={(e) => setDispName(e.target.value)} style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input type="text" placeholder="品目 (例: ガラ)" value={dispItem} onChange={(e) => setDispItem(e.target.value)} style={{ flex: 1, padding: '0.35rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                  <select value={dispUnit} onChange={(e) => setDispUnit(e.target.value)} style={{ padding: '0.35rem 0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <option value="t">t</option>
                    <option value="m³">m³</option>
                  </select>
                  <input type="number" placeholder="単価" value={dispPrice} onChange={(e) => setDispPrice(e.target.value)} style={{ width: '60px', padding: '0.35rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                  <button onClick={handleAddDisposal} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>追加</button>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {disposalSites.map((d) => (
                  <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{d.name}</strong>
                      <span style={{ color: '#64748b', marginLeft: '0.3rem' }}>({d.item}/{d.unit})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>単価¥</span>
                      <input type="number" value={d.price || ''} placeholder="3000" onChange={(e) => handleDisposalPriceChange(d.id, e.target.value)} style={{ width: '60px', padding: '0.2rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                      <button onClick={() => handleDeleteDisposal(d.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 👤 現場責任者 単価 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem' }}>👤 現場責任者 ＆ 日額単価</h3>
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <input type="text" placeholder="責任者名" value={newManager} onChange={(e) => setNewManager(e.target.value)} style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                <button onClick={handleAddManager} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>追加</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {managers.map((m, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <span>{m}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>日額¥</span>
                      <input type="number" value={rates[m] || ''} placeholder="18000" onChange={(e) => handleRateChange(m, e.target.value)} style={{ width: '65px', padding: '0.2rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                      <button onClick={() => handleDeleteManager(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 👥 作業メンバー 単価 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem' }}>👥 作業メンバー ＆ 日額単価</h3>
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <input type="text" placeholder="メンバー名 (例: 山田)" value={newWorker} onChange={(e) => setNewWorker(e.target.value)} style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                <button onClick={handleAddWorker} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>追加</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {workersList.map((w, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <span>{w}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>日額¥</span>
                      <input type="number" value={rates[w] || ''} placeholder="15000" onChange={(e) => handleRateChange(w, e.target.value)} style={{ width: '65px', padding: '0.2rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} />
                      <button onClick={() => handleDeleteWorker(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 日報送信一覧 */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b' }}>📥 送信された日報一覧</h2>
            <button onClick={fetchReports} style={{ backgroundColor: '#0284c7', color: 'white', padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
              🔄 最新情報に更新
            </button>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <input
              type="text"
              placeholder="現場名で絞り込み..."
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              style={{ padding: '0.45rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '280px', fontSize: '0.85rem' }}
            />
          </div>

          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>読み込み中...</p>
          ) : filteredReports.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>該当する日報はありません。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>日付 / 送信日時</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>現場名</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>責任者 / 作業者</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>概算人件費</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>リース重機</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>作業内容</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>現場写真</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>処分内容 / 搬出量</th>
                    <th style={{ padding: '0.85rem', color: '#475569', fontSize: '0.85rem' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => {
                    const details = getReportDetails(report);
                    return (
                      <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          <div><strong>{report.date || '未設定'}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(report.createdAt).toLocaleString('ja-JP')}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{report.siteName || '-'}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                          <div>責任者: {report.manager || '-'}</div>
                          <div style={{ color: '#64748b' }}>作業者: {report.workers || '-'}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 'bold', color: '#059669', fontSize: '0.9rem' }}>
                          ¥ {details.labor.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                          <div>{report.lease || 'なし'}</div>
                          <div style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '0.8rem' }}>¥ {details.lease.toLocaleString()}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem', maxWidth: '200px' }}>{report.content || '-'}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                          {report.photoUrl ? (
                            <a href={report.photoUrl} target="_blank" rel="noopener noreferrer">
                              <img src={report.photoUrl} alt="現場写真" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>なし</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem', color: '#0f172a', maxWidth: '180px' }}>{report.safety || '-'}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          <button onClick={() => setEditingReport(report)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.3rem 0.65rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.4rem' }}>編集</button>
                          <button onClick={() => handleDelete(report.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.65rem', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🏢 現場詳細分析POPUP モーダル */}
      {activeModalSite && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '1.75rem' }}>
            
            {/* モーダルヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏢 {activeModalSite} (現場詳細分析)
              </h2>
              <button
                onClick={() => setActiveModalSite(null)}
                style={{ backgroundColor: '#64748b', color: 'white', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                閉じる
              </button>
            </div>

            {/* 📅 期間指定 */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#334155' }}>📅 期間指定:</span>
              <input
                type="date"
                value={modalStartDate}
                onChange={(e) => setModalStartDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <span style={{ color: '#64748b' }}>〜</span>
              <input
                type="date"
                value={modalEndDate}
                onChange={(e) => setModalEndDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>

            {/* 📊 カードサマリー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f0f9ff', padding: '0.85rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>稼働日数</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{modalReports.length} 日</p>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>人件費</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>¥ {modalSummary.labor.toLocaleString()}</p>
              </div>
              <div style={{ backgroundColor: '#f0f9ff', padding: '0.85rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>リース費</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>¥ {modalSummary.lease.toLocaleString()}</p>
              </div>
              <div style={{ backgroundColor: '#fefce8', padding: '0.85rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>処分費</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d97706', margin: 0 }}>¥ {modalSummary.disposal.toLocaleString()}</p>
              </div>
              <div style={{ backgroundColor: '#faf5ff', padding: '0.85rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>合計経費</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#9333ea', margin: 0 }}>¥ {modalSummary.total.toLocaleString()}</p>
              </div>
            </div>

            {/* 明細テーブル */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#334155' }}>日付</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#334155' }}>人員/リース</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#334155' }}>人件+リース</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#334155' }}>処分明細/処分費</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#334155' }}>1日合計</th>
                  </tr>
                </thead>
                <tbody>
                  {modalReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>該当するデータはありません。</td>
                    </tr>
                  ) : (
                    modalReports.map((r) => {
                      const d = getReportDetails(r);
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem', fontWeight: 'bold' }}>{r.date || new Date(r.createdAt).toLocaleDateString('ja-JP')}</td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem' }}>
                            <div>{r.manager || '-'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{r.workers || '-'}</div>
                            <div style={{ color: '#0284c7', fontSize: '0.75rem' }}>リース: {r.lease || 'なし'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a' }}>
                            ¥ {(d.labor + d.lease).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem' }}>
                            <div>{r.safety || 'なし'}</div>
                            <div style={{ color: '#d97706', fontWeight: 'bold', fontSize: '0.8rem' }}>¥ {d.disposal.toLocaleString()}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#9333ea' }}>
                            ¥ {d.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>✏️ 日報データの編集</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>現場名</label>
              <input type="text" value={editingReport.siteName || ''} onChange={(e) => setEditingReport({ ...editingReport, siteName: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>責任者</label>
                <input type="text" value={editingReport.manager || ''} onChange={(e) => setEditingReport({ ...editingReport, manager: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>作業者</label>
                <input type="text" value={editingReport.workers || ''} onChange={(e) => setEditingReport({ ...editingReport, workers: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>リース重機</label>
              <input type="text" value={editingReport.lease || ''} onChange={(e) => setEditingReport({ ...editingReport, lease: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>作業内容</label>
              <textarea rows={3} value={editingReport.content || ''} onChange={(e) => setEditingReport({ ...editingReport, content: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>処分内容 / 搬出量</label>
              <input type="text" value={editingReport.safety || ''} onChange={(e) => setEditingReport({ ...editingReport, safety: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.25rem' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setEditingReport(null)} style={{ backgroundColor: '#9ca3af', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleUpdate} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}