import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { productService, ProductServiceError } from "@/lib/products";
import { parseProductFormData } from "@/lib/validation/product-form";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/mock/constants";

export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const products = await productService.listProducts(authResult.user.id);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Unable to load products. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A clothing image file is required." },
        { status: 400 },
      );
    }

    if (
      !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload a JPG, PNG, or WEBP image." },
        { status: 400 },
      );
    }

    const { input, errors } = parseProductFormData(formData);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      return NextResponse.json({ error: firstError, errors }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const product = await productService.createProduct(authResult.user.id, {
      ...input,
      fileBuffer: buffer,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Unable to create product. Please try again." },
      { status: 500 },
    );
  }
}
