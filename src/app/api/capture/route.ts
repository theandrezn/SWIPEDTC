import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { z } from "zod";

export const runtime = "nodejs";
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
    screenshotUrl: "",
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
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
    const buffer = await page.screenshot({ fullPage: false, type: "png" });
    const dir = path.join(process.cwd(), "public", "captures");
    await mkdir(dir, { recursive: true });
    const fileName = `capture-${Date.now()}.png`;
    await writeFile(path.join(dir, fileName), buffer);
    return { screenshotUrl: `/captures/${fileName}`, screenshotError: "" };
  } finally {
    await browser.close();
  }
}

function absoluteUrl(value: string, base: string) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}
