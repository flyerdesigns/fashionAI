"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AspectRatio,
  BackgroundId,
  CameraStyleId,
  ClothingAsset,
  CreateFlowStep,
  FramingId,
  LightingId,
  PhotoshootConfiguration,
  ProductType,
  StyleId,
  UploadedFile,
} from "@/types";
import {
  DEFAULT_PHOTOSHOOT_CONFIG,
  toAIClothingReference,
} from "@/types";
import { UploadDropzone } from "@/components/photoshoot/UploadDropzone";
import { ProductTypeSelector } from "@/components/products/ProductTypeSelector";
import { StepIndicator } from "@/components/photoshoot/StepIndicator";
import { CreateFlowEntry } from "@/components/photoshoot/CreateFlowEntry";
import { ProductPicker } from "@/components/products/ProductPicker";
import {
  ClothingDetailsForm,
  type ClothingDetailsFormData,
  validateProductForm,
} from "@/components/products/ClothingDetailsForm";
import {
  AssetPreparationPanel,
  type PreparationPhase,
} from "@/components/photoshoot/AssetPreparationPanel";
import { ModelSelector } from "@/components/photoshoot/ModelSelector";
import { PoseSelector } from "@/components/photoshoot/PoseSelector";
import { StyleSelector } from "@/components/photoshoot/StyleSelector";
import {
  BackgroundSelector,
  LightingSelector,
  CameraSelector,
  FramingSelector,
  AspectRatioSelector,
} from "@/components/photoshoot/BackgroundSelector";
import { CustomPrompt } from "@/components/photoshoot/CustomPrompt";
import { GenerationPreview } from "@/components/photoshoot/GenerationPreview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createProduct } from "@/lib/products/client";
import type { ProductFormErrors } from "@/lib/validation/product-form";
import {
  getColorLabel,
  getGenderLabel,
  getProductTypeLabel,
} from "@/lib/mock/constants";
import {
  LIGHTING_PRESETS,
  CAMERA_STYLE_PRESETS,
  FRAMING_OPTIONS,
  ASPECT_RATIO_OPTIONS,
} from "@/lib/mock/background-presets";
import { flowStepToPhotoshootStep } from "@/lib/photoshoot/flow-steps";
import {
  validateModelStep,
  validatePoseStep,
  validateStyleStep,
  validateBackgroundStep,
} from "@/lib/photoshoot/validate-config";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CreatePhotoshootFormProps {
  initialProduct?: ClothingAsset | null;
  creditsAvailable?: number;
}

