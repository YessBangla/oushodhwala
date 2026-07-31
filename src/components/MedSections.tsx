import { useState } from "react";
import { ChevronDown, AlertTriangle, Baby, ShieldAlert, Pill } from "lucide-react";

export type MedSection = {
  /** সেকশনের ধরন — কলআউট/টেবিল সাজানোর জন্য */
  kind?: "dosage" | "warning" | "pregnancy" | "side-effects" | "plain";
  title: string;
  body: string;
};

const TONE: Record<
  string,
  { wrap: string; head: string; icon: typeof AlertTriangle | null; badge?: string }
> = {
  warning: {
    wrap: "border-sale/40 bg-sale/5",
    head: "text-sale",
    icon: ShieldAlert,
  },
  "side-effects": {
    wrap: "border-sale/40 bg-sale/5",
    head: "text-sale",
    icon: AlertTriangle,
  },
  pregnancy: {
    wrap: "border-primary/40 bg-primary/5",
    head: "text-primary-dark",
    icon: Baby,
  },
  dosage: {
    wrap: "border-primary/30 bg-card",
    head: "text-primary-dark",
    icon: Pill,
  },
  plain: { wrap: "border-border bg-card", head: "", icon: null },
};

/** "Label: value" ধরনের লাইনকে আলাদা করে */
function splitRow(line: string): [string, string] | null {
  const m = line.match(/^([^:：]{6,70})[:：]\s*(.+)$/);
  if (m && (m[2] ?? "").length < 8) return null;
  if (!m) return null;
  return [m[1]!.trim(), m[2]!.trim()];
}

function Body({ body, kind }: { body: string; kind: MedSection["kind"] }) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);

  if (kind === "dosage") {
    return (
      <div className="space-y-2">
        {lines.map((l, i) => {
          const row = splitRow(l);
          return row ? (
            <div
              key={i}
              className="grid gap-0.5 rounded-lg border border-border bg-background/60 p-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-3"
            >
              <p className="min-w-0 text-[13px] font-semibold text-foreground sm:text-xs">{row[0]}</p>
              <p className="min-w-0 text-[13px] leading-relaxed text-muted-foreground sm:text-xs">{row[1]}</p>
            </div>
          ) : (
            <p key={i} className="text-[13px] font-semibold leading-relaxed text-foreground sm:text-xs">
              {l}
            </p>
          );
        })}
      </div>
    );
  }

  if (lines.length > 1) {
    return (
      <ul className="space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-[1.75] text-muted-foreground sm:text-xs sm:leading-relaxed">
            <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
            <span className="min-w-0">{l}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="whitespace-pre-line text-[13px] leading-[1.75] text-muted-foreground sm:text-xs sm:leading-relaxed">
      {body}
    </p>
  );
}

function SectionCard({
  s,
  defaultOpen,
  forceOpen,
  badgeText,
}: {
  s: MedSection;
  defaultOpen: boolean;
  forceOpen: boolean;
  badgeText?: string | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = forceOpen || open;
  const tone = TONE[s.kind ?? "plain"] ?? TONE["plain"]!;
  const Icon = tone.icon;

  return (
    <section className={`overflow-hidden rounded-xl border ${tone.wrap}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={shown}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className={`h-4 w-4 shrink-0 ${tone.head}`} />}
          <span className={`min-w-0 text-sm font-bold ${tone.head}`}>{s.title}</span>
          {badgeText && (
            <span className="shrink-0 rounded-full bg-sale/15 px-2 py-0.5 text-[10px] font-bold text-sale">
              {badgeText}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${shown ? "rotate-180" : ""}`}
        />
      </button>
      {shown && (
        <div className="border-t border-border/60 px-3 py-3">
          <Body body={s.body} kind={s.kind} />
        </div>
      )}
    </section>
  );
}

export function MedSections({
  sections,
  reading,
  badgeText,
}: {
  sections: MedSection[];
  /** রিডিং মোডে সব সেকশন খোলা থাকে */
  reading: boolean;
  badgeText?: string | undefined;
}) {
  return (
    <div className="mt-6 space-y-3">
      {sections.map((s, i) => (
        <SectionCard
          key={s.title}
          s={s}
          defaultOpen={i < 2}
          forceOpen={reading}
          badgeText={
            s.kind === "warning" || s.kind === "side-effects" || s.kind === "pregnancy" ? badgeText : undefined
          }
        />
      ))}
    </div>
  );
}
