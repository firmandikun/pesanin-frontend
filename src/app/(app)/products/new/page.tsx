"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductEditor } from "@/components/ProductEditor";

function NewProduct() {
  const type = useSearchParams().get("type") === "digital" ? "digital" : "physical";
  return <ProductEditor type={type} />;
}

export default function Page() {
  return <Suspense><NewProduct /></Suspense>;
}
