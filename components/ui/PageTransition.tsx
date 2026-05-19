"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
