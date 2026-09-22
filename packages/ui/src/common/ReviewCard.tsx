import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import Avatar from "./Avatar";
import StarRating from "./StarRating";
import { User } from "../icons";

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
 * "Reviewed" tab drew the richer card (avatar, store, product, date, a "Bought
 * White, M" chip) but every value in it was a hardcoded string behind a `data`
 * array pinned to `[]` — unreachable code describing a fiction.
 *
 * Reading order is what the reader came for: the SCORE and what was said, then
 * who said it and when, then what it was about. An anonymous review does not
 * get a coloured initial — `Avatar`'s fallback hashes the name into a palette,
 * so passing it a literal "?" produced a bright pink disc with a question mark,
 * which read as a broken image rather than "we don't know who".
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
        "flex flex-col gap-3 rounded-card border border-outline bg-surface p-4",
        className
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {who ? (
            <Avatar src={author?.avatarUrl} name={who} size={32} className="shrink-0" />
          ) : (
            // Not a person we can name — a neutral mark, not a coloured initial.
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
              <User size={16} />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-body-sm font-medium text-foreground-primary">
              {who || "A shopper"}
            </p>
            <StarRating value={rating} size="xs" />
          </div>
        </div>
        {when && (
          <p className="shrink-0 text-caption text-foreground-muted">{when}</p>
        )}
      </div>

      {/* Only when there IS one. This is the empty-quotes bug. */}
      {text && <p className="text-body-sm text-foreground-primary">{text}</p>}

      {subject?.title && (
        // What was reviewed, as one quiet chip rather than a loose thumbnail
        // and a stray line of text.
        <div className="flex items-center gap-2 self-start rounded-pill bg-surface-subtle py-1 pl-1 pr-3">
          {subject.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={subject.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          )}
          <p className="truncate text-caption text-foreground-secondary">
            {subject.title}
          </p>
        </div>
      )}

      {meta}
    </article>
  );
}
