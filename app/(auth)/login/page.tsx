"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState = {
  error: ""
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,207,227,0.55),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,233,225,0.48),transparent_22%),radial-gradient(circle_at_bottom,rgba(216,214,255,0.45),transparent_30%)]" />
      <Card className="relative w-full max-w-5xl overflow-hidden p-0">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))] p-8 lg:border-b-0 lg:border-r">
            <div className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-violet-700">
              Pixelkode OS
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight lg:text-5xl">
              Run your business from one soft, focused dashboard.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Projects, leads, revenue, team planning, and content tracking now sit in one private operating system built for your business.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white/55 p-4">
                <p className="text-sm text-slate-500">Projects</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">Live</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/55 p-4">
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">Tracked</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/55 p-4">
                <p className="text-sm text-slate-500">Leads</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">Ready</p>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <p className="text-sm text-slate-500">Private login</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Enter your Pixelkode business dashboard</h2>


            <form action={formAction} className="mt-8 space-y-4">
              <Input placeholder="Username" name="username" autoComplete="username" />
              <Input.Password placeholder="Password" name="password" autoComplete="current-password" />
              {state?.error ? <p className="text-sm text-rose-500">{state.error}</p> : null}
              <Button className="w-full" disabled={isPending}>
                {isPending ? "Checking..." : "Login"}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
