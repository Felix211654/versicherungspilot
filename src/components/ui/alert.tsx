import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const tones = {
  info: { cls: "bg-info-soft text-info border-info/20", Icon: Info },
  warning: { cls: "bg-warning-soft text-warning border-warning/20", Icon: AlertTriangle },
  danger: { cls: "bg-danger-soft text-danger border-danger/20", Icon: OctagonAlert },
  success: { cls: "bg-success-soft text-success border-success/20", Icon: CheckCircle2 },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1 text-text">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-text/85">{children}</div>}
      </div>
    </div>
  );
}
