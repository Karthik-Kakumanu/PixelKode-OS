"use client";

import { useActionState } from "react";
import { Cpu, ShieldCheck, Sparkles } from "lucide-react";

import { loginAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = {
  error: ""
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 transition-colors duration-700 relative overflow-hidden bg-[#f8fafc] dark:bg-black">
      
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent opacity-80 dark:opacity-30 pointer-events-none" />
      
      <div className="glass-panel relative z-10 w-full max-w-[420px] overflow-hidden rounded-[40px] p-8 sm:p-10 border border-white/80 dark:border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-white/40 dark:bg-zinc-950/60 backdrop-blur-[40px]">
        
        {/* Internal Card Holographic Orbs */}
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/40 blur-[60px] dark:bg-cyan-500/20 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-fuchsia-400/40 blur-[60px] dark:bg-fuchsia-500/20 pointer-events-none" />

        <div className="relative z-10">
          {/* Premium App Icon Area */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/80 bg-white/80 text-2xl font-black text-slate-900 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900 dark:text-white">
            <span className="relative z-10">PK</span>
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-cyan-400/20 to-fuchsia-400/20 mix-blend-overlay" />
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[24px] bg-gradient-to-b from-white/60 to-transparent dark:from-white/10" />
          </div>

          {/* Text Content */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              PixelKode OS
            </h1>
            <p className="mt-2 text-[11px] font-bold tracking-[0.2em] text-slate-500 dark:text-zinc-400 uppercase">
              Private Secure Login
            </p>
          </div>

          <div className="mt-8">
            <form action={formAction} className="space-y-4">
              <div className="space-y-3">
                <Input 
                  placeholder="Username" 
                  name="username" 
                  autoComplete="username" 
                  className="h-12 rounded-[16px] border-white/60 bg-white/50 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-500 backdrop-blur-md transition-all focus:border-cyan-500/50 focus:bg-white/80 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-cyan-500/50 dark:focus:bg-zinc-900/80"
                />
                
                {/* FIXED: Changed from Input.Password to standard Input type="password" */}
                <Input 
                  type="password" 
                  placeholder="Password" 
                  name="password" 
                  autoComplete="current-password" 
                  className="h-12 rounded-[16px] border-white/60 bg-white/50 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-500 backdrop-blur-md transition-all focus:border-cyan-500/50 focus:bg-white/80 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-cyan-500/50 dark:focus:bg-zinc-900/80"
                />
              </div>

              {state?.error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-center text-sm font-medium text-rose-600 dark:text-rose-400">
                  {state.error}
                </div>
              ) : null}

              <Button 
                className="group relative mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 text-[15px] font-bold text-slate-900 shadow-md backdrop-blur-xl transition-all hover:bg-slate-50 hover:shadow-lg hover:-translate-y-0.5 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 disabled:opacity-70 disabled:hover:translate-y-0"
                disabled={isPending}
              >
                {/* Neon Hover Glow */}
                <div className="absolute inset-0 rounded-[16px] bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-cyan-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <span className="relative z-10 flex items-center gap-2">
                  {isPending ? "Authenticating..." : (
                    <>
                      Secure Login
                      <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">
            <Sparkles className="h-3 w-3" />
            V2.0.1 Encrypted Gateway
          </div>
        </div>
      </div>
    </div>
  );
}