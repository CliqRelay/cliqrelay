import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Upload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UploadQueueInfo } from "@/models";

type Props = {
	uploadQueue: UploadQueueInfo;
};

export function UploadStatusBadges({ uploadQueue }: Props) {
	const hasUploads =
		uploadQueue.inProgress > 0 ||
		uploadQueue.pending > 0 ||
		uploadQueue.failed > 0 ||
		uploadQueue.completed > 0;

	if (!hasUploads) return null;

	return (
		<div className="flex shrink-0 flex-wrap items-center gap-1.5">
			<span className="text-[10px] font-medium text-muted-foreground/60 mr-0.5">
				Uploads
			</span>
			<AnimatePresence>
				{uploadQueue.inProgress > 0 && (
					<motion.div
						key="inProgress"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
					>
						<Badge
							variant="secondary"
							className="h-5 gap-1 px-1.5 text-[10px] font-normal"
						>
							<Upload className="size-3" />
							{uploadQueue.inProgress}
						</Badge>
					</motion.div>
				)}
				{uploadQueue.pending > 0 && (
					<motion.div
						key="pending"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
					>
						<Badge
							variant="outline"
							className="h-5 gap-1 px-1.5 text-[10px] font-normal"
						>
							<Clock className="size-3" />
							{uploadQueue.pending}
						</Badge>
					</motion.div>
				)}
				{uploadQueue.failed > 0 && (
					<motion.div
						key="failed"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
					>
						<Badge
							variant="destructive"
							className="h-5 gap-1 px-1.5 text-[10px] font-normal"
						>
							<XCircle className="size-3" />
							{uploadQueue.failed}
						</Badge>
					</motion.div>
				)}
				{uploadQueue.completed > 0 && (
					<motion.div
						key="completed"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
					>
						<Badge
							variant="secondary"
							className="h-5 gap-1 px-1.5 text-[10px] font-normal text-green-600"
						>
							<CheckCircle2 className="size-3" />
							{uploadQueue.completed}
						</Badge>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
