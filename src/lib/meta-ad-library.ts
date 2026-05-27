import { getCloudflareContext } from "@opennextjs/cloudflare";
import puppeteer from "@cloudflare/puppeteer";
import type { BrowserWorker } from "@cloudflare/puppeteer";

type CloudflarePage = Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>["newPage"]>>;

export type MetaAdCountResult = {
  adCount: number | null;
  status: "success" | "not_found" | "unsupported" | "error";
  source: "meta_html_total" | "meta_html_loaded_ads" | "none";
  pageId: string;
  screenshotUrl: string;
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
  if (!url) return unsupportedResult();

  try {
    const response = await fetch(url, {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      return {
        adCount: null,
        status: "error",
        source: "none",
        pageId: extractMetaPageId(url),
        screenshotUrl: "",
        error: `Meta respondeu com status ${response.status}.`,
      };
    }

    const html = await response.text();
    return resultFromDocument(url, html, "");
  } catch (error) {
    return errorResult(url, error, "Falha ao acessar a Meta Ads Library.");
  }
}

export async function scrapeMetaAdCountWithBrowser(value: string): Promise<MetaAdCountResult> {
  const url = sanitizeMetaAdLibraryUrl(value);
  if (!url) return unsupportedResult();

  if (process.env.NODE_ENV !== "production") return scrapeWithLocalPlaywright(url);

  const browserBinding = await getBrowserBinding();
  if (browserBinding) return scrapeWithCloudflareBrowser(url, browserBinding);

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
    await page.setUserAgent(requestHeaders()["user-agent"]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await waitForCloudflareResultsText(page, 20000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => undefined);
    await delay(2000);
    await page.screenshot({ type: "jpeg", quality: 70, fullPage: false }).catch(() => undefined);
    const [html, text] = await Promise.all([
      page.content(),
      page.evaluate(() => document.body?.innerText ?? "").catch(() => ""),
    ]);
    return resultFromDocument(url, html, text, "");
  } catch (error) {
    return errorResult(url, error, "Falha ao abrir a Meta Ads Library com browser.");
  } finally {
    await browser.close();
  }
}

async function scrapeWithLocalPlaywright(url: string): Promise<MetaAdCountResult> {
  const playwright = await importOptionalPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
    await page
      .waitForFunction(() => /~?\s*[\d.,]+\s+(resultados?|results?|ads?|an[uú]ncios?)/i.test(document.body?.innerText ?? ""), undefined, {
        timeout: 20000,
      })
      .catch(() => undefined);
    await page.mouse.wheel(0, 900).catch(() => undefined);
    await page.waitForTimeout(2000);
    const screenshotUrl = await saveLocalMetaScreenshot(page).catch(() => "");
    const [html, text] = await Promise.all([page.content(), page.locator("body").innerText({ timeout: 5000 }).catch(() => "")]);
    return resultFromDocument(url, html, text, screenshotUrl);
  } catch (error) {
    return errorResult(url, error, "Falha ao abrir a Meta Ads Library com browser.");
  } finally {
    await browser.close();
  }
}

function requestHeaders() {
  return {
    accept: "text/html,application/xhtml+xml",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  };
}

async function importOptionalPlaywright() {
  const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<typeof import("playwright")>;
  return importer("playwright");
}

async function saveLocalMetaScreenshot(page: import("playwright").Page) {
  const [{ mkdir, writeFile }, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  const dir = path.join(process.cwd(), "public", "captures");
  await mkdir(dir, { recursive: true });
  const fileName = `meta-ads-${Date.now()}.jpg`;
  const buffer = await page.screenshot({ fullPage: false, type: "jpeg", quality: 75 });
  await writeFile(path.join(dir, fileName), buffer);
  return `/captures/${fileName}`;
}

async function waitForCloudflareResultsText(page: CloudflarePage, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    if (/~?\s*[\d.,]+\s+(resultados?|results?|ads?|an[uú]ncios?)/i.test(text)) return;
    await delay(1000);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resultFromDocument(url: string, html: string, visibleText: string, screenshotUrl = ""): MetaAdCountResult {
  const visibleCount = extractCountFromText(visibleText);
  const htmlCount = visibleCount ?? extractCountFromMetaHtml(html);
  const loadedAdsCount = htmlCount ?? countLoadedAds(html);
  return {
    adCount: loadedAdsCount,
    status: loadedAdsCount === null ? "not_found" : "success",
    source: htmlCount !== null ? "meta_html_total" : loadedAdsCount !== null ? "meta_html_loaded_ads" : "none",
    pageId: extractMetaPageId(url),
    screenshotUrl,
    error:
      loadedAdsCount === null
        ? "A Meta nao expos a contagem para o browser. Verifique se o link abre publicamente sem login."
        : "",
  };
}

function extractCountFromMetaHtml(html: string) {
  const normalized = html.replace(/\\u0025/g, "%").replace(/\\"/g, '"');
  return pickLargestCount(normalized, [
    /"total_count"\s*:\s*(\d+)/gi,
    /"totalCount"\s*:\s*(\d+)/gi,
    /"ads_count"\s*:\s*(\d+)/gi,
    /"results_count"\s*:\s*(\d+)/gi,
  ]);
}

function extractCountFromText(text: string) {
  const cleanText = text.replace(/[A-Za-z0-9+/=]{80,}/g, " ").replace(/\s+/g, " ");

  return pickLargestCount(cleanText, [
    /~?\s*([\d.,]+)\s+(?:ads?|an[úu]ncios?|resultados?|results?)/gi,
    /(?:ads?|an[úu]ncios?|resultados?|results?)\s*[:\-]?\s*~?\s*([\d.,]+)/gi,
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
  const compact = value.replace(/\s/g, "");
  const multiplier = /[mk]$/i.test(compact) ? (compact.toLowerCase().endsWith("m") ? 1_000_000 : 1_000) : 1;
  const digits = compact.replace(/[.,](?=\d{3}(?:\D|$))/g, "").replace(/[^\d.,]/g, "");
  if (!digits) return null;
  const normalized = multiplier > 1 ? digits.replace(",", ".") : digits.replace(/\D/g, "");
  const count = Math.round(Number(normalized) * multiplier);
  return Number.isFinite(count) && count > 0 && count <= 50_000_000 ? count : null;
}

function unsupportedResult(): MetaAdCountResult {
  return {
    adCount: null,
    status: "unsupported",
    source: "none",
    pageId: "",
    screenshotUrl: "",
    error: "Use um link publico da Meta Ads Library.",
  };
}

function errorResult(url: string, error: unknown, fallback: string): MetaAdCountResult {
  return {
    adCount: null,
    status: "error",
    source: "none",
    pageId: extractMetaPageId(url),
    screenshotUrl: "",
    error: error instanceof Error ? error.message : fallback,
  };
}
