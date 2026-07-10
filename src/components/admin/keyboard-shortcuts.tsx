import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { group: "General", keys: ["⌘", "K"], label: "Open command palette" },
  { group: "General", keys: ["?"], label: "Show keyboard shortcuts" },
  { group: "General", keys: ["Esc"], label: "Close dialog / palette" },
  { group: "Create", keys: ["C", "N"], label: "New content item" },
  { group: "Create", keys: ["C", "P"], label: "New previous paper" },
  { group: "Create", keys: ["C", "Q"], label: "New quiz" },
  { group: "Navigation", keys: ["G", "D"], label: "Go to Dashboard" },
  { group: "Navigation", keys: ["G", "C"], label: "Go to Content" },
  { group: "Navigation", keys: ["G", "S"], label: "Go to Settings" },
];

export function useKeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Move faster with your keyboard. Press <Kbd>?</Kbd> anytime to open this list.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {g}
              </div>
              <div className="divide-y divide-border/60 rounded-lg border border-border/70">
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  );
}
