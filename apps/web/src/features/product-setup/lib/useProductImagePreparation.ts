import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProductImagePreparationTracker } from "./ProductImagePreparation";
import {
  ImagePreparationError,
  prepareProductImages,
  type PreparedImage,
} from "./prepareProductImage";

/**
 * The picker half of product-image preparation: the busy flag, the error
 * message, and the rule that a failure produces NOTHING.
 *
 * `prepare` resolves to `null` when preparation fails, and every caller must
 * treat that as "add no image". The alternative — falling back to the raw file
 * — is the behaviour this work exists to remove: it is how a 5MB photo reached
 * the publish payload and timed the request out at 30s.
 *
 * `preparing` is returned for this picker's own UI, and the same state is
 * reported to `ProductImagePreparationProvider` so the page's commit action can
 * be disabled without threading a prop through every component in between —
 * publishing mid-preparation would send the payload without the image the
 * seller just chose.
 */
export function useProductImagePreparation() {
  const [preparing, setPreparing] = useState(false);
  const { begin, end } = useProductImagePreparationTracker();
  const activeRef = useRef(false);

  // Unmounting mid-prepare must release the page's action, or it stays disabled
  // for the rest of the session.
  useEffect(
    () => () => {
      if (activeRef.current) {
        activeRef.current = false;
        end();
      }
    },
    [end]
  );

  const prepare = useCallback(
    async (files: FileList | File[] | null): Promise<PreparedImage[] | null> => {
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return [];

      setPreparing(true);
      activeRef.current = true;
      begin();
      try {
        return await prepareProductImages(list);
      } catch (error) {
        toast.error(
          error instanceof ImagePreparationError
            ? error.message
            : "Couldn't prepare that image. Try a different one."
        );
        return null;
      } finally {
        setPreparing(false);
        if (activeRef.current) {
          activeRef.current = false;
          end();
        }
      }
    },
    [begin, end]
  );

  return { preparing, prepare };
}
