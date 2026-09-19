import type { ReactNode } from "react";

import { InfoIcon, Quote, TriangleAlertIcon } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const iconMap = {
  tip: InfoIcon,
  callout: Quote,
  alert: TriangleAlertIcon,
} as const;

const backgroundClassNameMap = {
  tip: "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  callout: "border-l-4 border-gray-500 bg-gray-50 dark:bg-gray-950/30",
  alert: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30",
} as const;

const foregroundClassNameMap = {
  tip: "text-blue-700 dark:text-blue-300",
  callout: "text-gray-700 dark:text-gray-300",
  alert: "text-red-700 dark:text-red-300",
} as const;

type CanvasAlertType = keyof typeof iconMap;

export function canvasForegroundClassName(type: string) {
  return foregroundClassNameMap[type as CanvasAlertType] ?? "";
}

type Props = {
  type: string;
  toolbar?: ReactNode;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
};

export function CanvasStepShell({ type, toolbar, className, onClick, children }: Props) {
  const Icon = iconMap[type as CanvasAlertType] ?? InfoIcon;
  const backgroundClassName = backgroundClassNameMap[type as CanvasAlertType] ?? "";

  return (
    <Alert
      variant={type === "alert" ? "destructive" : "default"}
      className={cn(
        "group relative flex flex-row items-start gap-4",
        backgroundClassName,
        className,
      )}
      onClick={onClick}
    >
      {toolbar}
      <span className="mt-0.5 block shrink-0">
        <Icon size={30} className={canvasForegroundClassName(type)} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </Alert>
  );
}
