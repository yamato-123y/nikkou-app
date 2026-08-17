import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ADMIN_PASSWORD || 'secret1234';

    if (password === correctPassword) {
      return NextResponse.json({ success: true, token: 'authenticated' });
    } else {
      return NextResponse.json({ success: false, message: 'パスワードが正しくありません' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: '通信エラーが発生しました' }, { status: 500 });
  }
}