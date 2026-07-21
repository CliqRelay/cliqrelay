import { useCallback, useEffect, useRef, useState } from "react";

import { Code, File, Loader2 } from "lucide-react";

import { api, type ExportGuideFormat } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import ProBadge from "@/components/shared/ProBadge";
import SoonBadge from "@/components/shared/ComingSoonBadge";
import { toast } from "@/hooks/use-toast";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 60_000;

const formats = [
	{
		id: "pdf",
		name: "PDF",
		icon: File,
		disabled: false,
		tag: null,
	},
	{
		id: "json",
		name: "JSON",
		icon: Code,
		disabled: true,
		tag: "Soon" as const,
	},
] as const;

type Props = {
	guideId: string;
	guideTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ExportDialog({
	guideId,
	guideTitle,
	open,
	onOpenChange,
}: Props) {
	const [selectedFormat, setSelectedFormat] =
		useState<ExportGuideFormat>("pdf");
	const [exportId, setExportId] = useState<string | null>(null);
	const startTimeRef = useRef<number>(0);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimeoutRef = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	const exportMutation = api.guides.useExportGuide({
		mutation: {
			onSuccess: (data) => {
				setExportId(data.exportId);
				startTimeRef.current = Date.now();
			},
			onError: (error) => {
				toast({
					title: "Export failed",
					description:
						error instanceof Error ? error.message : "Failed to start export",
					variant: "destructive",
				});
			},
		},
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	const statusQuery = api.guides.useGetExportStatus(exportId ?? "", {
		query: {
			enabled: !!exportId,
			refetchInterval: POLL_INTERVAL,
		},
		request: {
			credentials: "include",
		},
	});

	const resetExport = useCallback(() => {
		setExportId(null);
		clearTimeoutRef();
	}, [clearTimeoutRef]);

	useEffect(() => {
		if (!exportId) {
			return;
		}

		const elapsed = Date.now() - startTimeRef.current;
		if (elapsed >= MAX_POLL_TIME && statusQuery.isFetched) {
			resetExport();
			toast({
				title: "Export timed out",
				description: "The export took too long. Please try again.",
				variant: "destructive",
			});
			return;
		}

		const result = statusQuery.data?.export;
		if (!result) {
			return;
		}

		if (result.status === "completed") {
			resetExport();
			if (result.downloadUrl) {
				window.open(result.downloadUrl, "_blank");
			}
			toast({
				title: "Export ready",
				description: `${selectedFormat.toUpperCase()} export completed successfully`,
			});
			onOpenChange(false);
		} else if (result.status === "failed") {
			resetExport();
			toast({
				title: "Export failed",
				description: result.errorMessage ?? "An error occurred during export",
				variant: "destructive",
			});
		}
	}, [
		exportId,
		statusQuery.data,
		statusQuery.isFetched,
		resetExport,
		selectedFormat,
		onOpenChange,
	]);

	useEffect(() => {
		if (!open) {
			resetExport();
			setSelectedFormat("pdf");
			exportMutation.reset();
		}

		return () => resetExport();
	}, [open, resetExport, exportMutation.reset]);

	const handleExport = () => {
		if (!guideId) return;
		exportMutation.mutate({ id: guideId, data: { format: selectedFormat } });
	};

	const currentStatus = statusQuery.data?.export?.status;
	const isExporting = exportMutation.isPending || !!exportId;
	const isProcessing = currentStatus === "processing";
	const isPending = currentStatus === "pending";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Export Guide</DialogTitle>
					<DialogDescription>
						Choose a format to export &ldquo;{guideTitle}&rdquo;
					</DialogDescription>
				</DialogHeader>
				{isExporting ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<p className="text-sm text-muted-foreground">
							{isPending ? "Starting export..." : "Generating PDF..."}
						</p>
					</div>
				) : (
					<div className="grid gap-3 py-4">
						{formats.map((format) => (
							<Button
								key={format.id}
								variant="outline"
								onClick={() => !format.disabled && setSelectedFormat(format.id)}
								disabled={format.disabled}
								className={`flex items-start gap-3 rounded-lg border p-3 text-left h-auto w-full justify-start ${
									selectedFormat === format.id
										? "border-primary bg-primary/5"
										: "hover:bg-muted"
								} ${format.disabled ? "cursor-not-allowed opacity-50" : ""}`}
							>
								<format.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
								<div className="flex w-full items-start justify-between">
									<div>
										<div className="font-medium">{format.name}</div>
									</div>
								</div>
							</Button>
						))}
					</div>
				)}
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						{isExporting ? "Exporting..." : "Cancel"}
					</Button>
					<Button
						onClick={handleExport}
						disabled={isExporting || !guideId || selectedFormat !== "pdf"}
					>
						{isExporting
							? isProcessing
								? "Generating PDF..."
								: "Starting..."
							: `Download ${selectedFormat.toUpperCase()}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
