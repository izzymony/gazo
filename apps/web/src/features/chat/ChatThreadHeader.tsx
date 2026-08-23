import IconButton from "@vibaar/ui/common/IconButton";
import { ArrowLeft, MoreVertical } from "@vibaar/ui/icons";
import { getMobileCompatibleImageUrl } from "@/lib/utils";
import { ChatParticipant } from "@/store/chatStore";

/* eslint-disable @next/next/no-img-element */
/**
 * Self-positioning chat header for PageShell's `header` slot. It MUST carry the
 * same `absolute lg:sticky top-0 z-sticky` wrapper as the shared Header — the
 * shell offsets content by mt-16 expecting the header to position itself, so a
 * plain (non-positioned) node collides with that offset.
 */
export default function ChatThreadHeader({
  participant,
  onBack,
}: {
  participant: ChatParticipant;
  onBack: () => void;
}) {
  return (
    <div className="absolute lg:sticky lg:top-0 bg-white w-full flex flex-col z-sticky">
      <div className="w-full lg:max-w-5xl lg:mx-auto pt-3 pb-0 px-4 lg:px-5">
        <div className="flex flex-row items-center gap-2 bg-white h-[36px]">
          <IconButton
            icon={ArrowLeft}
            label="Back"
            size="sm"
            className="-ml-2"
            onClick={onBack}
          />
          <img
            src={
              participant.avatar
                ? getMobileCompatibleImageUrl(participant.avatar)
                : "/Product image (1).png"
            }
            alt={participant.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <p className="font-medium text-body-lg text-ink-90 flex-1 min-w-0 truncate">
            {participant.name || "Vibaar user"}
          </p>
          <IconButton icon={MoreVertical} label="Options" size="sm" />
        </div>
      </div>
    </div>
  );
}
