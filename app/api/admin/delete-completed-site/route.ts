import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'site-photos';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabaseの環境変数が不足しています。SUPABASE_URL（またはNEXT_PUBLIC_SUPABASE_URL）とSUPABASE_SERVICE_ROLE_KEYを確認してください。'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

const locationFolder = (location: string) =>
  Buffer.from(location, 'utf8').toString('base64url');

const keywordRules: Record<string, string> = {
  '旧河北郡市クリーンセンター等解体工事(石川県)': '旧河北郡市クリーンセンター',
  '美加の台地区施設一体型小中教育推進校整備工事': '美加の台地区施設',
  '和歌山下津港海岸(海南地区)船尾南護岸(第2工区)機側操作室解体工事': '船尾南護岸',
  '岸和田市別所町3丁目20-4解体工事': '岸和田市別所町3丁目'
};

const deleteDirectKeys = (obj: any, keysToDelete: string[]) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const next = { ...obj };
  keysToDelete.forEach((key) => {
    delete next[key];
  });
  return next;
};

const deleteKeysByPredicate = (
  obj: any,
  predicate: (key: string) => boolean
) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const next: any = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (!predicate(key)) {
      next[key] = value;
    }
  });
  return next;
};

const listPhotoPaths = async (
  supabase: ReturnType<typeof createClient>,
  location: string
) => {
  const folder = locationFolder(location);
  const paths: string[] = [];

  for (const type of ['before', 'after'] as const) {
    const prefix = `${folder}/${type}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (error) {
      throw new Error(`写真一覧の取得に失敗しました: ${error.message}`);
    }

    (data || []).forEach((item: any) => {
      if (item?.name && !item.name.endsWith('/')) {
        paths.push(`${prefix}/${item.name}`);
      }
    });
  }

  return paths;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const location = String(body?.location || '').trim();
    const confirmation = String(body?.confirmation || '').trim();

    if (!location) {
      return NextResponse.json(
        { error: '現場名がありません。' },
        { status: 400 }
      );
    }

    if (confirmation !== location) {
      return NextResponse.json(
        { error: '確認用の現場名が一致しません。' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1) settings行を取得し、対象現場が本当に「完了済」かサーバー側でも確認
    const { data: settingsRows, error: settingsReadError } = await supabase
      .from('settings')
      .select('id,key,value');

    if (settingsReadError) {
      throw new Error(`settingsの取得に失敗しました: ${settingsReadError.message}`);
    }

    const settingsRow = (settingsRows || []).find((row: any) => {
      const locations = Array.isArray(row?.value?.locations)
        ? row.value.locations
        : [];

      return locations.some((loc: any) => {
        const name = typeof loc === 'string' ? loc : loc?.name;
        return name === location;
      });
    });

    if (!settingsRow) {
      return NextResponse.json(
        { error: '対象現場がsettingsに見つかりません。' },
        { status: 404 }
      );
    }

    const currentSettings = settingsRow.value || {};
    const locations = Array.isArray(currentSettings.locations)
      ? currentSettings.locations
      : [];

    const locationEntry = locations.find((loc: any) => {
      const name = typeof loc === 'string' ? loc : loc?.name;
      return name === location;
    });

    const isFinished =
      typeof locationEntry === 'object' && !!locationEntry?.isFinished;

    if (!isFinished) {
      return NextResponse.json(
        { error: '完了済みの現場だけ削除できます。' },
        { status: 400 }
      );
    }

    // 2) reportsを読み、表記ゆれを含む削除対象の現場名を確定
    const { data: reportRows, error: reportsReadError } = await supabase
      .from('reports')
      .select('id,data');

    if (reportsReadError) {
      throw new Error(`reportsの取得に失敗しました: ${reportsReadError.message}`);
    }

    const keyword = keywordRules[location];
    const aliasNames = keyword
      ? Array.from(
          new Set(
            (reportRows || [])
              .map((row: any) => row?.data?.location)
              .filter(
                (name: any) =>
                  typeof name === 'string' &&
                  name.includes(keyword)
              )
          )
        )
      : [];

    const targetNames = Array.from(
      new Set([location, ...aliasNames])
    );

    const targetReports = (reportRows || []).filter((row: any) =>
      targetNames.includes(String(row?.data?.location || ''))
    );

    const reportIds = targetReports
      .map((row: any) => row?.id)
      .filter((id: any) => id !== null && id !== undefined);

    // 3) まず対象現場の日報を削除
    if (reportIds.length > 0) {
      const { error: deleteReportsError } = await supabase
        .from('reports')
        .delete()
        .in('id', reportIds);

      if (deleteReportsError) {
        throw new Error(`日報の削除に失敗しました: ${deleteReportsError.message}`);
      }
    }

    // 4) 現場写真を削除
    const photoLocations = Array.from(
      new Set([location, ...targetNames])
    );

    let deletedPhotos = 0;

    for (const photoLocation of photoLocations) {
      const paths = await listPhotoPaths(supabase, photoLocation);

      if (paths.length > 0) {
        const { error: photoDeleteError } = await supabase.storage
          .from(BUCKET)
          .remove(paths);

        if (photoDeleteError) {
          throw new Error(`写真の削除に失敗しました: ${photoDeleteError.message}`);
        }

        deletedPhotos += paths.length;
      }
    }

    // 5) settingsは「現場固有データだけ」削除
    //    マスタ系配列には一切触れない
    const scopedNames = Array.from(new Set([location, ...targetNames]));

    let nextSettings: any = {
      ...currentSettings,
      locations: locations.filter((loc: any) => {
        const name = typeof loc === 'string' ? loc : loc?.name;
        return name !== location;
      })
    };

    // 現場名を直キーとして持つもの
    const directSiteScopedKeys = [
      'costOverrides',
      'disposalOverrides',
      'scrapOverrides',
      'fuelUnitPrices',
      'customSubcontractors',
      'subcontractorDetailOverrides',
      'customExtraExpenses',
      'leaseCustomPrices'
    ];

    directSiteScopedKeys.forEach((settingsKey) => {
      if (nextSettings[settingsKey]) {
        nextSettings[settingsKey] = deleteDirectKeys(
          nextSettings[settingsKey],
          scopedNames
        );
      }
    });

    // 現場名__... 形式のキー
    if (nextSettings.monthlyScrapStatementTotals) {
      nextSettings.monthlyScrapStatementTotals = deleteKeysByPredicate(
        nextSettings.monthlyScrapStatementTotals,
        (key) => scopedNames.some((name) => key.startsWith(`${name}__`))
      );
    }

    // スクラップ行キーは report id から始まる
    const reportIdPrefixes = reportIds.map((id: any) => `${id}__`);

    ['scrapRowOverrides', 'checkedScrapRows'].forEach((settingsKey) => {
      if (nextSettings[settingsKey]) {
        nextSettings[settingsKey] = deleteKeysByPredicate(
          nextSettings[settingsKey],
          (key) => reportIdPrefixes.some((prefix) => key.startsWith(prefix))
        );
      }
    });

    // 処分チェック・理由キーは rowKey の中に現場名を含む
    ['checkedDisposalRows', 'disposalRowMemos'].forEach((settingsKey) => {
      if (nextSettings[settingsKey]) {
        nextSettings[settingsKey] = deleteKeysByPredicate(
          nextSettings[settingsKey],
          (key) =>
            scopedNames.some(
              (name) =>
                key.includes(`_${name}_`) ||
                key.includes(`__${name}__`)
            )
        );
      }
    });

    // 以下は処分場/スクラップ場単位の全現場共通情報なので削除しない:
    // monthlyDisposalInvoices
    // scrapSettlementDates
    // また、workers / subcontractors / vehicles / companyMachines /
    // disposalLocations / scrapLocations / leases 等のマスタも一切変更しない。

    const { error: settingsUpdateError } = await supabase
      .from('settings')
      .update({ value: nextSettings })
      .eq('id', settingsRow.id);

    if (settingsUpdateError) {
      throw new Error(`settingsの更新に失敗しました: ${settingsUpdateError.message}`);
    }

    return NextResponse.json({
      ok: true,
      location,
      targetNames,
      deletedReports: reportIds.length,
      deletedPhotos
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          e?.message ||
          '現場データの削除に失敗しました。'
      },
      { status: 500 }
    );
  }
}
