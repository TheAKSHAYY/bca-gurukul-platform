import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Save, ArrowUp, ArrowDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: HomepageEditor,
});

type Section = {
  id: string;
  type: string;
  position: number;
  enabled: boolean;
  props: Record<string, unknown> | null;
};

function HomepageEditor() {
  const qc = useQueryClient();
  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin", "homepage_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("id,type,position,enabled,props")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (patch: { id: string; updates: Partial<Section> }) => {
      const { error } = await supabase
        .from("homepage_sections")
        .update(patch.updates)
        .eq("id", patch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "homepage_sections"] });
      qc.invalidateQueries({ queryKey: ["homepage_sections", "public"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">Homepage CMS</h1>
        <p className="text-sm text-muted-foreground">
          Toggle sections, reorder them, and edit their content. Changes appear instantly on the landing page.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-4">
        {sections?.map((s, i) => (
          <SectionCard
            key={s.id}
            section={s}
            onSave={(updates) => mutate.mutate({ id: s.id, updates })}
            onMove={(dir) => {
              const swap = sections[i + (dir === "up" ? -1 : 1)];
              if (!swap) return;
              mutate.mutate({ id: s.id, updates: { position: swap.position } });
              mutate.mutate({ id: swap.id, updates: { position: s.position } });
            }}
            canMoveUp={i > 0}
            canMoveDown={i < (sections?.length ?? 0) - 1}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onSave,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  section: Section;
  onSave: (u: Partial<Section>) => void;
  onMove: (dir: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [position, setPosition] = useState(section.position);
  const [propsText, setPropsText] = useState(
    JSON.stringify(section.props ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPosition(section.position);
    setPropsText(JSON.stringify(section.props ?? {}, null, 2));
  }, [section]);

  const save = () => {
    try {
      const parsed = JSON.parse(propsText);
      setError(null);
      onSave({ position, props: parsed });
    } catch {
      setError("Invalid JSON");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <CardTitle className="font-display text-lg capitalize">
            {section.type.replace(/_/g, " ")}
          </CardTitle>
          <Badge variant={section.enabled ? "default" : "secondary"}>
            {section.enabled ? "Visible" : "Hidden"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={!canMoveUp}
            onClick={() => onMove("up")}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!canMoveDown}
            onClick={() => onMove("down")}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={section.enabled ? "outline" : "default"}
            onClick={() => onSave({ enabled: !section.enabled })}
          >
            {section.enabled ? (
              <>
                <EyeOff className="mr-1.5 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
          <Label htmlFor={`pos-${section.id}`}>Position</Label>
          <Input
            id={`pos-${section.id}`}
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <div>
          <Label htmlFor={`props-${section.id}`} className="text-xs uppercase tracking-wider text-muted-foreground">
            Props (JSON)
          </Label>
          <Textarea
            id={`props-${section.id}`}
            value={propsText}
            onChange={(e) => setPropsText(e.target.value)}
            rows={Math.min(12, propsText.split("\n").length + 1)}
            className="mt-1.5 font-mono text-xs"
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save}>
            <Save className="mr-1.5 h-4 w-4" />
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
