import type {
	StepCanvasType,
} from "@repo/api-client";

export type StepTypeOption = "step" | StepCanvasType;

export type StepTypeConfig = {
	type: "interaction" | "canvas";
	canvasType?: StepCanvasType;
};

export const STEP_TYPE_CONFIG: Record<StepTypeOption, StepTypeConfig> = {
	step: { type: "interaction" },
	header: { type: "canvas", canvasType: "header" },
	tip: { type: "canvas", canvasType: "tip" },
	callout: { type: "canvas", canvasType: "callout" },
	alert: { type: "canvas", canvasType: "alert" },
};
