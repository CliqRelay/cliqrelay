import { CircleCheck, CircleAlert, TriangleAlert } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { cn } from "@/lib/utils";

interface ToastComponentProps {
	id: string | number;
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "default" | "destructive" | "success" | "error";
}

function ToastComponent({
	id: _id,
	title,
	description,
	variant = "default",
}: ToastComponentProps) {
	const isDestructive = variant === "destructive" || variant === "error";
	const isSuccess = variant === "success";

	const Icon = isDestructive
		? TriangleAlert
		: isSuccess
			? CircleCheck
			: CircleAlert;

	const iconColor = isDestructive
		? "text-destructive"
		: isSuccess
			? "text-brand"
			: "text-muted-foreground";

	return (
		<div
			className={`
        flex flex-col gap-1 w-full min-w-72 md:max-w-91 p-4 rounded-[--radius] shadow-lg border backdrop-blur-[2px] transition-all
        ${
					isDestructive
						? "bg-background/95 border-destructive/40 text-foreground"
						: isSuccess
							? "bg-background/95 border-[--color-brand] text-foreground"
							: "bg-background/95 border-border text-foreground"
				}
      `}
		>
			{title && (
				<h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight font-sans">
					<Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
					{title}
				</h4>
			)}
			{description && (
				<p className="text-xs font-normal font-sans leading-relaxed text-muted-foreground">
					{description}
				</p>
			)}
		</div>
	);
}

interface ToastOptions {
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "default" | "destructive" | "success" | "error";
}

const customToast = (
	titleOrOptions: React.ReactNode | ToastOptions,
	options?: ToastOptions,
) => {
	if (
		titleOrOptions &&
		typeof titleOrOptions === "object" &&
		"title" in titleOrOptions
	) {
		const config = titleOrOptions as ToastOptions;
		return sonnerToast.custom((id) => (
			<ToastComponent
				id={id}
				title={config.title}
				description={config.description}
				variant={config.variant || "default"}
			/>
		));
	}

	return sonnerToast.custom((id) => (
		<ToastComponent
			id={id}
			title={titleOrOptions as React.ReactNode}
			description={options?.description}
			variant="default"
		/>
	));
};

customToast.success = (title: React.ReactNode, options?: ToastOptions) => {
	return sonnerToast.custom((id) => (
		<ToastComponent
			id={id}
			title={title}
			description={options?.description}
			variant="success"
		/>
	));
};

customToast.error = (title: React.ReactNode, options?: ToastOptions) => {
	return sonnerToast.custom((id) => (
		<ToastComponent
			id={id}
			title={title}
			description={options?.description}
			variant="error"
		/>
	));
};

customToast.dismiss = sonnerToast.dismiss;
customToast.loading = sonnerToast.loading;
customToast.promise = sonnerToast.promise;

function useToast() {
	return {
		toast: customToast,
	};
}

export { customToast as toast, useToast };
