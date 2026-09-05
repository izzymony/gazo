import Accordion from "@vibaar/ui/common/Accordion";
import DisclosureButton from "@vibaar/ui/common/DisclosureButton";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import VerifiedCheck from "@vibaar/ui/common/VerifiedCheck";
import { FaStar, FiUsers } from "@vibaar/ui/icons";
import { StoreData } from "@/lib/types";

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
      className="!px-[20px] lg:!px-0"
    >
      <div className="pb-2 rounded-lg">
        <p className="text-body-sm font-normal text-foreground-secondary line-clamp-3">
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
      className="!px-[20px] lg:!px-0"
    >
      <div className=" pb-2 rounded-lg">
        <div className="flex items-center mt-2">
          <div className="w-[52px] h-[52px]">
            <StoreLogo
              src={store?.logo as string}
              storeName={store?.name || "Store"}
              size={52}
              className=""
            />
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-xs flex items-center gap-1">
              {store?.name}
              <VerifiedCheck verified={store?.is_verified} size={13} />
            </h3>
            <p className="text-gray-500 text-caption font-normal flex items-center gap-1">
              {store?.category} · <FaStar /> {store?.average_rating || "0.0"} ·{" "}
              {store?.followers_count || "0"} <FiUsers />
            </p>
          </div>

          <div className="text-brandDeep text-xs ml-auto font-medium">Follow</div>
        </div>
        <p className="text-xs font-normal mt-2 text-foreground-secondary">
          {store?.description}
        </p>

        <div className="flex flex-wrap gap-3 mt-3">
          {collections?.map((col: string, index: number) => (
            <div
              key={index}
              className="bg-gray-200 rounded-full px-3 py-1 text-body-sm"
            >
              {col}
            </div>
          ))}
        </div>
      </div>
    </Accordion>
  );
}
