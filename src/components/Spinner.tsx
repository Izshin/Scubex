import { motion } from 'framer-motion';

interface SpinnerProps {
  /** Tailwind size classes, e.g. "w-4 h-4". Default: "w-5 h-5" */
  size?: string;
  /** Tailwind border color classes. Default: cyan theme */
  color?: string;
}

/**
 * Simple rotating spinner using Framer Motion.
 */
export default function Spinner({
  size = 'w-5 h-5',
  color = 'border-cyan-300 border-t-cyan-600',
}: SpinnerProps) {
  return (
    <motion.div
      className={`rounded-full border-2 ${size} ${color}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}
