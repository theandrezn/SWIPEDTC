import { createClient } from "npm:@supabase/supabase-js@2";

type SwipeRow = {
  id: string;
  user_id: string;
  title: string;
  ad_library_url: string | null;
  payload: Record<string, unknown> | null;
};

type ScrapeResult = {
  adCount: number | null;
  status: "success" | "not_found" | "unsupported" | "error";
  source: "meta_html_total" | "meta_html_loaded_ads" | "none";
  pageId: string;
  error: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const token = Deno.env.get("META_AD_SYNC_TOKEN");
  if (token && request.headers.get("x-sync-token") !== token) {
    return json({ error: "Token invalido." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase Admin nao configurado." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: swipes, error } = await admin
    .from("swipes")
    .select("id,user_id,title,ad_library_url,payload")
    .ilike("ad_library_url", "%facebook.com/ads/library%")
    .limit(100);

  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const swipe of (swipes ?? []) as SwipeRow[]) {
    if (!swipe.ad_library_url) continue;
    const scraped = await scrapeMetaAdCount(swipe.ad_library_url);
    const now = new Date().toISOString();
    const payload = swipe.payload ?? {};
    const adLibrary = typeof payload.adLibrary === "object" && payload.adLibrary !== null ? payload.adLibrary : {};

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

  return json({ processed: results.length, results });
});

const metaHosts = new Set(["facebook.com", "www.facebook.com", "web.facebook.com"]);

function sanitizeMetaAdLibraryUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!metaHosts.has(url.hostname)) return null;
    if (!url.pathname.startsWith("/ads/library")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractMetaPageId(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("view_all_page_id") || url.searchParams.get("page_id") || "";
  } catch {
    return "";
  }
}

async function scrapeMetaAdCount(value: string): Promise<ScrapeResult> {
  const url = sanitizeMetaAdLibraryUrl(value);
  if (!url) {
    return { adCount: null, status: "unsupported", source: "none", pageId: "", error: "Use um link publico da Meta Ads Library." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return { adCount: null, status: "error", source: "none", pageId: extractMetaPageId(url), error: `Meta respondeu com status ${response.status}.` };
    }

    const html = await response.text();
    const total = extractCountFromMetaHtml(html);
    const loaded = total ?? countLoadedAds(html);

    return {
      adCount: loaded,
      status: loaded === null ? "not_found" : "success",
      source: total !== null ? "meta_html_total" : loaded !== null ? "meta_html_loaded_ads" : "none",
      pageId: extractMetaPageId(url),
      error: loaded === null ? "A Meta nao expos a contagem no HTML publico." : "",
    };
  } catch (error) {
    return {
      adCount: null,
      status: "error",
      source: "none",
      pageId: extractMetaPageId(url),
      error: error instanceof Error ? error.message : "Falha ao acessar a Meta Ads Library.",
    };
  }
}

function extractCountFromMetaHtml(html: string) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const textCount = pickLargestCount(text, [
    /([\d.,]+)\s+(?:ads?|an[úu]ncios?|resultados?)/gi,
    /(?:ads?|an[úu]ncios?|resultados?)\s*[:\-]?\s*([\d.,]+)/gi,
  ]);
  if (textCount !== null) return textCount;

  const normalized = html.replace(/\\u0025/g, "%").replace(/\\"/g, '"');
  return pickLargestCount(normalized, [
    /"total_count"\s*:\s*(\d+)/gi,
    /"totalCount"\s*:\s*(\d+)/gi,
    /"ads_count"\s*:\s*(\d+)/gi,
    /"results_count"\s*:\s*(\d+)/gi,
  ]);
}

function countLoadedAds(html: string) {
  const matches = html.match(/ad_archive_id|adArchiveID|adArchiveId/g);
  return matches?.length ? matches.length : null;
}

function pickLargestCount(value: string, patterns: RegExp[]) {
  const counts: number[] = [];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const count = parseCount(match[1]);
      if (count !== null) counts.push(count);
    }
  }
  return counts.length ? Math.max(...counts) : null;
}

function parseCount(value: string) {
  const normalized = value.replace(/\s/g, "");
  const withoutThousands = normalized.replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  const digits = withoutThousands.replace(/\D/g, "");
  if (!digits) return null;
  const count = Number(digits);
  return Number.isFinite(count) ? count : null;
}
