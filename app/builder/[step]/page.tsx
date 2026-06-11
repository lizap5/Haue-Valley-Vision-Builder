import { notFound } from "next/navigation";
import Step1Photography from "@/components/steps/Step1Photography";
import Step2GuestCount from "@/components/steps/Step2GuestCount";

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
    case "2":
      return <Step2GuestCount />;
    default:
      notFound();
  }
}
