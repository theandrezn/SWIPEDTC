import * as cheerio from "cheerio";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import puppeteer from "@cloudflare/puppeteer";
import type { BrowserWorker } from "@cloudflare/puppeteer";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "URL inválida." }, { status: 400 });
  }

  const url = sanitizeUrl(parsed.data.url);
  if (!url) {
    return Response.json({ error: "Use apenas URLs públicas http ou https." }, { status: 400 });
  }

  const metadata = await fetchMetadata(url);
  const screenshot = await captureScreenshot(url).catch((error: Error) => ({
    screenshotUrl: metadata.image,
    screenshotError: error.message,
  }));

  return Response.json({
    url,
    ...metadata,
    ...screenshot,
  });
}

function sanitizeUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "DTC Swipe Hub preview bot; metadata fetch only",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const pick = (...selectors: string[]) => {
      for (const selector of selectors) {
        const value = $(selector).attr("content") || $(selector).text();
        if (value?.trim()) return value.trim();
      }
      return "";
    };
    return {
      title: pick('meta[property="og:title"]', "title"),
      description: pick('meta[property="og:description"]', 'meta[name="description"]'),
      image: absoluteUrl(pick('meta[property="og:image"]', 'meta[name="twitter:image"]'), url),
      siteName: pick('meta[property="og:site_name"]'),
    };
  } catch {
    return { title: "", description: "", image: "", siteName: "" };
  }
}

async function captureScreenshot(url: string) {
  const browserBinding = await getBrowserBinding();

  if (browserBinding) {
    return captureWithCloudflareBrowser(url, browserBinding);
  }

  if (process.env.NODE_ENV !== "production") {
    return captureWithLocalPlaywright(url);
  }

  throw new Error("Browser Rendering não está configurado. Configure o binding BROWSER no Cloudflare ou use screenshot manual.");
}

async function getBrowserBinding() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as CloudflareEnv & { BROWSER?: BrowserWorker }).BROWSER ?? null;
  } catch {
    return null;
  }
}

async function captureWithCloudflareBrowser(url: string, browserBinding: BrowserWorker) {
  const browser = await puppeteer.launch(browserBinding);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const screenshot = await page.screenshot({ type: "jpeg", quality: 78, fullPage: false, encoding: "base64" });
    return { screenshotUrl: `data:image/jpeg;base64,${screenshot}`, screenshotError: "" };
  } finally {
    await browser.close();
  }
}

async function captureWithLocalPlaywright(url: string) {
  const [{ mkdir, writeFile }, path, playwright] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
    importOptionalPlaywright(),
  ]);
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
    const buffer = await page.screenshot({ fullPage: false, type: "jpeg", quality: 78 });
    const dir = path.join(process.cwd(), "public", "captures");
    await mkdir(dir, { recursive: true });
    const fileName = `capture-${Date.now()}.jpg`;
    await writeFile(path.join(dir, fileName), buffer);
    return { screenshotUrl: `/captures/${fileName}`, screenshotError: "" };
  } finally {
    await browser.close();
  }
}

async function importOptionalPlaywright() {
  const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<typeof import("playwright")>;
  return importer("playwright");
}

function absoluteUrl(value: string, base: string) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}
