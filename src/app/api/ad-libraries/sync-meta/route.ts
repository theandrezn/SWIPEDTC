import { createClient } from "@supabase/supabase-js";
import { scrapeMetaAdCountWithBrowser } from "@/lib/meta-ad-library";

export const dynamic = "force-dynamic";

type AdLibraryRow = {
  id: string;
  user_id: string;
  platform: string;
  advertiser_name: string;
  library_url: string;
  current_ad_count: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rbsrgfaqmpoidudpsqyd.supabase.co";
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

  const { data: libraries, error } = await admin
    .from("ad_libraries")
    .select("id,user_id,platform,advertiser_name,library_url,current_ad_count")
    .eq("scrape_enabled", true)
    .eq("status", "Ativo")
    .or("platform.eq.Meta Ads Library,library_url.ilike.%facebook.com/ads/library%")
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const library of (libraries ?? []) as AdLibraryRow[]) {
    const scraped = await scrapeMetaAdCountWithBrowser(library.library_url);
    const now = new Date().toISOString();

    if (scraped.adCount === null) {
      await admin
        .from("ad_libraries")
        .update({
          meta_page_id: scraped.pageId || null,
          last_scraped_at: now,
          scrape_status: scraped.status,
          scrape_error: scraped.error,
        })
        .eq("id", library.id);
      results.push({ id: library.id, advertiser: library.advertiser_name, ok: false, error: scraped.error });
      continue;
    }

    await admin
      .from("ad_libraries")
      .update({
        current_ad_count: scraped.adCount,
        meta_page_id: scraped.pageId || null,
        last_scraped_at: now,
        scrape_status: "success",
        scrape_error: null,
      })
      .eq("id", library.id);

    await admin.from("ad_library_snapshots").upsert(
      {
        ad_library_id: library.id,
        user_id: library.user_id,
        snapshot_date: now.slice(0, 10),
        ad_count: scraped.adCount,
        source: scraped.source,
      },
      { onConflict: "ad_library_id,snapshot_date" },
    );

    results.push({ id: library.id, advertiser: library.advertiser_name, ok: true, adCount: scraped.adCount, source: scraped.source });
  }

  return Response.json({ processed: results.length, results });
}
