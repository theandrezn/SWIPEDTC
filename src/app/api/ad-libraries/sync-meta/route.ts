import { createClient } from "@supabase/supabase-js";
import { scrapeMetaAdCountWithBrowser } from "@/lib/meta-ad-library";

export const dynamic = "force-dynamic";

type SwipeRow = {
  id: string;
  user_id: string;
  title: string;
  ad_library_url: string | null;
  payload: Record<string, unknown> | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yugkirleuiqreddxbzis.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  const cronSecret = process.env.META_AD_SYNC_TOKEN;
  if (cronSecret && request.headers.get("x-sync-token") !== cronSecret) {
    return Response.json({ error: "Token inválido." }, { status: 401 });
  }

  if (!serviceRoleKey) {
    return Response.json(
      { error: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para sincronizar bibliotecas de todos os usuários." },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: swipes, error } = await admin
    .from("swipes")
    .select("id,user_id,title,ad_library_url,payload")
    .ilike("ad_library_url", "%facebook.com/ads/library%")
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const swipe of (swipes ?? []) as SwipeRow[]) {
    const url = swipe.ad_library_url;
    if (!url) continue;

    const scraped = await scrapeMetaAdCountWithBrowser(url);
    const now = new Date().toISOString();
    const payload = swipe.payload ?? {};
    const adLibrary = (typeof payload.adLibrary === "object" && payload.adLibrary !== null ? payload.adLibrary : {}) as Record<string, unknown>;

    if (scraped.adCount === null) {
      await admin
        .from("swipes")
        .update({
          payload: {
            ...payload,
            adLibrary: {
              ...adLibrary,
              metaPageId: scraped.pageId,
              scrapeEnabled: true,
              lastScrapedAt: now,
              scrapeStatus: scraped.status,
              lastScreenshotUrl: scraped.screenshotUrl || String(adLibrary.lastScreenshotUrl ?? ""),
              scrapeError: scraped.error,
            },
          },
          updated_at: now,
        })
        .eq("id", swipe.id);
      results.push({ id: swipe.id, title: swipe.title, ok: false, error: scraped.error });
      continue;
    }

    await admin
      .from("swipes")
      .update({
        payload: {
          ...payload,
          adLibrary: {
            ...adLibrary,
            currentAdCount: scraped.adCount,
            metaPageId: scraped.pageId,
            scrapeEnabled: true,
            lastScrapedAt: now,
            scrapeStatus: "success",
            lastScreenshotUrl: scraped.screenshotUrl || String(adLibrary.lastScreenshotUrl ?? ""),
            scrapeError: "",
          },
        },
        updated_at: now,
      })
      .eq("id", swipe.id);

    await admin.from("ad_library_snapshots").upsert(
      {
        swipe_id: swipe.id,
        user_id: swipe.user_id,
        snapshot_date: now.slice(0, 10),
        ad_count: scraped.adCount,
        source: scraped.source,
      },
      { onConflict: "swipe_id,snapshot_date" },
    );

    results.push({ id: swipe.id, title: swipe.title, ok: true, adCount: scraped.adCount, source: scraped.source });
  }

  return Response.json({ processed: results.length, results });
}
