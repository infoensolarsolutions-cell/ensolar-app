import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  await requireRole("owner", "office_staff");
  return (
    <>
      <TopBar title="New Product" backHref="/products" />
      <ProductForm />
    </>
  );
}
