import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { productService, ProductServiceError } from "@/lib/products";
import type { UpdateClothingAssetInput } from "@/types";
import { validateProductUpdate } from "@/lib/validation/product-form";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const product = await productService.getProductForUser(id, authResult.user.id);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json(
      { error: "Unable to load product. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateClothingAssetInput;

    const { errors } = validateProductUpdate(body);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      return NextResponse.json({ error: firstError, errors }, { status: 400 });
    }

    const product = await productService.updateProduct(id, authResult.user.id, body);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Unable to update product. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    await productService.deleteProduct(id, authResult.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Unable to delete product. Please try again." },
      { status: 500 },
    );
  }
}
