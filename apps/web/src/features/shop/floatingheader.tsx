export default function FloatingHeader({
  show,
  setShow,
}: {
  show: string;
  setShow: (val: string) => void;
}) {
  return (
    <div className="w-full flex justify-center items-center gap-5 absolute right-0 left-0 z-[999999999999999999px]">
      <div
        onClick={() => setShow("Spotlights")}
        className={
          show === "Spotlights"
            ? "px-1 pt-4 pb-2 border-b-2 border-b-black text-black text-center justify-center items-center"
            : "px-1 pt-4 pb-2 hover:border-b-2 hover:border-b-black text-gray-300 hover:text-black text-center justify-center items-center"
        }>
        Spotlights
      </div>
      <div
        onClick={() => setShow("Shop")}
        className={
          show === "Shop"
            ? "px-1 pt-4 pb-2 border-b-2 border-b-black text-black text-center justify-center items-center"
            : "px-1 pt-4 pb-2 hover:border-b-2 hover:border-b-black text-gray-300 hover:text-black text-center justify-center items-center"
        }>
        Shop
      </div>
    </div>
  );
}

export function SegmentedTabs({
  show,
  setShow,
  data,
}: {
  show: string;
  setShow: (val: string) => void;
  data: string[];
}) {
  return (
    <div className="w-full flex justify-center items-center gap-5">
      {data.map((its) => (
        <div
          key={its}
          onClick={() => setShow(its)}
          className={
            show === its
              ? "px-1 pt-4 pb-3 flex-1 border-b-2 border-b-black text-black text-center justify-center items-center"
              : "px-1 pt-4 pb-3 flex-1 text-gray-300 text-center justify-center items-center"
          }>
          {its}
        </div>
      ))}
    </div>
  );
}
