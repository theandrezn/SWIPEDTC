import { scrapeMetaAdCountWithBrowser } from "@/lib/meta-ad-library";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "Informe uma URL válida da Meta Ads Library." }, { status: 400 });
  }

  try {
    const result = await scrapeMetaAdCountWithBrowser(parsed.data.url);
    const statusCode = result.status === "unsupported" ? 400 : 200;

    return Response.json(result, { status: statusCode });
  } catch (error) {
    return Response.json(
      {
        adCount: null,
        status: "error",
        error: error instanceof Error ? error.message : "Falha inesperada ao abrir a Meta Ads Library.",
      },
      { status: 502 },
    );
  }
}
