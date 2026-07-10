import { LogIn } from "lucide-react";

import { getArchive } from "@/lib/archive";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddShowWizard } from "@/components/add-show-wizard";

export const metadata = { title: "Add show" };

export default async function AddShowPage() {
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to add shows"
        description="Shows are saved to your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add a show"
        subtitle="Search any concert — we'll attach the real setlist and fill in the details. Or add one by hand."
      />
      <AddShowWizard />
    </div>
  );
}
