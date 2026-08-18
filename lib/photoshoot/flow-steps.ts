"use client";

import type { CreateFlowStep, PhotoshootStep } from "@/types";

const FLOW_TO_STEP: Record<CreateFlowStep, PhotoshootStep> = {
  entry: "upload",
  upload: "upload",
  details: "details",
  preparation: "preparation",
  ready: "model",
  model: "model",
  pose: "pose",
  style: "style",
  background: "background",
  generate: "generate",
};

export function flowStepToPhotoshootStep(flowStep: CreateFlowStep): PhotoshootStep {
  return FLOW_TO_STEP[flowStep];
}

export function getBackStep(current: CreateFlowStep): CreateFlowStep | null {
  const order: CreateFlowStep[] = [
    "entry",
    "upload",
    "details",
    "preparation",
    "ready",
    "model",
    "pose",
    "style",
    "background",
    "generate",
  ];
  const idx = order.indexOf(current);
  if (idx <= 0) return null;
  return order[idx - 1];
}

export function getForwardStep(current: CreateFlowStep): CreateFlowStep | null {
  const order: CreateFlowStep[] = [
    "entry",
    "upload",
    "details",
    "preparation",
    "ready",
    "model",
    "pose",
    "style",
    "background",
    "generate",
  ];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}
