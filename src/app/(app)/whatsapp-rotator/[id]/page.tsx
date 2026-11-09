"use client";
import { use } from "react";
import { RotatorForm } from "@/components/kit/RotatorForm";
export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <RotatorForm id={Number(id)} />; }
