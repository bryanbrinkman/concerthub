import { NotebookPen, Quote } from "lucide-react";

import type { UserMemory } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

interface MemoryCardProps {
  memory?: UserMemory;
  title?: string;
}

/** The personal note attached to a show. */
export function MemoryCard({ memory, title = "Your memory" }: MemoryCardProps) {
  if (!memory) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No memory yet"
        description="What do you remember? The opener, who you went with, the moment it peaked."
        actionLabel="Add memory"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>{title}</CardTitle>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2.5">
          <Quote className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
          <p className="text-sm leading-relaxed text-foreground/90">
            {memory.text}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-6">
          <p className="text-xs text-muted-foreground">
            {formatShortDate(memory.createdAt)}
          </p>
          {memory.attendedWith?.map((name) => (
            <Badge key={name} variant="secondary">
              with {name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
