import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { compactRupiah, daysLeft, rupiah } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/stat";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <article className="group flex min-w-0 flex-col rounded-md border border-line bg-surface p-5 transition-colors hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={campaign.status} label={campaign.status_label} />
        <span className="text-xs text-ink-secondary">{daysLeft(campaign.deadline_at)}</span>
      </div>

      <h3 className="mt-3 break-words text-h3 font-semibold leading-snug text-ink">
        <Link href={`/campaigns/${campaign.slug}`} className="hover:underline">
          {campaign.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-body-sm leading-relaxed text-ink-secondary">
        {campaign.description}
      </p>

      <div className="mt-4 space-y-2">
        <Progress value={campaign.progress_percent} label="Progres kampanye" />
        <div className="flex items-baseline justify-between text-body-sm">
          <span className="font-semibold text-ink">{compactRupiah(campaign.current_amount)}</span>
          <span className="text-ink-secondary">dari {rupiah(campaign.target_amount)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-secondary">
        <span>{campaign.campaigner?.name ?? "Penggalang dana"}</span>
        <span>{Math.round(campaign.progress_percent)}% tercapai</span>
      </div>
    </article>
  );
}
