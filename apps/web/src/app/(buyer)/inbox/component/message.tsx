import { useRouter } from "next/navigation";

/* eslint-disable @next/next/no-img-element */
export default function Message() {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push("/inbox/message/12")}
      className="w-full gap-3 flex cursor-pointer">
      <div className="flex-1">
        <div className="w-full flex gap-3">
          <div className="relative">
            <img
              src="/Product image (1).png"
              alt="asset"
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          <div className="flex-1 flex-col flex">
            <p className="line-clamp-1 text-foreground-primary font-medium text-body">
              Gucci Store
            </p>
            <p className="text-foreground-secondary text-body-sm font-normal line-clamp-1">
              Message Preview
            </p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-foreground-muted text-caption">4m ago</p>
      </div>
    </div>
  );
}
