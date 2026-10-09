'use client';

import { useEffect, useMemo, useState } from 'react';

type WorkerProfile = {
  id?: string;
  worker_name: string;
  full_name?: string | null;
  employee_no?: string | null;
  employment_type?: string | null;
  hire_date?: string | null;
  birth_date?: string | null;
  blood_type?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  notes?: string | null;
};

type Qualification = {
  id?: string;
  worker_name: string;
  category?: string | null;
  qualification_name: string;
  certificate_no?: string | null;
  acquired_date?: string | null;
  expiry_date?: string | null;
  issuing_body?: string | null;
  notes?: string | null;
};

type HealthCheck = {
  id?: string;
  worker_name: string;
  exam_date: string;
  systolic?: number | string | null;
  diastolic?: number | string | null;
  judgement?: string | null;
  next_due_date?: string | null;
  notes?: string | null;
};

type WorkerDocument = {
  id: string;
  worker_name: string;
  document_type: string;
  title?: string | null;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at?: string | null;
};

type ExcelImportRow = {
  worker_name: string;
  source_worker_name: string;
  category: string;
  qualification_name: string;
  certificate_no: string;
  acquired_date: string;
  source_sheet: string;
  source_row: number;
  status: 'new' | 'duplicate' | 'unmatched';
  reason?: string;
};

type ExcelImportPreview = {
  fileName: string;
  rows: ExcelImportRow[];
  summary: { sheets: number; total: number; newCount: number; duplicateCount: number; unmatchedCount: number };
};

const ADMIN_PASSWORD = '19770323';

const emptyProfile = (name: string): WorkerProfile => ({
  worker_name: name,
  full_name: '', employee_no: '', employment_type: '', hire_date: '', birth_date: '',
  blood_type: '', address: '', emergency_contact: '', notes: ''
});

const emptyQualification = (name: string): Qualification => ({
  worker_name: name, category: '技能講習', qualification_name: '', certificate_no: '', acquired_date: '', expiry_date: '', issuing_body: '', notes: ''
});

const emptyHealth = (name: string): HealthCheck => ({
  worker_name: name, exam_date: '', systolic: '', diastolic: '', judgement: '', next_due_date: '', notes: ''
});

const fmtDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('ja-JP');
};

const isWithinDays = (date?: string | null, days = 60) => {
  if (!date) return false;
  const target = new Date(`${date}T00:00:00`).getTime();
