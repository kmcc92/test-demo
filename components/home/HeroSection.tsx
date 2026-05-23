"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import GoldButton from "@/components/ui/GoldButton";

export default function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-8 overflow-hidden">
      {/* Wordmark */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <div className="relative overflow-hidden">
          <h1 className="font-[family-name:var(--font-cormorant)] text-[18vw] md:text-[14vw] lg:text-[12vw] font-light leading-none tracking-[0.4em] text-[var(--text-primary)] select-none">
            TEST
          </h1>

          {/* Gold shimmer sweep — fires on every mount */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              initial={{ x: "-110%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 3, ease: "linear", delay: 0.4 }}
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(232,201,106,0.55) 45%, rgba(255,245,180,0.7) 50%, rgba(232,201,106,0.55) 55%, transparent 100%)",
                width: "60%",
              }}
            />
          )}
        </div>

        <motion.p
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-6 text-[10px] md:text-xs tracking-[0.35em] uppercase text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]"
        >
          Every piece authenticated
        </motion.p>
      </motion.div>

      {/* CTA cards */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 20 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
        className="mt-16 flex flex-col sm:flex-row items-center gap-4"
      >
        <Link href="/shop">
          <GoldButton variant="outline" size="lg">
            Shop Collection
          </GoldButton>
        </Link>
        <Link href="/exclusive">
          <GoldButton variant="primary" size="lg">
            Exclusive
          </GoldButton>
        </Link>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-10 flex flex-col items-center gap-2"
      >
        <div className="w-px h-8 bg-[var(--border)] relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 right-0 h-full bg-[var(--gold)]"
            animate={{ y: ["0%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeIn" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
