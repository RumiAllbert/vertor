/**
 * Marketing layout — wraps Hero / Showcase / Closing.
 *
 * The inline <script> below runs synchronously while the HTML is parsing,
 * before the browser paints anything. It decides whether to play the
 * landing-page intro (aurora-only opening + cascade) by checking:
 *   • prefers-reduced-motion (skip)
 *   • sessionStorage flag "vertor.intro.shown" (already seen → skip)
 *
 * When the intro should play, it adds the `vertor-intro` class to <html>,
 * which scopes the intro animations in globals.css. When it shouldn't, the
 * class is absent and the hero composes immediately at full opacity (no JS,
 * no flicker, works for SSR/no-JS too).
 *
 * Setting the sessionStorage flag here (rather than after the intro ends)
 * means a mid-intro reload won't replay — that's the desired behavior.
 */
const INTRO_BOOT = `(function(){try{var r=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;var s=sessionStorage.getItem('vertor.intro.shown')==='1';if(!r&&!s){document.documentElement.classList.add('vertor-intro');sessionStorage.setItem('vertor.intro.shown','1');}}catch(e){}})();`;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-background text-foreground">
      <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      {children}
    </div>
  );
}
