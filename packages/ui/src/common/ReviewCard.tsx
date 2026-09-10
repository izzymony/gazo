import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import Avatar from "./Avatar";
import StarRating from "./StarRating";

export interface ReviewCardProps {
  /** Score, 0–5. */
  rating: number;
  /** The written review. A review can be a score alone. */
  comment?: string;
  /** ISO timestamp or Date. Omitted/unparseable renders nothing. */
  date?: string | Date;
  /**
   * Who wrote it, WHEN THE API SAYS SO. Ratings currently carry only a
   * `user_id`, with no join to the user — so this is normally absent, and the
   * card says "A shopper" rather than inventing a person. It is a prop, not a
   * placeholder: the moment the backend projects a safe name/avatar, the same
   * card shows them without a redesign.
   */
  author?: { name?: string; avatarUrl?: string };
  /** What the review is OF — a product name and thumb on a store-wide list. */
  subject?: { title?: string; imageUrl?: string };
  /** Extra facts the caller can prove, e.g. a "Bought White, M" chip. */
  meta?: ReactNode;
  className?: string;
}

const formatDate = (date?: string | Date): string => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const time = d.getTime();
  if (Number.isNaN(time)) return "";

  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * ReviewCard — one review, showing only what is actually known about it.
 *
 * There were two review designs and neither was right. The product page drew a
 * bordered row with five stars, a date, and the comment wrapped in `&quot;`
 * marks UNCONDITIONALLY — so a rating left without a written review rendered as
 * a bare pair of quotation marks with nothing between them. The seller's
 * "Reviewed" tab drew the richer card the design wanted (avatar, store, product,
 * date, a "Bought White, M" chip, tag pills) but every value in it was a
 * hardcoded string — "Gucci Store", "Product name goes here" — behind a `data`
 * array pinned to `[]`, so it was unreachable code describing a fiction.
 *
 * This is the second design with the first one's honesty. Author, subject and
 * meta are optional because the API cannot supply them today; a review with only
 * a score and a date renders as exactly that, and nothing is filled in for it.
 */
export default function ReviewCard({
  rating,
  comment,
  date,
  author,
  subject,
  meta,
  className,
}: ReviewCardProps) {
  const text = comment?.trim();
  const when = formatDate(date);
  const who = author?.name?.trim();

  return (
    <article
      className={cn(
        "flex gap-3 rounded-card border border-outline bg-surface p-4",
        className
      )}>
      <Avatar
        src={author?.avatarUrl}
        name={who || "?"}
        size={36}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-body-sm font-medium text-foreground-primary">
            {/* No name from the API means no name on the card. */}
            {who || "A shopper"}
          </p>
          {when && <p className="text-caption text-foreground-muted">{when}</p>}
        </div>

        <StarRating value={rating} size="xs" />

        {subject?.title && (
          <div className="flex items-center gap-2">
            {subject.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={subject.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-8 w-8 shrink-0 rounded-field border border-outline-subtle object-cover"
              />
            )}
            <p className="truncate text-caption text-foreground-secondary">
              {subject.title}
            </p>
          </div>
        )}

        {/* Only when there IS one. This is the empty-quotes bug. */}
        {text && (
          <p className="text-body-sm text-foreground-primary">{text}</p>
        )}

        {meta}
      </div>
    </article>
  );
}
