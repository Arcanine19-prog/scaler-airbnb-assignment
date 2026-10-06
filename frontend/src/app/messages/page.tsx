import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Messages · Airbnb clone" };

export default function MessagesPage() {
  return (
    <ComingSoon title="Messages" icon={<MessageSquare className="h-9 w-9" strokeWidth={1.5} />}>
      Chatting with hosts and guests will live here. For now, your reservation details are on the Trips page.
    </ComingSoon>
  );
}
