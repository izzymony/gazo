import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function Navicard({
  icon,
  tab,
  active,route
}: {
  icon: ReactNode;
  tab: string;
  active: boolean;route:string
}) {
  const router = useRouter()
  return (
    <div onClick={()=>router.push(route)} className="flex-1 flex-col justify-center items-center py-2">
      <div className="flex justify-center items-center h-5">{icon}</div>
      <p
        className={
          active
            ? "text-brandDeep font-medium text-body-sm text-center"
            : "text-[#616161] font-medium text-body-sm text-center"
        }>
        {tab}
      </p>
    </div>
  );
}
