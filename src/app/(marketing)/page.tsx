import { auth, authEnabled } from "@/lib/auth";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { Preview } from "@/components/landing/preview";
import { Closing } from "@/components/landing/closing";

export default async function LandingPage() {
  const session = authEnabled ? await auth() : null;
  const sessionInfo = {
    enabled: authEnabled,
    user: session?.user
      ? {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      : null,
  };

  return (
    <>
      <MarketingHeader session={sessionInfo} />
      <Hero authEnabled={authEnabled} />
      <Preview />
      <Closing authEnabled={authEnabled} />
    </>
  );
}
