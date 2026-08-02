import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getAllUserHighlights, getAllUserNotes, getAllUserFavorites } from "@/lib/data/study";
import { getAllPersonalTaggedVerses } from "@/lib/data/personal-topics";
import { StudyExplorer } from "@/components/study-explorer";

export default async function MiEstudioPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [highlights, notes, favorites, personalTags] = await Promise.all([
    getAllUserHighlights(profile.id),
    getAllUserNotes(profile.id),
    getAllUserFavorites(profile.id),
    getAllPersonalTaggedVerses(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Mi estudio</h1>
      <StudyExplorer
        highlights={highlights}
        notes={notes}
        favorites={favorites}
        personalTags={personalTags}
      />
    </div>
  );
}
