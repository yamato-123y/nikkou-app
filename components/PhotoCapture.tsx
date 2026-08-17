"use client";

/**
 * components/PhotoCapture.tsx
 * --------------------------------------------------------------
 * 「写真を撮る」ボタン。<input type="file" capture="environment">を使い、
 * スマホのカメラを直接起動する（追加ライブラリ不要）。
 * 複数枚撮影に対応し、サムネイル一覧と削除機能を提供する。
 * --------------------------------------------------------------
 */

import { useRef } from "react";
import type { SitePhoto } from "@/types/dailyReport";

interface PhotoCaptureProps {
  photos: SitePhoto[];
  onAddPhoto: (photo: SitePhoto) => void;
  onRemovePhoto: (id: string) => void;
  disabled?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoCapture({
  photos,
  onAddPhoto,
  onRemovePhoto,
  disabled,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onAddPhoto({
      id: crypto.randomUUID(),
      imageDataUrl: dataUrl,
      aiCaption: "",
      takenAt: new Date().toISOString(),
    });
    // 同じファイルを連続選択できるよう値をリセット
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-accent text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40"
      >
        <CameraIcon />
        <span className="text-lg font-bold">写真を撮る</span>
      </button>

      {photos.length > 0 && (
        <div className="mt-2 grid w-full max-w-md grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.imageDataUrl} alt="現場写真" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(photo.id)}
                aria-label="写真を削除"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="text-sm text-slate-500">{photos.length}枚 撮影済み</p>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 3a1 1 0 00-.8.4L7.2 5H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-2.2l-1-1.6A1 1 0 0015 3H9z"
        fill="currentColor"
      />
      <circle cx="12" cy="13" r="3.5" fill="white" />
    </svg>
  );
}
