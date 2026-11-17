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
    <article className="flex min-w-0">
      {/*
        The whole card is the link: on mobile the title alone was too small a
        target and users could not tell the card was clickable. One link covers
        every pixel of the card, and the visible focus ring follows it.

        The link has no aria-labelledby: forcing the name to the title hides the
        amount and progress that are visible inside the card, which fails WCAG
        2.5.3 "Label in Name". The title stays the first thing in the name
        because it is the first text in the card.
      */}
      <Link
        href={`/campaigns/${campaign.slug}`}
        className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-accent"
      >
        <CampaignCover campaign={campaign} priority={priority}>
          <CoverChips
            left={<StatusBadge status={campaign.status} label={campaign.status_label} />}
            right={<CoverChip>{daysLeft(campaign.deadline_at)}</CoverChip>}
          />
        </CampaignCover>

        <div className="flex flex-1 flex-col p-5">
          <h3
            id={`campaign-title-${campaign.id}`}
            className="break-words text-h3 font-semibold leading-snug text-ink group-hover:underline"
          >
            {campaign.title}
          </h3>

          <p className="mt-2 line-clamp-2 break-words text-body-sm leading-relaxed text-ink-secondary">
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
      </Link>
    </article>
  );
}
