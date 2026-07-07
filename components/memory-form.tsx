import { NotebookPen, Trash2 } from "lucide-react";

import { addMemoryAction } from "@/app/memory-actions";
import { deleteMemoryAction } from "@/app/manage-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Write/edit-a-memory card for the signed-in archive owner. */
export function MemoryForm({
  showId,
  defaultText,
  memoryId,
  title = "Your memory",
}: {
  showId: string;
  /** Prefill when editing an existing memory (the action upserts). */
  defaultText?: string;
  /** When set, a delete control is offered alongside save. */
  memoryId?: string;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form action={addMemoryAction} className="space-y-3">
          <input type="hidden" name="showId" value={showId} />
          <textarea
            name="text"
            required
            rows={4}
            defaultValue={defaultText}
            placeholder="What do you remember? The opener, who you went with, the moment it peaked."
            className="w-full resize-y rounded-lg border border-border bg-secondary p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm">
            <NotebookPen />
            Save memory
          </Button>
        </form>
        {memoryId ? (
          <form action={deleteMemoryAction}>
            <input type="hidden" name="id" value={memoryId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              Delete memory
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
