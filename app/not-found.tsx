import Link from "next/link";
import { Disc3 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Disc3 className="mb-4 h-10 w-10 text-primary" />
      <h1 className="text-2xl font-semibold">This one's not in the archive</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist — maybe the show was
        cancelled, or the stub got lost in the wash.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">Back to the archive</Link>
      </Button>
    </div>
  );
}
