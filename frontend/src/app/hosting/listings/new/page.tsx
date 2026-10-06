import { EMPTY_LISTING, ListingWizard } from "@/components/hosting/ListingWizard";

export const metadata = { title: "Airbnb your home · Airbnb clone" };

export default function NewListingPage() {
  return <ListingWizard initial={EMPTY_LISTING} />;
}
