import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  actionLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-violet-100 bg-white/60 p-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <Badge tone="purple">{eyebrow}</Badge>
        <div>
          <h1 className="text-3xl font-semibold lg:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
        </div>
      </div>
      {actionLabel ? <Button>{actionLabel}</Button> : null}
    </div>
  );
}
