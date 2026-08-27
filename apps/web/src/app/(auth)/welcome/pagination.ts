/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Fetch up to `maxPages` pages and flatten them. P12: fetch sequentially and STOP
// at the first empty page instead of always firing `maxPages` parallel requests —
// pagination is contiguous, so an empty page means there is no more data. This is
// behaviour-preserving (same flattened result, still capped at maxPages) but cuts
// the request count for the common small-dataset case (e.g. 1 page of data → 2
// requests instead of 4). A full last page still costs one extra empty request
// because the per-action page size isn't known here.
export const paginatedFetcher = async (
  action: (val: number) => Promise<any>,
  setter: (val: any[]) => void,
  user: any,
  maxPages = 4
) => {
  try {
    const collected: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await action(page);
      if (!Array.isArray(res) || res.length === 0) break; // last page reached
      collected.push(...res);
    }
    setter(collected);
  } catch (error) {
    console.error("Error fetching paginated data:", error);
  }
};
