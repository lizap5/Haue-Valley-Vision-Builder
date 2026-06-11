import { notFound } from "next/navigation";
import Step1Photography from "@/components/steps/Step1Photography";

interface Props {
  params: Promise<{ step: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { step } = await params;
  return {
    title: `Step ${step} — Haue Valley Vision Builder`,
  };
}

export default async function StepPage({ params }: Props) {
  const { step } = await params;

  switch (step) {
    case "1":
      return <Step1Photography />;
    default:
      notFound();
  }
}
