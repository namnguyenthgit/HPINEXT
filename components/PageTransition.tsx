// components/TransitionProvider.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    window.addEventListener("beforeunload", handleStart);
    window.addEventListener("load", handleComplete);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      window.removeEventListener("load", handleComplete);
    };
  }, []);

  return (
    <>
      {/* Cool Loading Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{
              scaleX: 1,
              transition: {
                duration: 1.5,
                ease: "easeInOut",
              },
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.3 },
            }}
            style={{ transformOrigin: "0%" }}
          />
        )}
      </AnimatePresence>

      {/* Page Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ x: 300, opacity: 0 }}
          animate={{
            x: 0,
            opacity: 1,
            transition: {
              type: "spring",
              stiffness: 260,
              damping: 20,
            },
          }}
          exit={{
            x: -300,
            opacity: 0,
            transition: {
              duration: 0.3,
            },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
