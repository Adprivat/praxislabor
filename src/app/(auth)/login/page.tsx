import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { LoginForm } from "./login-form";

type SearchParams = Promise<{
  callbackUrl?: string | string[];
}>;

export const metadata: Metadata = {
  title: "Anmelden | Praxislabor Zeiterfassung",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const resolvedParams = await searchParams;
  const callbackParam = resolvedParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackParam) ? callbackParam[0] : callbackParam;

  if (session?.user) {
    redirect(callbackUrl ?? "/");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <div className="flex w-full max-w-2xl flex-col gap-12 rounded-3xl border border-white/10 bg-slate-900/60 p-10 shadow-xl shadow-slate-950/30 backdrop-blur">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white">Praxislabor Zeiterfassung</h1>
            <p className="text-sm text-slate-300">Melde dich mit deiner Firmen-E-Mail an, um Zeiten zu erfassen.</p>
          </div>
          <LoginForm callbackUrl={callbackUrl} />
          <p className="text-center text-xs text-slate-500">
            Probleme bei der Anmeldung? Wende dich an das Management-Team.
          </p>
        </div>
      </main>
    </div>
  );
}
