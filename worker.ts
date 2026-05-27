import { default as handler } from "./.open-next/worker.js";

type WorkerEnv = CloudflareEnv & {
  META_AD_SYNC_TOKEN?: string;
};

type CronEvent = {
  cron: string;
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const worker = {
  fetch: handler.fetch,

  scheduled(event: CronEvent, env: WorkerEnv, ctx: WorkerContext) {
    const request = new Request("https://dtc-swipe-hub.internal/api/ad-libraries/sync-meta", {
      method: "POST",
      headers: env.META_AD_SYNC_TOKEN ? { "x-sync-token": env.META_AD_SYNC_TOKEN } : {},
    });

    ctx.waitUntil(
      handler.fetch(request, env, ctx).then(async (response: Response) => {
        if (!response.ok) {
          console.error("Meta Ads scheduled sync failed", {
            cron: event.cron,
            status: response.status,
            body: await response.text().catch(() => ""),
          });
        }
      }),
    );
  },
};

export default worker;
