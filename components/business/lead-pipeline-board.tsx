"use client";

import { useMemo } from "react";
import { ArrowRight, KanbanSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBusinessStore } from "@/lib/store";

const pipelineStages = ["Fresh", "Follow-up", "Proposal Sent", "Converted", "Dropped"] as const;

export function LeadPipelineBoard() {
  const leads = useBusinessStore((state) => state.sheets.leads.rows);
  const updateCell = useBusinessStore((state) => state.updateCell);

  const columns = useMemo(() => {
    return pipelineStages.map((stage) => ({
      stage,
      items: leads
        .map((lead, index) => ({
          index,
          id: String(lead.id ?? ""),
          businessName: String(lead.businessName ?? "Unnamed lead"),
          contactName: String(lead.contactName ?? ""),
          servicePitch: String(lead.servicePitch ?? ""),
          expectedValue: Number(lead.expectedValue ?? 0),
          followUpDate: String(lead.followUpDate ?? ""),
          notes: String(lead.notes ?? ""),
          leadStatus: String(lead.leadStatus ?? "Fresh")
        }))
        .filter((lead) => lead.leadStatus === stage)
    }));
  }, [leads]);

  const moveLead = (rowIndex: number, nextStage: (typeof pipelineStages)[number]) => {
    updateCell("leads", rowIndex, "leadStatus", nextStage);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/72">
        <div className="border-b border-slate-200/80 bg-white/70 px-5 py-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <KanbanSquare className="h-5 w-5 text-fuchsia-600 dark:text-cyan-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-cyan-300">Lead Pipeline Board</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Kanban view for your lead journey</h1>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="grid min-w-[1200px] gap-4 xl:grid-cols-5">
            {columns.map((column, columnIndex) => (
              <div key={column.stage} className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{column.stage}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{column.items.length} lead{column.items.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {column.items.length > 0 ? (
                    column.items.map((lead) => (
                      <div key={lead.id} className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-black/20">
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{lead.businessName}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{lead.contactName || "No contact yet"}</p>
                        <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-zinc-300">
                          {lead.servicePitch ? <p>Service: {lead.servicePitch}</p> : null}
                          {lead.expectedValue > 0 ? <p>Expected value: INR {lead.expectedValue.toLocaleString("en-IN")}</p> : null}
                          {lead.followUpDate ? <p>Follow-up: {lead.followUpDate}</p> : null}
                        </div>
                        {columnIndex < pipelineStages.length - 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-4 w-full rounded-2xl"
                            onClick={() => moveLead(lead.index, pipelineStages[columnIndex + 1])}
                          >
                            Move to {pipelineStages[columnIndex + 1]}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-black/10 dark:text-zinc-400">
                      No leads in this stage.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
