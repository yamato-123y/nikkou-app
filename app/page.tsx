'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Settings {
  siteNames: string[];
  managers: string[];
  workersList: string[];
  leaseList: string[];
  disposalSites: { id: string; name: string; item: string; unit: string; price?: number }[];
}

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>({
    siteNames: [],
    managers: [],
    workersList: [],
    leaseList: [],
    disposalSites: [],
  });

  // フォームデータ
  const [date, setDate] = useState('');
  const [siteName, setSiteName] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [lightOil, setLightOil] = useState('');
  const [etcCost, setEtcCost] = useState('');
  const [content, setContent] = useState('');
  const [disposalRecords, setDisposalRecords] = useState<{ siteId: string; amount: string }[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // ステータス・録音
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // 今日の日付を初期値に
    const today = new Date().toISOString().split('T')[0];
    setDate(today);

    // マスタ取得
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
          if (data.settings.siteNames?.length > 0) setSiteName(data.settings.siteNames[0]);
          if (data.settings.managers?.length > 0) setManager(data.settings.managers[0]);
        }
      })
      .catch((err) => console.error(err));

    // 音声認識の準備
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.lang = 'ja-JP';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setContent((prev) => prev + transcript);
      };
      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  // 写真選択
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // 作業員チェック選択
  const handleWorkerToggle = (name: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(name) ? prev.filter((w) => w !== name) : [...prev, name]
    );
  };

  // 重機リースチェック選択
  const handleLeaseToggle = (name: string) => {
    setSelectedLeases((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]
    );
  };

  // 処分場入力追加
  const addDisposalRecord = () => {
    const firstId = settings.disposalSites[0]?.id || '';
    setDisposalRecords((prev) => [...prev, { siteId: firstId, amount: '' }]);
  };

  const updateDisposalRecord = (index: number, key: 'siteId' | 'amount', value: string) => {
    setDisposalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const removeDisposalRecord = (index: number) => {
    setDisposalRecords((prev) => prev.filter((_, i) => i !== index));
  };

  // 🔄「昨日と同じ」機能
  const copyFromYesterday = (key: 'workers' | 'lease' | 'lightOil' | 'etcCost') => {
    try {
      const saved = localStorage.getItem(`prev_${key}`);
      if (!saved) {
        alert('前回の入力履歴がありません');
        return;
      }
      const data = JSON.parse(saved);
      if (key === 'workers') setSelectedWorkers(data);
      if (key === 'lease') setSelectedLeases(data);
      if (key === 'lightOil') setLightOil(data);
      if (key === 'etcCost') setEtcCost(data);
    } catch (e) {
      alert('コピーに失敗しました');
    }
  };

  // 🎙️ 音声入力トグル
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  // 🚀 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // 連打防止
    setSubmitting(true);
    setMessage('');

    try {
      let uploadedPhotoUrl = '';

      if (photo) {
        const formData = new FormData();
        formData.append('file', photo);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedPhotoUrl = uploadData.url;
        }
      }

      const disposalTextList = disposalRecords
        .map((r) => {
          const siteObj = settings.disposalSites.find((s) => s.id === r.siteId);
          if (!siteObj || !r.amount) return '';
          return `${siteObj.name}(${siteObj.item}): ${r.amount}${siteObj.unit}`;
        })
        .filter(Boolean);

      const reportData = {
        date,
        siteName,
        manager,
        workers: selectedWorkers.length > 0 ? selectedWorkers.join('、') : '作業員未選択',
        lease: selectedLeases.length > 0 ? selectedLeases.join('、') : '重機なし',
        lightOil: lightOil ? `${lightOil} L` : '0 L',
        etcCost: etcCost ? `¥${etcCost}` : '¥0',
        content: content || '特記事項なし',
        safety: disposalTextList.length > 0 ? disposalTextList.join('、') : '処分なし',
        photoUrl: uploadedPhotoUrl,
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('prev_workers', JSON.stringify(selectedWorkers));
        localStorage.setItem('prev_lease', JSON.stringify(selectedLeases));
        localStorage.setItem('prev_lightOil', JSON.stringify(lightOil));
        localStorage.setItem('prev_etcCost', JSON.stringify(etcCost));

        setMessage('✅ 日報が正常に送信されました！');
        setContent('');
        setSelectedWorkers([]);
        setSelectedLeases([]);
        setLightOil('');
        setEtcCost('');
        setDisposalRecords([]);
        setPhoto(null);
        setPhotoPreview(null);
      } else {
        setMessage('❌ 送信に失敗しました。');
      }
    } catch (err) {
      setMessage('❌ 通信エラーが発生しました。');
    } finally {
      setSubmitting(false);
      // 送信完了時に画面最下部へ自動スクロール
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#e2e8f0', padding: '0.5rem', boxSizing: 'border-box', fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '3rem', boxSizing: 'border-box', width: '100%' }}>
        
        {/* ヘッダー */}
        <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '1rem', borderRadius: '14px', textAlign: 'center', marginBottom: '0.85rem', boxShadow: '0 4px 6px rgba(0,0,0,0.15)' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>📱 現場日報入力</h1>
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0.3rem 0 0 0' }}>株式会社大和</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
          
          {/* 1. 基本情報 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.85rem', borderBottom: '3px solid #ea580c', paddingBottom: '0.3rem' }}>
              📍 1. 日付と現場の選択
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>【日付】</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '0.65rem 0.5rem',
                    border: '2px solid #94a3b8',
                    borderRadius: '10px',
                    fontSize: '1.15rem',
                    fontWeight: 'bold',
                    boxSizing: 'border-box',
                    minHeight: '52px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>【現場名】</label>
                <select value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: '100%', maxWidth: '100%', padding: '0.75rem 0.5rem', border: '2px solid #94a3b8', borderRadius: '10px', fontSize: '1.15rem', fontWeight: 'bold', boxSizing: 'border-box', minHeight: '52px', backgroundColor: '#fff' }}>
                  {settings.siteNames.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>【現場責任者】</label>
                <select value={manager} onChange={(e) => setManager(e.target.value)} style={{ width: '100%', maxWidth: '100%', padding: '0.75rem 0.5rem', border: '2px solid #94a3b8', borderRadius: '10px', fontSize: '1.15rem', fontWeight: 'bold', boxSizing: 'border-box', minHeight: '52px', backgroundColor: '#fff' }}>
                  {settings.managers.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. 作業員メンバー */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '3px solid #ea580c', paddingBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                👥 2. 作業員
              </div>
              <button
                type="button"
                onClick={() => copyFromYesterday('workers')}
                style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                🔄 昨日と同じ
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', width: '100%' }}>
              {settings.workersList.map((w, idx) => {
                const checked = selectedWorkers.includes(w);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWorkerToggle(w)}
                    style={{
                      padding: '0.85rem 0.3rem',
                      borderRadius: '10px',
                      border: checked ? '3px solid #ea580c' : '2px solid #cbd5e1',
                      backgroundColor: checked ? '#fff7ed' : '#f8fafc',
                      color: checked ? '#c2410c' : '#1e293b',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '54px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {checked ? '✔ ' : ''}{w}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 重機・リース車両 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '3px solid #ea580c', paddingBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                🚜 3. 重機・車両
              </div>
              <button
                type="button"
                onClick={() => copyFromYesterday('lease')}
                style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                🔄 昨日と同じ
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', width: '100%' }}>
              {settings.leaseList.map((l, idx) => {
                const checked = selectedLeases.includes(l);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLeaseToggle(l)}
                    style={{
                      padding: '0.85rem 0.3rem',
                      borderRadius: '10px',
                      border: checked ? '3px solid #0284c7' : '2px solid #cbd5e1',
                      backgroundColor: checked ? '#f0f9ff' : '#f8fafc',
                      color: checked ? '#0369a1' : '#1e293b',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '54px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {checked ? '✔ ' : ''}{l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 軽油 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>⛽ 軽油 (L)</label>
              <button
                type="button"
                onClick={() => copyFromYesterday('lightOil')}
                style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1.5px solid #0284c7', padding: '0.35rem 0.7rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                前日コピー
              </button>
            </div>
            <input
              type="number"
              placeholder="0"
              value={lightOil}
              onChange={(e) => setLightOil(e.target.value)}
              style={{ width: '100%', maxWidth: '100%', padding: '0.75rem', border: '2px solid #94a3b8', borderRadius: '10px', fontSize: '1.3rem', fontWeight: 'bold', boxSizing: 'border-box', minHeight: '52px' }}
            />
          </div>

          {/* 5. 高速代 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>💳 高速代・ETC (円)</label>
              <button
                type="button"
                onClick={() => copyFromYesterday('etcCost')}
                style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1.5px solid #0284c7', padding: '0.35rem 0.7rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                前日コピー
              </button>
            </div>
            <input
              type="number"
              placeholder="0"
              value={etcCost}
              onChange={(e) => setEtcCost(e.target.value)}
              style={{ width: '100%', maxWidth: '100%', padding: '0.75rem', border: '2px solid #94a3b8', borderRadius: '10px', fontSize: '1.3rem', fontWeight: 'bold', boxSizing: 'border-box', minHeight: '52px' }}
            />
          </div>

          {/* 6. 処分場 搬出実績 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '3px solid #ea580c', paddingBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                🗑️ 4. 処分場のガラ搬出
              </div>
              <button
                type="button"
                onClick={addDisposalRecord}
                style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                ＋ 追加する
              </button>
            </div>
            {disposalRecords.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.95rem', textAlign: 'center', padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontWeight: 'bold' }}>
                ガラ搬出がある場合は「＋ 追加する」を押してください
              </div>
            ) : (
              disposalRecords.map((r, idx) => {
                const selectedSite = settings.disposalSites.find((s) => s.id === r.siteId);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>処分場・品目</label>
                      <button
                        type="button"
                        onClick={() => removeDisposalRecord(idx)}
                        style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      >
                        ✕ 削除
                      </button>
                    </div>
                    <select
                      value={r.siteId}
                      onChange={(e) => updateDisposalRecord(idx, 'siteId', e.target.value)}
                      style={{ width: '100%', maxWidth: '100%', padding: '0.6rem 0.5rem', border: '2px solid #94a3b8', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    >
                      {settings.disposalSites.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.item})
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', width: '100%' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>数量:</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={r.amount}
                        onChange={(e) => updateDisposalRecord(idx, 'amount', e.target.value)}
                        style={{ flex: 1, minWidth: 0, padding: '0.5rem', border: '2px solid #94a3b8', borderRadius: '8px', fontSize: '1.15rem', fontWeight: 'bold', backgroundColor: '#fff', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 'bold' }}>{selectedSite?.unit || 't'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 7. 作業内容・音声入力 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                📝 5. 本日の作業内容
              </div>
              <button
                type="button"
                onClick={toggleRecording}
                style={{
                  backgroundColor: isRecording ? '#ef4444' : '#ea580c',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {isRecording ? '⏹ 録音停止中' : '🎙️ 声で入力'}
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="【声で入力】ボタンを押して話すか、直接入力してください"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', maxWidth: '100%', padding: '0.75rem 0.5rem', border: '2px solid #94a3b8', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', boxSizing: 'border-box' }}
            />
          </div>

          {/* 8. 現場写真 */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
              📷 6. 現場写真 <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>(※無ければ飛ばしてOK)</span>
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
            {photoPreview && (
              <div style={{ marginTop: '0.75rem' }}>
                <img src={photoPreview} alt="プレビュー" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #cbd5e1' }} />
              </div>
            )}
          </div>

          {/* 送信結果メッセージを送信ボタンのすぐ上に移動 */}
          {message && (
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: message.includes('✅') ? '#dcfce7' : '#fee2e2', color: message.includes('✅') ? '#15803d' : '#b91c1c', fontWeight: 'bold', textAlign: 'center', fontSize: '1.2rem', border: '2px solid' }}>
              {message}
            </div>
          )}

          {/* 9. 大型送信ボタン (送信中は無効化して連打防止) */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? '#cbd5e1' : '#ea580c',
              color: 'white',
              border: 'none',
              padding: '1.2rem',
              borderRadius: '16px',
              fontWeight: 'bold',
              fontSize: '1.35rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 12px rgba(234, 88, 12, 0.35)',
              marginTop: '0.5rem',
              minHeight: '64px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {submitting ? '⏳ 送信処理中...' : '📨 日報を送信する'}
          </button>

        </form>
      </div>
    </div>
  );
}