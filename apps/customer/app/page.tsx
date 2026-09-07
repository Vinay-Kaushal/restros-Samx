import { redirect } from "next/navigation";

// A bare domain visit has no restaurant/table context to show a menu for -
// in real usage nobody ever lands here anyway, since a QR code encodes the
// full /r/[slug] URL directly. This redirect just makes local testing (and
// a single-restaurant deployment where the whole domain IS one restaurant)
// go straight to the actual page instead of showing a dead placeholder screen.
export default function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";
  redirect(`/r/${slug}`);
}