export function CreatePhotoshootForm({
  initialProduct = null,
  creditsAvailable = 0,
}: CreatePhotoshootFormProps) {
  const router = useRouter();

  const [flowStep, setFlowStep] = useState<CreateFlowStep>(
    initialProduct ? "ready" : "entry",
  );
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [details, setDetails] = useState<ClothingDetailsFormData>({
    productName: "",
    productType: "t-shirt",
    category: "t-shirt",
    gender: "unisex",
    color: "black",
    customColor: "",
    description: "",
    brandName: "",
  });
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [preparationPhase, setPreparationPhase] = useState<PreparationPhase>("validating");
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<ClothingAsset | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ClothingAsset | null>(initialProduct);
  const [photoshootConfig, setPhotoshootConfig] = useState<PhotoshootConfiguration>(
    DEFAULT_PHOTOSHOOT_CONFIG,
  );
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const activeProduct = selectedProduct ?? createdProduct;
  const currentPhotoshootStep = flowStepToPhotoshootStep(flowStep);

  const updateConfig = (partial: Partial<PhotoshootConfiguration>) => {
    setPhotoshootConfig((prev) => ({ ...prev, ...partial }));
    setStepErrors([]);
  };

  const handleUploadContinue = () => {
    if (!uploadedFile || !productType) return;
    setDetails((prev) => ({
      ...prev,
      productType,
      category: prev.category === prev.productType ? productType : prev.category,
    }));
    setFlowStep("details");
  };

  const handleDetailsContinue = () => {
    const { valid, errors } = validateProductForm(details);
    setFormErrors(errors);
    setShowFormErrors(true);
    if (!valid || !uploadedFile) return;
    setFlowStep("preparation");
    void runAssetPreparation(uploadedFile, details);
  };

  const runAssetPreparation = async (file: UploadedFile, formDetails: ClothingDetailsFormData) => {
    setPreparationPhase("validating");
    setPreparationError(null);
    try {
      await sleep(600);
      setPreparationPhase("preparing");
      await sleep(900);
      setPreparationPhase("saving");
      const product = await createProduct(file.file, formDetails);
      setCreatedProduct(product);
      setPreparationPhase("ready");
      setFlowStep("ready");
    } catch (err) {
      setPreparationPhase("error");
      setPreparationError(
        err instanceof Error ? err.message : "Unable to save product. Please try again.",
      );
    }
  };

  const handleSelectExistingProduct = (product: ClothingAsset) => {
    setSelectedProduct(product);
    setCreatedProduct(product);
    setShowProductPicker(false);
    setFlowStep("ready");
    router.replace(`/create?productId=${product.id}`);
  };

  const goToModel = () => setFlowStep("model");

  const continueFromModel = () => {
    const { valid, errors } = validateModelStep(photoshootConfig);
    if (!valid) {
      setStepErrors(errors.map((e) => e.message));
      return;
    }
    setFlowStep("pose");
  };

  const continueFromPose = () => {
    const { valid, errors } = validatePoseStep(photoshootConfig);
    if (!valid) {
      setStepErrors(errors.map((e) => e.message));
      return;
    }
    setFlowStep("style");
  };

  const continueFromStyle = () => {
    const { valid, errors } = validateStyleStep(photoshootConfig);
    if (!valid) {
      setStepErrors(errors.map((e) => e.message));
      return;
    }
    setFlowStep("background");
  };

  const continueFromBackground = () => {
    const { valid, errors } = validateBackgroundStep(photoshootConfig);
    if (!valid) {
      setStepErrors(errors.map((e) => e.message));
      return;
    }
    setFlowStep("generate");
  };

  const showStepIndicator = !["entry"].includes(flowStep);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {showStepIndicator && (
        <StepIndicator currentStep={currentPhotoshootStep} />
      )}

      {flowStep === "entry" && (
        <CreateFlowEntry
          onUploadNew={() => setFlowStep("upload")}
          onChooseExisting={() => setShowProductPicker(true)}
        />
      )}

      {showProductPicker && flowStep === "entry" && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-medium text-stone-900">Choose a product</h2>
          <p className="mt-1 text-sm text-stone-500">
            Select clothing from your library to use in this photoshoot.
          </p>
          <div className="mt-6">
            <ProductPicker
              onSelect={handleSelectExistingProduct}
              onCancel={() => setShowProductPicker(false)}
            />
          </div>
        </section>
      )}

      {flowStep === "upload" && (
        <StepSection title="Step 1 — Upload Clothing" subtitle="Upload a clear photo of your garment." badge="Active">
          <UploadDropzone file={uploadedFile} onFileSelect={setUploadedFile} />
          <ProductTypeSelector value={productType} onChange={setProductType} />
          <StepActions onBack={() => setFlowStep("entry")} onContinue={handleUploadContinue} continueDisabled={!uploadedFile || !productType} continueLabel="Continue to Details" />
        </StepSection>
      )}

      {flowStep === "details" && uploadedFile && (
        <StepSection title="Step 2 — Clothing Details" subtitle="Tell us about your garment." badge="Active">
          <ProductPreviewStrip imageUrl={uploadedFile.previewUrl} name={uploadedFile.name} typeLabel={getProductTypeLabel(productType ?? details.productType)} />
          <ClothingDetailsForm initialData={{ ...details, productType: productType ?? details.productType }} onChange={setDetails} errors={formErrors} showErrors={showFormErrors} />
          <StepActions onBack={() => setFlowStep("upload")} onContinue={handleDetailsContinue} continueLabel="Continue to Preparation" />
        </StepSection>
      )}

      {flowStep === "preparation" && uploadedFile && (
        <StepSection title="Step 3 — Image Preparation" subtitle="Standardizing your clothing image. Not AI analysis." badge="Processing">
          <AssetPreparationPanel file={uploadedFile} details={details} phase={preparationPhase} error={preparationError} />
          {preparationPhase === "error" && (
            <StepActions onBack={() => setFlowStep("details")} onContinue={() => void runAssetPreparation(uploadedFile, details)} continueLabel="Retry" />
          )}
        </StepSection>
      )}

      {flowStep === "ready" && activeProduct && (
        <StepSection title="Clothing Ready" subtitle="Your garment is prepared. Configure your AI fashion photoshoot." badge="Ready">
          <ProductReadyCard product={activeProduct} />
          <StepActions onBack={() => setFlowStep("entry")} onContinue={goToModel} continueLabel="Continue to Model Selection" />
        </StepSection>
      )}

      {flowStep === "model" && activeProduct && (
        <StepSection title="Step 4 — Model Selection" subtitle="Choose a model preset and configure appearance." badge="Active">
          <ModelSelector value={photoshootConfig.model} onChange={(model) => updateConfig({ model })} />
          <StepErrorList errors={stepErrors} />
          <StepActions onBack={() => setFlowStep("ready")} onContinue={continueFromModel} continueLabel="Continue to Pose" />
        </StepSection>
      )}

      {flowStep === "pose" && (
        <StepSection title="Step 5 — Pose Selection" subtitle="Select the poses for your photoshoot." badge="Active">
          <PoseSelector value={photoshootConfig.poses} onChange={(poses) => updateConfig({ poses })} />
          <StepErrorList errors={stepErrors} />
          <StepActions onBack={() => setFlowStep("model")} onContinue={continueFromPose} continueLabel="Continue to Style" />
        </StepSection>
      )}

      {flowStep === "style" && (
        <StepSection title="Step 6 — Photoshoot Style" subtitle="Define the aesthetic of your fashion campaign." badge="Active">
          <StyleSelector value={photoshootConfig.styleId} onChange={(styleId: StyleId) => updateConfig({ styleId })} />
          <StepErrorList errors={stepErrors} />
          <StepActions onBack={() => setFlowStep("pose")} onContinue={continueFromStyle} continueLabel="Continue to Scene" />
        </StepSection>
      )}

      {flowStep === "background" && (
        <StepSection title="Step 7 — Scene & Camera" subtitle="Background, lighting, camera, and format settings." badge="Active">
          <div className="space-y-10">
            <div>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Background</h3>
              <BackgroundSelector
                value={photoshootConfig.backgroundId}
                customBackground={photoshootConfig.customBackground ?? ""}
                onChange={(backgroundId: BackgroundId) => updateConfig({ backgroundId })}
                onCustomBackgroundChange={(customBackground) => updateConfig({ customBackground })}
              />
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Lighting</h3>
              <LightingSelector value={photoshootConfig.lightingId} onChange={(lightingId) => updateConfig({ lightingId: lightingId as LightingId })} options={LIGHTING_PRESETS} />
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Photography Style</h3>
              <CameraSelector value={photoshootConfig.cameraStyleId} onChange={(cameraStyleId) => updateConfig({ cameraStyleId: cameraStyleId as CameraStyleId })} options={CAMERA_STYLE_PRESETS} />
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Framing</h3>
              <FramingSelector value={photoshootConfig.framing} onChange={(framing) => updateConfig({ framing: framing as FramingId })} options={FRAMING_OPTIONS} />
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Aspect Ratio</h3>
              <AspectRatioSelector value={photoshootConfig.aspectRatio} onChange={(aspectRatio) => updateConfig({ aspectRatio: aspectRatio as AspectRatio })} options={ASPECT_RATIO_OPTIONS} />
            </div>
            <CustomPrompt value={photoshootConfig.customPrompt ?? ""} onChange={(customPrompt) => updateConfig({ customPrompt })} />
          </div>
          <StepErrorList errors={stepErrors} />
          <StepActions onBack={() => setFlowStep("style")} onContinue={continueFromBackground} continueLabel="Review & Generate" />
        </StepSection>
      )}

      {flowStep === "generate" && activeProduct && (
        <StepSection title="Step 8 — Generate Preview" subtitle="Review your photoshoot configuration." badge="Preview">
          <GenerationPreview
            productId={activeProduct.id}
            complete={{
              clothing: toAIClothingReference(activeProduct),
              config: photoshootConfig,
            }}
            onBack={() => setFlowStep("background")}
            creditsAvailable={creditsAvailable}
          />
        </StepSection>
      )}
    </div>
  );
}

