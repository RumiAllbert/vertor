/**
 * Marketing layout — wraps Hero / Showcase / Closing.
 *
 * The inline <script> below runs synchronously while the HTML is parsing,
 * before the browser paints anything. It adds the `vertor-intro` class to
 * <html> unless the user prefers reduced motion, which scopes the intro
 * animations in globals.css. The class is removed on next page load
 * automatically (it's never persisted), so the intro plays every time the
 * user lands on / — which is what we want; the cascade is part of the
 * brand experience.
 *
 * No-JS users never see the class added, so the hero composes immediately
 * at full opacity — progressive enhancement intact.
 */
const INTRO_BOOT = `(function(){try{var r=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!r){document.documentElement.classList.add('vertor-intro');}}catch(e){}})();`;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-background text-foreground">
      <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      {children}
    </div>
  );
}
