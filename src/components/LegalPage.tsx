// Shared chalkboard renderer for the Privacy Policy and Terms pages.
import { Link } from "@tanstack/react-router";
import { ChalkFilters, DustParticles, Fireflies, GlassOrbs, Scribble } from "@/components/ChalkFX";
import { ArrowDoodle } from "@/components/ChalkIcons";
import type { LegalDoc } from "@/lib/legal";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={12} />
      <GlassOrbs count={4} />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="press inline-flex items-center gap-2 font-hand text-base text-chalk-dim hover:text-chalk"
        >
          <ArrowDoodle size={18} className="rotate-180" /> back to the board
        </Link>

        <h1 className="mt-6 font-sketch text-4xl leading-tight chalk-text chalk-glow md:text-6xl">
          {doc.title.toLowerCase()}
        </h1>
        <Scribble className="mt-2 w-56 text-chalk/60" />
        <p className="mt-3 font-hand text-base text-chalk-faint">{doc.effective}</p>

        <div className="liquid-glass mt-6 space-y-3 p-4 sm:p-6 md:p-8">
          {doc.intro.map((p) => (
            <p key={p} className="font-hand text-base leading-relaxed text-chalk-dim">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-8 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading} className="liquid-glass p-4 sm:p-6 md:p-8">
              {section.heading && (
                <h2 className="font-sketch text-2xl chalk-text chalk-glow">{section.heading}</h2>
              )}
              <div className="mt-4 space-y-3">
                {section.body.map((line, i) =>
                  line.startsWith("- ") ? (
                    <div key={`${line}-${i}`} className="flex gap-3 font-hand text-base leading-relaxed text-chalk-dim">
                      <span className="text-chalk">·</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  ) : (
                    <p key={`${line}-${i}`} className="font-hand text-base leading-relaxed text-chalk-dim">
                      {line}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 space-y-1 text-center">
          {doc.outro.map((line) => (
            <p key={line} className="font-sketch text-xl chalk-text">
              {line}
            </p>
          ))}
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
}
