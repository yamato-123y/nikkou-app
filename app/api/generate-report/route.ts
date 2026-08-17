import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { audioText, siteName, manager, workers, photoUrl } = await req.json();

    // テキストも写真もない場合のみエラーとする
    if (!audioText && !photoUrl) {
      return NextResponse.json(
        { success: false, error: '音声テキストまたは写真のどちらかが必要です。' },
        { status: 400 }
      );
    }

    // AIでの自動整形（簡易処理）
    const content = audioText || '（現場写真添付）';
    const safety = '安全作業を徹底すること';

    return NextResponse.json({
      success: true,
      report: {
        siteName: siteName || '現場',
        manager: manager || '担当者',
        workers: workers || '作業員',
        content,
        safety,
        photoUrl: photoUrl || '',
      },
    });
  } catch (error: any) {
    console.error('Generate Error:', error);
    return NextResponse.json({ success: false, error: '生成エラーが発生しました' }, { status: 500 });
  }
}