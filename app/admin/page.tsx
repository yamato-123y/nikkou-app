'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // 状態定義
  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([{ name: '0.2ユンボ', price: 15000 }]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([{ name: '自社バックホウ', price: 10000 }]);
  const [vehicles, setVehicles] = useState<{ name: string; price: number }[]>([{ name: '2tダンプ', price: 5000 }]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テスト処分場', item: 'ガラ', unit: 't', price: 3000 }]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テストスクラップ場', item: '鉄', unit: 't', price: 20000 }]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([{ name: '大和 太郎', price: 20000 }]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([{ name: 'Aさん', price: 15000 }]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  const [editForm, setEditForm] = useState({ location: '', manager: '', machine: '', vehicle: '', workDescription: '' });

  // 新規追加用
  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrice, setNewCompPrice] = useState(10000);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePrice, setNewVehiclePrice] = useState(5000);
  const [newDispLoc, setNewDispLoc] = useState('');
  const [newDispItem, setNewDispItem] = useState('ガラ');
  const [newDispPrice, setNewDispPrice] = useState(3000);
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('鉄');
  const [newScrapPrice, setNewScrapPrice] = useState(20000);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) {
        const data = await resReports.json();
        setReports(Array.isArray(data) ? data : []);
      }
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data) {
          if (Array.isArray(data.locations)) setLocations(data.locations);
          if (Array.isArray(data.leases)) setLeases(data.leases);
          if (Array.isArray(data.companyMachines)) setCompanyMachines(data.companyMachines);
          if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
          if (Array.isArray(data.disposalLocations)) setDisposalLocations(data.disposalLocations);
          if (Array.isArray(data.scrapLocations)) setScrapLocations(data.scrapLocations);
          if (Array.isArray(data.managers)) setManagers(data.managers);
          if (Array.isArray(data.workers)) setWorkers(data.workers);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const persistAll = (overrides = {}) => {
    const payload = { locations, leases, companyMachines, vehicles, disposalLocations, scrapLocations, managers, workers, ...overrides };
    fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  };

  const handleAdd = (type: string) => {
    if (type === 'location' && newLocation.trim()) { setLocations([...locations, newLocation]); setNewLocation(''); persistAll({ locations: [...locations, newLocation] }); }
    else if (type === 'lease' && newLeaseName.trim()) { const updated = [...leases, { name: newLeaseName, price: newLeasePrice }]; setLeases(updated); persistAll({ leases: updated }); }
    else if (type === 'company' && newCompName.trim()) { const updated = [...companyMachines, { name: newCompName, price: newCompPrice }]; setCompanyMachines(updated); persistAll({ companyMachines: updated }); }
    else if (type === 'vehicle' && newVehicleName.trim()) { const updated = [...vehicles, { name: newVehicleName, price: newVehiclePrice }]; setVehicles(updated); persistAll({ vehicles: updated }); }
    else if (type === 'disposal' && newDispLoc.trim()) { const updated = [...disposalLocations, { location: newDispLoc, item: newDispItem, unit: 't', price: newDispPrice }]; setDisposalLocations(updated); persistAll({ disposalLocations: updated }); }
    else if (type === 'scrap' && newScrapLoc.trim()) { const updated = [...scrapLocations, { location: newScrapLoc, item: newScrapItem, unit: 't', price: newScrapPrice }]; setScrapLocations(updated); persistAll({ scrapLocations: updated }); }
    else if (type === 'manager' && newManagerName.trim()) { const updated = [...managers, { name: newManagerName, price: newManagerPrice }]; setManagers(updated); persistAll({ managers: updated }); }
    else if (type === 'worker' && newWorkerName.trim()) { const updated = [...workers, { name: newWorkerName, price: newWorkerPrice }]; setWorkers(updated); persistAll({ workers: updated }); }
  };

  const handleDelete = (type: string, target: any) => {
    if (type === 'location') { const updated = locations.filter(l => l !== target); setLocations(updated); persistAll({ locations: updated }); }
    else if (type === 'lease') { const updated = leases.filter(l => l.name !== target); setLeases(updated); persistAll({ leases: updated }); }
    else if (type === 'company') { const updated = companyMachines.filter(m => m.name !== target); setCompanyMachines(updated); persistAll({ companyMachines: updated }); }
    else if (type === 'vehicle') { const updated = vehicles.filter(v => v.name !== target); setVehicles(updated); persistAll({ vehicles: updated }); }
    else if (type === 'disposal') { const updated = disposalLocations.filter((_, i) => i !== target); setDisposalLocations(updated); persistAll({ disposalLocations: updated }); }
    else if (type === 'scrap') { const updated = scrapLocations.filter((_, i) => i !== target); setScrapLocations(updated); persistAll({ scrapLocations: updated }); }
    else if (type === 'manager') { const updated = managers.filter(m => m.name !== target); setManagers(updated); persistAll({ managers: updated }); }
    else if (type === 'worker') { const updated = workers.filter(w => w.name !== target); setWorkers(updated); persistAll({ workers: updated }); }
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName || r.locations?.includes(locName));
    let laborCost = 0, leaseCost = 0, disposalCost = 0;
    locMapped.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : [r.manager];
      mgrs.forEach(m => laborCost += (managers.find(x => x.name === m)?.price || 0));
      const wrks = Array.isArray(r.workers) ? r.workers : (r.workers ? r.workers.split(',') : []);
      wrks.forEach(w => laborCost += (workers.find(x => x.name === w.trim())?.price || 0));
      
      const mName = r.machine || r.lease;
      const vName = r.vehicle;
      leaseCost += (leases.find(x => x.name === mName)?.price || 0) + (companyMachines.find(x => x.name === mName)?.price || 0) + (vehicles.find(x => x.name === vName)?.price || 0);
      
      (r.disposals || []).forEach((d: any) => disposalCost += (d.quantity * (disposalLocations.find(s => s.location === d.location)?.price || 0)));
    });
    return { days: locMapped.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reportsWithIndex: locMapped };
  };

  // ... (以下、表示用のHTML/JSXは、これまでの修正を引き継ぎ、vehiclesのループ部分を `{ name: string, price: number }` に合わせるよう微修正してください)
