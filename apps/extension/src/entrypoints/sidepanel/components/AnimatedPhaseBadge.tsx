import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
	phase: string;
	error?: string;
};

export function AnimatedPhaseBadge({ phase, error }: Props) {
	const [showDot, setShowDot] = useState<boolean>(false);
	const [showCheck, setShowCheck] = useState<boolean>(true);

	useEffect(() => {
		if (phase === "completed") {
			setShowCheck(true);
			setShowDot(false);
			const timer = setTimeout(() => {
				setShowCheck(false);
				setShowDot(true);
			}, 1200);
			return () => clearTimeout(timer);
		}
		setShowCheck(false);
		setShowDot(false);
	}, [phase]);

	switch (phase) {
		case "persisting":
			return (
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge
							variant="secondary"
							className="h-4.5 gap-1 px-1.5 text-[9px] font-normal"
						>
							<Loader2 className="size-2.5 animate-spin" />
							Creating
						</Badge>
					</TooltipTrigger>
					<TooltipContent side="left" className="text-[11px]">
						Creating step...
					</TooltipContent>
				</Tooltip>
			);
		case "upload_init":
		case "uploading":
			return (
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge
							variant="secondary"
							className="h-4.5 gap-1 px-1.5 text-[9px] font-normal"
						>
							<Upload className="size-2.5 animate-pulse" />
							Uploading
						</Badge>
					</TooltipTrigger>
					<TooltipContent side="left" className="text-[11px]">
						Uploading screenshot...
					</TooltipContent>
				</Tooltip>
			);
		case "completing":
			return (
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge
							variant="secondary"
							className="h-4.5 gap-1 px-1.5 text-[9px] font-normal"
						>
							<Loader2 className="size-2.5 animate-spin" />
							Finalizing
						</Badge>
					</TooltipTrigger>
					<TooltipContent side="left" className="text-[11px]">
						Finalizing upload...
					</TooltipContent>
				</Tooltip>
			);
		case "completed":
			return (
				<AnimatePresence mode="wait">
					{showCheck ? (
						<motion.div
							key="check"
							initial={{ scale: 0 }}
							animate={{ scale: [1, 1.4, 1] }}
							transition={{ duration: 0.5, ease: "easeOut" }}
						>
							<Badge
								variant="secondary"
								className="h-4.5 gap-1 px-1.5 text-[9px] font-normal text-green-600"
							>
								<CheckCircle2 className="size-2.5" />
								Uploaded
							</Badge>
						</motion.div>
					) : showDot ? (
						<motion.div
							key="dot"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								type: "spring",
								stiffness: 500,
								damping: 25,
							}}
						>
							<span className="block size-1.5 rounded-full bg-green-500" />
						</motion.div>
					) : null}
				</AnimatePresence>
			);
		case "failed":
			return (
				<motion.div
					animate={{ x: [0, -4, 4, -4, 4, 0] }}
					transition={{ duration: 0.4 }}
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								variant="destructive"
								className="h-4.5 gap-1 px-1.5 text-[9px] font-normal"
							>
								<XCircle className="size-2.5" />
								Failed
							</Badge>
						</TooltipTrigger>
						{error && (
							<TooltipContent side="left" className="text-[11px] max-w-40">
								{error}
							</TooltipContent>
						)}
					</Tooltip>
				</motion.div>
			);
		default:
			return null;
	}
}
