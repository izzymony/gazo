/* eslint-disable @next/next/no-img-element */
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import { ArrowLeft, MoreVertical } from "@vibaar/ui/icons";
import { getMobileCompatibleImageUrl } from "@/lib/utils";
import { ChatParticipant } from "@/store/chatStore";

/**
 * Chat thread header = the shared `Header` preset for a conversation.
 *
 * It owns one decision — that a chat's title is a participant's avatar beside
 * their name — and nothing about chrome. It used to reimplement the header
 * outright, including a hand-copied positioning wrapper its own comment warned
 * "MUST" stay in step with the shared one. It existed only because the old
 * Header took `customText: string`, which cannot hold an avatar; now that the
 * title slot takes a node, there is nothing left to fork.
 */
export default function ChatThreadHeader({
  participant,
  onBack,
}: {
  participant: ChatParticipant;
  onBack: () => void;
}) {
  return (
    <Header
      // The chat back control is the small arrow, not the header default.
      leading={
        <IconButton
          icon={ArrowLeft}
          label="Back"
          size="sm"
          className="-ml-2"
          onClick={onBack}
        />
      }
      title={
        <span className="flex flex-1 min-w-0 items-center gap-2 ml-2">
          <img
            src={
              participant.avatar
                ? getMobileCompatibleImageUrl(participant.avatar)
                : "/Product image (1).png"
            }
            alt={participant.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <span className="font-medium text-body-lg text-foreground-primary flex-1 min-w-0 truncate">
            {participant.name || "Vibaar user"}
          </span>
        </span>
      }
      trailing={<IconButton icon={MoreVertical} label="Options" size="sm" />}
    />
  );
}
