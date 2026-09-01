/* eslint-disable @next/next/no-img-element */
export default function Assets() {
  return (
    <div className="w-full items-center gap-3 flex cursor-pointer">
      <div className="flex-1">
        <div className="w-full gap-2 flex">
          <div className="relative">
            <img
              src="/Product image (1).png"
              alt="asset"
              className="w-10 h-10 rounded-field object-cover"
            />
            <div className="w-[10px] h-[10px] rounded-full bg-brand absolute bottom-0 right-0 border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <p className="line-clamp-2 text-ink-90 font-medium text-body-sm">
              Flash Sale! 20% off on your favorite sneakers for 2 hrs only.
            </p>
            <p className="text-ink-60 text-caption">Yesterday</p>
          </div>
        </div>
      </div>
      <div className="items-center justify-center flex">
        <p className="text-brandDeep text-body-sm font-medium whitespace-nowrap">
          View details
        </p>
      </div>
    </div>
  );
}
