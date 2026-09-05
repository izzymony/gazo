import WithdrawView from "./withdrawview";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function WithdrawPage() {
  try {
    return <WithdrawView />;
  } catch (error: any) {
    return (
      <div className="bg-surface justify-center items-center">
        <p>{error.message}</p>
      </div>
    );
  }
}
