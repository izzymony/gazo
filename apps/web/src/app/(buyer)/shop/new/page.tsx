import AllVendorsDetails from "@/features/shop/vendors";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function page() {
  try {
    return <AllVendorsDetails data={[]} />;
  } catch (error: any) {
    return (
      <div>
        <p>An error occured {error.message.toString()}</p>
      </div>
    );
  }
}
