import { AnimatePresence, motion } from "framer-motion";
import { CircleDot, Loader2, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/models";

type Props = {
  status: RecordingStatus | undefined;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  isPending: boolean;
};

export function AnimatedRecordingButton({ status, onStart, onStop, isPending }: Props) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isIdle = !status || status === "idle";
  const isStopped = status === "stopped";
  const isActive = isRecording || isPaused;

  const handleClick = () => {
    if (isPending) return;
    if (isIdle || isStopped) {
      onStart();
    } else {
      onStop();
    }
  };

  return (
    <div className="relative inline-flex">
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="recording-ring"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 rounded-full bg-destructive/20"
          />
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleClick}
        className={cn(
          "relative flex size-20 items-center justify-center rounded-full shadow-md transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          isRecording &&
            "bg-destructive shadow-lg ring-4 shadow-destructive/30 ring-destructive/10",
          isPaused && "bg-amber-500 shadow-lg ring-4 shadow-amber-500/20 ring-amber-500/10",
          (isIdle || isStopped) && "bg-primary shadow-lg ring-4 shadow-primary/25 ring-primary/10",
        )}
        animate={{
          boxShadow: isRecording
            ? "0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 0 0 4px rgba(239, 68, 68, 0.1)"
            : isPaused
              ? "0 10px 25px -5px rgba(245, 158, 11, 0.2), 0 0 0 4px rgba(245, 158, 11, 0.1)"
              : "0 10px 25px -5px rgba(59, 130, 246, 0.25), 0 0 0 4px rgba(59, 130, 246, 0.1)",
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {isPending ? (
            <motion.div
              key="spinner"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="size-6 animate-spin text-white" />
            </motion.div>
          ) : isActive ? (
            <motion.div
              key="square"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <Square className="size-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="camera"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <CircleDot className="size-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
