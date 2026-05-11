import Image from "next/image";

export function Preview() {
  return (
    <section id="preview" className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
        <div className="overflow-hidden rounded-md border border-hairline shadow-[0_24px_60px_-30px_rgb(0_0_0/0.25)]">
          <Image
            src="/landing/preview.png"
            alt="Vertor app preview — translating a French paragraph into English"
            width={1440}
            height={900}
            className="block w-full dark:hidden"
            priority
          />
          <Image
            src="/landing/preview-dark.png"
            alt="Vertor app preview — translating a French paragraph into English"
            width={1440}
            height={900}
            className="hidden w-full dark:block"
            priority
          />
        </div>

        <aside className="flex flex-col justify-center gap-10 text-[14px] leading-snug">
          <p className="display italic">
            <span className="text-ink">—</span> Stream translations from any major model.
          </p>
          <p className="display italic">
            <span className="text-ink">—</span> Click any word for three alternatives. Refine without leaving the page.
          </p>
          <p className="display italic">
            <span className="text-ink">—</span> Export to Word, PDF, LaTeX, Markdown.
          </p>
        </aside>
      </div>
    </section>
  );
}
