import { ArrowLeftRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Trading Post" };

/**
 * Trading Post is paused while we work out the logistics of trading and
 * selling prints safely. The community listing + interest flow live in git
 * history (and app/prints/actions.ts) for when we turn it back on.
 */
export default function PrintsPage() {
  return (
    <div>
      <PageHeader
        title="Trading Post"
        subtitle="Trade and track down grails with other collectors."
      />
      <EmptyState
        icon={ArrowLeftRight}
        title="Coming soon"
        description="We're still figuring out the logistics of trading and selling prints safely. Check back soon — your posters stay safe in your archive in the meantime."
      />
    </div>
  );
}
