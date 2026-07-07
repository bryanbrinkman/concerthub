import { NotebookPen } from "lucide-react";

import { addMemoryAction } from "@/app/memory-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Write-a-memory card shown to signed-in users who haven't added one yet. */
export function MemoryForm({ showId }: { showId: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Your memory</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={addMemoryAction} className="space-y-3">
          <input type="hidden" name="showId" value={showId} />
          <textarea
            name="text"
            required
            rows={4}
            placeholder="What do you remember? The opener, who you went with, the moment it peaked."
            className="w-full resize-y rounded-lg border border-border bg-secondary p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm">
            <NotebookPen />
            Save memory
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
