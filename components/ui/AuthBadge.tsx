import { cn } from "@/lib/utils";

interface AuthBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export default function AuthBadge({ className, size = "md" }: AuthBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-[var(--border-gold)] text-[var(--gold)] font-[family-name:var(--font-dm-sans)] tracking-widest uppercase",
        size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[10px] px-3 py-1",
        className
      )}
    >
      <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
      Authenticated
    </span>
  );
}
