"use client";

/**
 * components/VoiceRecorder.tsx
 * --------------------------------------------------------------
 * ワンタップで音声入力を開始/終了する巨大ボタン。
 * ブラウザ標準の Web Speech API (SpeechRecognition) を使用し、
 * 日本語 (ja-JP) の文字起こし結果を親コンポーネントへ渡す。
 *
 * 注意: Web Speech APIはSafari/Chromeなど対応状況がブラウザに依存する。
 * 本番運用では、非対応ブラウザ向けに音声ファイルをサーバーへ送り
 * Whisper等の文字起こしAPIを使うフォールバックを用意することを推奨。
 * --------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onTranscriptChange: (text: string) => void;
  disabled?: boolean;
}

// SpeechRecognition はブラウザによって webkit prefix が必要
type SpeechRecognitionType = typeof window extends { webkitSpeechRecognition: infer T }
  ? T
  : any;

export default function VoiceRecorder({ onTranscriptChange, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcriptChunk;
        } else {
          interim += transcriptChunk;
        }
      }
      onTranscriptChange(finalTranscriptRef.current + interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const handleToggle = () => {
    if (!isSupported || disabled) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      stopTimer();
    } else {
      finalTranscriptRef.current = "";
      onTranscriptChange("");
      recognitionRef.current?.start();
      setIsRecording(true);
      startTimer();
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || !isSupported}
        aria-pressed={isRecording}
        className={`relative flex h-40 w-40 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40 ${
          isRecording ? "bg-danger animate-pulse-ring" : "bg-brand"
        }`}
      >
        <span className="flex flex-col items-center gap-2">
          <MicIcon />
          <span className="text-lg font-bold">{isRecording ? "録音中…" : "録音開始"}</span>
        </span>
      </button>

      {isRecording && (
        <span className="rounded-full bg-danger/10 px-4 py-1 text-sm font-semibold text-danger">
          {formatTime(elapsedSec)}
        </span>
      )}

      {!isSupported && (
        <p className="max-w-xs text-center text-sm text-slate-500">
          このブラウザは音声入力に対応していません。Chromeなど対応ブラウザでお試しいただくか、
          下のフォームに直接入力してください。
        </p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
        fill="currentColor"
      />
      <path
        d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.08A7 7 0 0019 11z"
        fill="currentColor"
      />
    </svg>
  );
}
