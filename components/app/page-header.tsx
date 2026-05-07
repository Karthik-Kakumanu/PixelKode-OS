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
    <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/70 px-5 py-4 shadow-[0_14px_38px_rgba(66,32,118,0.08)] lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Badge tone="purple">{eyebrow}</Badge>
        <div>
          <h1 className="premium-heading text-2xl font-semibold lg:text-[32px]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {actionLabel ? <Button>{actionLabel}</Button> : null}
    </div>
  );
}
