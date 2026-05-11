import { TranslatorApp } from "@/components/translator/translator-app";
import { auth, authEnabled } from "@/lib/auth";

export default async function Home() {
  const session = authEnabled ? await auth() : null;
  return (
    <TranslatorApp
      session={{
        enabled: authEnabled,
        user: session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }
          : null,
      }}
    />
  );
}
