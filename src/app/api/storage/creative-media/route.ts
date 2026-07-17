import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yugkirleuiqreddxbzis.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_5WlCiU6ND8vOOngtbyFynQ_ZFcQX7bI";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4"];

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Entre novamente para enviar um criativo." }, { status: 401 });

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "O upload de vídeo ainda não está configurado no servidor." }, { status: 503 });
  }

  const authenticatedClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await authenticatedClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para enviar o criativo." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.storage.updateBucket("swipe-screenshots", {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes,
  });

  if (error) {
    return NextResponse.json({ error: "Não foi possível preparar o armazenamento para MP4." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
