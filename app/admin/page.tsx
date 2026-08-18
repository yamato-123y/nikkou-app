'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  
  // 各種マスタ
  const [locations, setLocations] = useState<string[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);

  // 編集・追加用の状態管理は省略しますが、以下のデータ構造を読み書きするようにAPIを構築済みです
  const fetchData = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations || []);
      setLeases(data.leases || []);
      setCompanyMachines(data.companyMachines || []); // 自社重機を追加
      setScrapLocations(data.scrapLocations || []);
      setManagers(data.managers || []);
      setWorkers(data.workers || []);
      setVehicles(data.vehicles || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 保存処理の例
  const saveAll = async (newData: any) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    });
  };

  // 以下、管理画面のUI部分（リース重機と自社重機の両方を表示）
  // ... (※既存のUIと同様に map で表示してください)
  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      {/* リース・自社重機の登録セクションを並べる */}
      <div className="grid grid-cols-2 gap-4">
        {/* リース重機エリア */}
        <div className="bg-white p-4 rounded-xl">
           <h3 className="font-bold">🚜 リース・重機管理</h3>
           {/* リース登録用UI */}
        </div>
        {/* 自社重機エリア */}
        <div className="bg-white p-4 rounded-xl">
           <h3 className="font-bold">🏗️ 自社重機管理（稼働原価）</h3>
           {/* 自社重機登録用UI */}
        </div>
      </div>
    </div>
  );
}
