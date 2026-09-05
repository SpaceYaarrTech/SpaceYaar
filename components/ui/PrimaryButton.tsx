import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

type PrimaryButtonProps = Omit<HTMLMotionProps<"button">, "children"> & { children: ReactNode };

export function PrimaryButton({ children, className = "", ...props }: PrimaryButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`focus-ring inline-flex min-h-14 items-center justify-center rounded-[14px] bg-[#e53935] px-7 text-sm font-bold text-white shadow-[0_8px_22px_rgba(229,57,53,.18)] transition-colors hover:bg-[#bd2d2a] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}