import { AnimatePresence, motion } from "framer-motion";
import { CircleDot, Loader2, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RecordingStatus, UploadQueueInfo } from "@/models";

type Props = {
	status: RecordingStatus | undefined;
	onStart: () => Promise<void>;
	onStop: () => Promise<void>;
	isPending: boolean;
	uploadQueue?: UploadQueueInfo;
};

export function AnimatedRecordingButton({
	status,
	onStart,
	onStop,
	isPending,
	uploadQueue,
}: Props) {
	const isRecording = status === "recording";
	const isPaused = status === "paused";
	const isIdle = !status || status === "idle";
	const isStopped = status === "stopped";
	const isActive = isRecording || isPaused;

	const activeJobs =
		(uploadQueue?.inProgress ?? 0) + (uploadQueue?.pending ?? 0);

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
					"relative size-20 rounded-full shadow-md flex items-center justify-center transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					isRecording &&
						"bg-destructive shadow-lg shadow-destructive/30 ring-4 ring-destructive/10",
					isPaused &&
						"bg-amber-500 shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/10",
					(isIdle || isStopped) &&
						"bg-primary shadow-lg shadow-primary/25 ring-4 ring-primary/10",
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
							<Loader2 className="size-6 text-white animate-spin" />
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

			<AnimatePresence>
				{isActive && activeJobs > 0 && (
					<motion.span
						key="jobs-badge"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
						transition={{
							type: "spring",
							stiffness: 500,
							damping: 25,
						}}
						className="absolute -top-1 -right-1 size-5 rounded-full bg-amber-500 flex items-center justify-center"
					>
						<Loader2 className="size-3 text-white animate-spin" />
					</motion.span>
				)}
			</AnimatePresence>
		</div>
	);
}
