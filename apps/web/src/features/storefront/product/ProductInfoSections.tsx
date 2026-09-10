import Accordion from "@vibaar/ui/common/Accordion";
import DisclosureButton from "@vibaar/ui/common/DisclosureButton";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import VerifiedCheck from "@vibaar/ui/common/VerifiedCheck";
import { FaStar, FiUsers } from "@vibaar/ui/icons";
import { StoreData } from "@/lib/types";
import Badge from "@vibaar/ui/common/Badge";

/**
 * Self-contained accordion sections extracted from the Product god-page (W4.4).
 * Rendering is preserved verbatim; only bounded props are threaded, so tsc
 * fully verifies the extraction.
 */

export function ProductDescription({
  description,
  truncatedDescription,
  isExpanded,
  setIsExpanded,
}: {
  description?: string;
  truncatedDescription?: string;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}) {
  return (
    <Accordion
      title="Product description"
      initiallyOpen={true}
      className="px-5 lg:px-0"
    >
      <div>
        <p className="text-body-sm font-normal text-foreground-secondary">
          {truncatedDescription}
        </p>
        {description && description.length > 100 && !isExpanded && (
          <DisclosureButton
              expanded={isExpanded}
              onClick={() => setIsExpanded(!isExpanded)}
              className=" text-brandDeep text-body-sm font-medium">
              Read more
            </DisclosureButton>
        )}
        {isExpanded && (
          <DisclosureButton
              expanded={isExpanded}
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 text-brandDeep text-body-sm">
              Show less
            </DisclosureButton>
        )}
      </div>
    </Accordion>
  );
}

export function ProductVendorInfo({
  store,
  collections,
}: {
  store: StoreData | null | undefined;
  collections?: string[];
}) {
  return (
    <Accordion
      title="About this vendor"
      initiallyOpen={true}
      className="px-5 lg:px-0"
    >
      <div>
        <div className="flex items-center gap-3">
          <StoreLogo
            src={store?.logo as string}
            storeName={store?.name || "Store"}
            size={48}
          />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1 text-body font-medium text-foreground-primary">
              <span className="truncate">{store?.name}</span>
              <VerifiedCheck verified={store?.is_verified} size={14} />
            </h3>
            {/* The metrics row. Both glyphs used to render at their intrinsic
                size next to 10px text — the star and the people icon came out
                visibly larger than the numbers they belonged to. Sized to the
                text and marked decorative, with the meaning carried by real
                words for screen readers. */}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-body-sm font-normal text-foreground-muted">
              {store?.category && <span className="truncate">{store.category}</span>}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <FaStar size={12} className="text-warning-foreground" aria-hidden="true" />
                {Number(store?.average_rating || 0).toFixed(1)}
                <span className="sr-only">average rating</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <FiUsers size={12} aria-hidden="true" />
                {store?.followers_count || 0}
                <span className="sr-only">followers</span>
              </span>
            </p>
          </div>
        </div>
        {store?.description && (
          <p className="mt-3 text-body-sm font-normal text-foreground-secondary">
            {store.description}
          </p>
        )}

        {collections && collections.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {collections.map((col: string, index: number) => (
              <Badge key={index} size="md">
                {col}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Accordion>
  );
}
