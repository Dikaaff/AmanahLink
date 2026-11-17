import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { compactRupiah, daysLeft, rupiah } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/stat";
import {
  CampaignCover,
  CoverChip,
  CoverChips,
} from "@/components/campaign-cover";

export function CampaignCard({
  campaign,
  priority = false,
}: {
  campaign: Campaign;
  /** First card is the likely LCP on mobile; load it eagerly. */
  priority?: boolean;
}) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-accent">
      <CampaignCover campaign={campaign} priority={priority}>
        <CoverChips
          left={<StatusBadge status={campaign.status} label={campaign.status_label} />}
          right={
            <CoverChip>{daysLeft(campaign.deadline_at)}</CoverChip>
          }
        />
      </CampaignCover>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words text-h3 font-semibold leading-snug text-ink">
          <Link href={`/campaigns/${campaign.slug}`} className="hover:underline">
            {campaign.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-body-sm leading-relaxed text-ink-secondary">
          {campaign.description}
        </p>

        <div className="mt-auto space-y-2 pt-5">
          <Progress value={campaign.progress_percent} label="Progres kampanye" />
          <div className="flex items-baseline justify-between gap-3">
            <span className="numeric text-body font-semibold text-ink">
              {compactRupiah(campaign.current_amount)}
            </span>
            <span className="numeric text-body-sm font-medium text-ink">
              {Math.round(campaign.progress_percent)}%
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            dari {rupiah(campaign.target_amount)} ·{" "}
            {campaign.campaigner?.name ?? "Penggalang dana"}
          </p>
        </div>
      </div>
    </article>
  );
}
