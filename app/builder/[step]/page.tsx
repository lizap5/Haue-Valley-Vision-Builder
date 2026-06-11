import { notFound } from "next/navigation";
import Step1Photography from "@/components/steps/Step1Photography";
import Step2GuestCount from "@/components/steps/Step2GuestCount";
import Step3Season from "@/components/steps/Step3Season";
import Step4Ceremony from "@/components/steps/Step4Ceremony";
import Step5Vibe from "@/components/steps/Step5Vibe";
import Step6Florals from "@/components/steps/Step6Florals";
import Step7Priorities from "@/components/steps/Step7Priorities";
import Step8Contact from "@/components/steps/Step8Contact";

interface Props {
  params: Promise<{ step: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { step } = await params;
  return {
    title: `Step ${step} | Haue Valley Vision Builder`,
  };
}

export default async function StepPage({ params }: Props) {
  const { step } = await params;

  switch (step) {
    case "1": return <Step1Photography />;
    case "2": return <Step2GuestCount />;
    case "3": return <Step3Season />;
    case "4": return <Step4Ceremony />;
    case "5": return <Step5Vibe />;
    case "6": return <Step6Florals />;
    case "7": return <Step7Priorities />;
    case "8": return <Step8Contact />;
    default:  notFound();
  }
}