function StepSection({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <StepHeader title={title} subtitle={subtitle} badge={badge} />
      {children}
    </section>
  );
}

function StepHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
      <Badge variant={badge === "Ready" ? "success" : badge === "Processing" ? "warning" : badge === "Preview" ? "muted" : "default"}>
        {badge}
      </Badge>
    </div>
  );
}

function StepActions({
  onBack,
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
}: {
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
}) {
  return (
    <div className="flex justify-between border-t border-stone-100 pt-6">
      <Button variant="ghost" onClick={onBack}>Back</Button>
      <Button onClick={onContinue} disabled={continueDisabled}>{continueLabel}</Button>
    </div>
  );
}

function StepErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <ul className="list-inside list-disc text-sm text-red-700">
        {errors.map((e) => <li key={e}>{e}</li>)}
      </ul>
    </div>
  );
}

function ProductPreviewStrip({ imageUrl, name, typeLabel }: { imageUrl: string; name: string; typeLabel: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-stone-100 bg-stone-50 p-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-stone-900">{name}</p>
        <p className="mt-0.5 text-stone-500">{typeLabel}</p>
      </div>
    </div>
  );
}

function ProductReadyCard({ product }: { product: ClothingAsset }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200">
      <div className="grid lg:grid-cols-2">
        <div className="aspect-square bg-stone-100 lg:aspect-auto lg:min-h-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-contain p-4" />
        </div>
        <div className="space-y-3 border-t border-stone-100 p-6 lg:border-l lg:border-t-0">
          <h3 className="font-display text-xl font-medium text-stone-900">{product.productName}</h3>
          <p className="text-sm text-stone-500">
            {getProductTypeLabel(product.productType)} · {getColorLabel(product.color, product.customColor)} · {getGenderLabel(product.gender)}
          </p>
        </div>
      </div>
    </div>
  );
}
