import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ModuleGrid({
  items
}: {
  items: {
    title: string;
    subtitle: string;
    metric: string;
    detail: string;
    tone?: "purple" | "blue" | "green" | "orange";
  }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="transition duration-200 hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">{item.subtitle}</p>
              <h3 className="mt-1 text-xl font-semibold">{item.title}</h3>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-3xl font-semibold text-white">{item.metric}</p>
            <Badge tone={item.tone ?? "purple"}>{item.detail}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
