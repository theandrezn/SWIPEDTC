import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rbsrgfaqmpoidudpsqyd.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createUserViaEdgeFunction(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/admin-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; userId?: string };
  return { response, data };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um e-mail válido e senha com no mínimo 6 caracteres." }, { status: 400 });
  }

  if (!serviceRoleKey) {
    const { response, data } = await createUserViaEdgeFunction(parsed.data.email, parsed.data.password);
    return NextResponse.json(data, { status: response.status });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes("already");
    return NextResponse.json(
      { error: duplicate ? "Esse e-mail já tem conta. Use a aba Entrar para acessar." : error.message },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({ userId: data.user.id });
}
