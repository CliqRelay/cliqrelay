import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
	visible: boolean;
	onClick: () => void;
};

export function StepListJumpToLatest({ visible, onClick }: Props) {
	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.15 }}
					className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center"
				>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						className="pointer-events-auto rounded-full shadow-md ring-1 ring-foreground/10"
						onClick={onClick}
					>
						<ChevronDown className="size-3.5" />
						Jump to latest
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
