import Image from "next/image";
import { JOURNAL_ENTRIES } from "@/lib/mock-data";

export const metadata = { title: "Journal — TEST" };

export default function JournalPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-12 w-full">
      {/* Header */}
      <div className="mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary] mb-4">
          Editorial
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl font-light text-[--text-primary] tracking-wide">
          Journal
        </h1>
      </div>

      {/* Entries */}
      <div className="divide-y divide-[--border]">
        {JOURNAL_ENTRIES.map((entry) => (
          <article key={entry.id} className="py-14 group">
            {/* Date + category */}
            <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[--text-primary] tracking-wider mb-5">
              {entry.date}
            </p>

            {/* Image */}
            <div className="relative aspect-[16/7] bg-[--bg-secondary] mb-8 overflow-hidden">
              <Image src={entry.image} alt={entry.title} fill className="object-cover" sizes="(max-width:768px) 100vw,768px" />
            </div>

            {/* Title */}
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl font-light text-[--text-primary] tracking-wide leading-tight mb-5 group-hover:text-[--gold] transition-colors duration-200">
              {entry.title}
            </h2>

            {/* Excerpt */}
            <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[--text-primary] leading-relaxed max-w-xl mb-8">
              {entry.excerpt}
            </p>

            {/* CTA */}
            <span className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary] border-b border-[--text-primary] pb-px cursor-pointer hover:text-[--gold] hover:border-[--gold] transition-colors duration-200">
              Read Essay →
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
