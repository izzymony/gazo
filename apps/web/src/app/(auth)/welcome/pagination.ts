/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const paginatedFetcher = async (
  action: (val: number) => Promise<any>,
  setter: (val: any[]) => void,
  user: any
) => {
  try {
    const totalPages = 4;
    const requests = Array.from({ length: totalPages }, (_, i) =>
      action(i + 1)
    );

    const responses = await Promise.all(requests);

    // Filter out null, undefined, or non-array responses
    const filteredResponses = responses
      .filter(Boolean) // Removes null/undefined
      .filter((res) => Array.isArray(res)); // Keep only arrays

    // Flatten the arrays into one
    const products = filteredResponses.flat();

    // Set the result (if user has no ID, return an empty array)
    setter(products);
  } catch (error) {
    console.error("Error fetching paginated data:", error);
  }
};
