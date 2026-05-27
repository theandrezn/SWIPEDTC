import * as cheerio from "cheerio";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import puppeteer from "@cloudflare/puppeteer";
import type { BrowserWorker } from "@cloudflare/puppeteer";

export type MetaAdCountResult = {
  adCount: number | null;
  status: "success" | "not_found" | "unsupported" | "error";
  source: "meta_html_total" | "meta_html_loaded_ads" | "none";
  pageId: string;
  error: string;
};

const metaHosts = new Set(["facebook.com", "www.facebook.com", "web.facebook.com"]);

export function sanitizeMetaAdLibraryUrl(value: string) {
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

export function extractMetaPageId(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("view_all_page_id") || url.searchParams.get("page_id") || "";
  } catch {
    return "";
  }
}

export async function scrapeMetaAdCount(value: string): Promise<MetaAdCountResult> {
  const url = sanitizeMetaAdLibraryUrl(value);
  if (!url) {
    return {
      adCount: null,
      status: "unsupported",
      source: "none",
      pageId: "",
      error: "Use um link público da Meta Ads Library.",
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      return {
        adCount: null,
        status: "error",
        source: "none",
        pageId: extractMetaPageId(url),
        error: `Meta respondeu com status ${response.status}.`,
      };
    }

    const html = await response.text();
    const count = extractCountFromMetaHtml(html);
    const loadedAdsCount = count ?? countLoadedAds(html);

    return {
      adCount: loadedAdsCount,
      status: loadedAdsCount === null ? "not_found" : "success",
      source: count !== null ? "meta_html_total" : loadedAdsCount !== null ? "meta_html_loaded_ads" : "none",
      pageId: extractMetaPageId(url),
      error:
        loadedAdsCount === null
          ? "A Meta não expôs a contagem no HTML público. Abra a biblioteca e atualize manualmente ou tente novamente mais tarde."
          : "",
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

export async function scrapeMetaAdCountWithBrowser(value: string): Promise<MetaAdCountResult> {
  const url = sanitizeMetaAdLibraryUrl(value);
  if (!url) {
    return {
      adCount: null,
      status: "unsupported",
      source: "none",
      pageId: "",
      error: "Use um link público da Meta Ads Library.",
    };
  }

  const browserBinding = await getBrowserBinding();
  if (browserBinding) {
    return scrapeWithCloudflareBrowser(url, browserBinding);
  }

  if (process.env.NODE_ENV !== "production") {
    return scrapeWithLocalPlaywright(url);
  }

  return scrapeMetaAdCount(url);
}

async function getBrowserBinding() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as CloudflareEnv & { BROWSER?: BrowserWorker }).BROWSER ?? null;
  } catch {
    return null;
  }
}

async function scrapeWithCloudflareBrowser(url: string, browserBinding: BrowserWorker): Promise<MetaAdCountResult> {
  const browser = await puppeteer.launch(browserBinding);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await delay(6000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => undefined);
    await delay(2500);
    const [html, text] = await Promise.all([
      page.content(),
      page.evaluate(() => document.body?.innerText ?? "").catch(() => ""),
    ]);
    return resultFromDocument(url, html, text);
  } catch (error) {
    return {
      adCount: null,
      status: "error",
      source: "none",
      pageId: extractMetaPageId(url),
      error: error instanceof Error ? error.message : "Falha ao abrir a Meta Ads Library com browser.",
    };
  } finally {
    await browser.close();
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeWithLocalPlaywright(url: string): Promise<MetaAdCountResult> {
  const playwright = await importOptionalPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(6000);
    await page.mouse.wheel(0, 900).catch(() => undefined);
    await page.waitForTimeout(2500);
    const [html, text] = await Promise.all([
      page.content(),
      page.locator("body").innerText({ timeout: 5000 }).catch(() => ""),
    ]);
    return resultFromDocument(url, html, text);
  } catch (error) {
    return {
      adCount: null,
      status: "error",
      source: "none",
      pageId: extractMetaPageId(url),
      error: error instanceof Error ? error.message : "Falha ao abrir a Meta Ads Library com browser.",
    };
  } finally {
    await browser.close();
  }
}

async function importOptionalPlaywright() {
  const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<typeof import("playwright")>;
  return importer("playwright");
}

function resultFromDocument(url: string, html: string, visibleText: string): MetaAdCountResult {
  const visibleCount = extractCountFromText(visibleText);
  const htmlCount = visibleCount ?? extractCountFromMetaHtml(html);
  const loadedAdsCount = htmlCount ?? countLoadedAds(html);
  return {
    adCount: loadedAdsCount,
    status: loadedAdsCount === null ? "not_found" : "success",
    source: htmlCount !== null ? "meta_html_total" : loadedAdsCount !== null ? "meta_html_loaded_ads" : "none",
    pageId: extractMetaPageId(url),
    error:
      loadedAdsCount === null
        ? "A Meta não expôs a contagem para o browser. Verifique se o link abre publicamente sem login."
        : "",
  };
}

function extractCountFromMetaHtml(html: string) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const textCount = extractCountFromText(text);
  if (textCount !== null) return textCount;

  const normalized = html.replace(/\\u0025/g, "%").replace(/\\"/g, '"');
  return pickLargestCount(normalized, [
    /"total_count"\s*:\s*(\d+)/gi,
    /"totalCount"\s*:\s*(\d+)/gi,
    /"ads_count"\s*:\s*(\d+)/gi,
    /"results_count"\s*:\s*(\d+)/gi,
  ]);
}

function extractCountFromText(text: string) {
  return pickLargestCount(text.replace(/\s+/g, " "), [
    /([\d.,]+)\s+(?:ads?|an[úu]ncios?|resultados?)/gi,
    /(?:ads?|an[úu]ncios?|resultados?)\s*[:\-]?\s*([\d.,]+)/gi,
  ]);
}

function countLoadedAds(html: string) {
  const matches = html.match(/ad_archive_id|adArchiveID|adArchiveId/g);
  if (!matches?.length) return null;
  return matches.length;
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
  if (!normalized) return null;
  const withoutThousands = normalized.replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  const digits = withoutThousands.replace(/\D/g, "");
  if (!digits) return null;
  const count = Number(digits);
  return Number.isFinite(count) ? count : null;
}
