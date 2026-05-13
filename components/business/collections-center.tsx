"use client";

import { useMemo } from "react";
import { CircleDollarSign, MessageSquareText, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBusinessStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function CollectionsCenter() {
  const projects = useBusinessStore((state) => state.sheets.projects.rows);

  const pendingProjects = useMemo(() => {
    return projects
      .map((project) => ({
        id: String(project.id ?? ""),
        projectName: String(project.projectName ?? "Project"),
        clientName: String(project.clientName ?? "Client"),
        pendingAmount: Number(project.pendingAmount ?? 0),
        amountReceived: Number(project.amountReceived ?? 0),
        projectValue: Number(project.projectValue ?? 0),
        deliveryDate: String(project.deliveryDate ?? ""),
        paymentStatus: String(project.paymentStatus ?? "Pending")
      }))
      .filter((project) => project.pendingAmount > 0)
      .sort((left, right) => right.pendingAmount - left.pendingAmount);
  }, [projects]);

  const totals = useMemo(() => {
    const pendingAmount = pendingProjects.reduce((sum, project) => sum + project.pendingAmount, 0);
    return {
      pendingAmount,
      totalProjects: pendingProjects.length,
      overdueProjects: pendingProjects.filter((project) => project.deliveryDate && project.deliveryDate < new Date().toISOString().slice(0, 10)).length
    };
  }, [pendingProjects]);

  const openReminder = (projectName: string, clientName: string, pendingAmount: number) => {
    window.dispatchEvent(
      new CustomEvent("ops-assistant:prompt", {
        detail: {
          prompt: `Draft a polite payment reminder for ${clientName} about ${projectName}. Pending amount is ${formatCurrency(pendingAmount)}.`,
          run: true
        }
      })
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/72">
        <div className="border-b border-slate-200/80 bg-white/70 px-5 py-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-cyan-300">Collections Center</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Pending collections and reminder actions</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
            Focus only on money still blocked in projects, who needs follow-up, and how much should be collected next.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <Card className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <Wallet className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Total pending</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{formatCurrency(totals.pendingAmount)}</p>
          </Card>
          <Card className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <CircleDollarSign className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Projects pending</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{totals.totalProjects}</p>
          </Card>
          <Card className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <MessageSquareText className="h-5 w-5 text-rose-600 dark:text-rose-300" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Overdue after delivery</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{totals.overdueProjects}</p>
          </Card>
        </div>

        <div className="grid gap-4 px-5 pb-5">
          {pendingProjects.length > 0 ? (
            pendingProjects.map((project) => (
              <div key={project.id} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950 dark:text-white">{project.projectName}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{project.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 dark:text-zinc-400">Pending</p>
                    <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{formatCurrency(project.pendingAmount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Collected</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(project.amountReceived)}</p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Project value</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(project.projectValue)}</p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Delivery / status</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{project.deliveryDate || "No delivery date"} / {project.paymentStatus}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="rounded-2xl" onClick={() => openReminder(project.projectName, project.clientName, project.pendingAmount)}>
                    Draft reminder
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("ops-assistant:prompt", {
                          detail: {
                            prompt: `Give me the best next collection action for ${project.projectName}. Pending amount is ${formatCurrency(project.pendingAmount)} and delivery date is ${project.deliveryDate || "not set"}.`,
                            run: true
                          }
                        })
                      )
                    }
                  >
                    Next action
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
              No pending collections right now.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
