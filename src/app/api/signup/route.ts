import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rbsrgfaqmpoidudpsqyd.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Cadastro sem limite de e-mail precisa da variável SUPABASE_SERVICE_ROLE_KEY no servidor.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um e-mail válido e senha com no mínimo 6 caracteres." }, { status: 400 });
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
