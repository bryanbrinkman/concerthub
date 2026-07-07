import { Plus } from "lucide-react";

import { getAllShows } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ShowCard } from "@/components/show-card";

export const metadata = { title: "Shows" };

export default function ShowsPage() {
  const allShows = getAllShows();

  return (
    <div>
      <PageHeader
        title="All Shows"
        subtitle={`${allShows.length} shows in your archive — attended and tracked.`}
        actions={
          <Button>
            <Plus />
            Add show
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allShows.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}
