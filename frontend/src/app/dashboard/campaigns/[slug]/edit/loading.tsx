import { Loading } from "@/components/ui";

export default function EditCampaignLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Loading label="Menyiapkan ruang edit kampanye…" />
    </div>
  );
}
