/* eslint-disable @typescript-eslint/no-unused-vars */
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import ListItem from "@/design-system/common/ListItem";
import TransactionIcon from "@/design-system/common/TransactionIcon";

export const TransactionCard = ({
  type,
  amount,
  icon,
  title,
  time,
}: {
  type: "credit" | "debit" | "pending";
  amount: string;
  icon: keyof {
    payoutdeclined: string;
    billing: string;
    refferal: string;
    payoutpending: string;
    payout: string;
    refund: string;
    order: string;
    topup: string;
  };
  title: string;
  time: string;
}) => {
  const { setSelectedTransaction } = useBusinessStore();
  const router = useRouter();
  const colorClass =
    type === "credit"
      ? "text-green-700"
      : type === "debit"
      ? "text-instaRed"
      : "text-ink-60";
  return (
    <ListItem
      onClick={() => {
        setSelectedTransaction({ type, amount, icon, title, time });
        router.push("/dashboard/transactions/summary");
      }}
      leading={<TransactionIcon icon={icon} type={type} />}
      title={<span className="font-medium">{title}</span>}
      meta={time}
      trailing={
        <span className={`text-body font-medium ${colorClass}`}>
          {type === "credit" ? "+ " : "- "} ₦{amount}
        </span>
      }
    />
  );
};
