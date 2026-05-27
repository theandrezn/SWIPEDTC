declare module "./.open-next/worker.js" {
  const handler: {
    fetch(request: Request, env: CloudflareEnv, ctx: unknown): Promise<Response>;
  };

  export default handler;
}
