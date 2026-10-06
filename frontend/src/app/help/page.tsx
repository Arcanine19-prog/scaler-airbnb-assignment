import { LifeBuoy } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Help Centre · Airbnb clone" };

export default function HelpPage() {
  return (
    <ComingSoon title="Help Centre" icon={<LifeBuoy className="h-9 w-9" strokeWidth={1.5} />}>
      Support articles, identity verification and account settings aren&apos;t part of this demo yet.
    </ComingSoon>
  );
}
