import { notFound } from "next/navigation";
import StepPhotography from "@/components/steps/StepPhotography";
import StepVibe from "@/components/steps/StepVibe";
import StepCeremony from "@/components/steps/StepCeremony";
import StepAisleFlowers from "@/components/steps/StepAisleFlowers";
import StepArch from "@/components/steps/StepArch";
import StepLinenColors from "@/components/steps/StepLinenColors";
import StepAccentMetal from "@/components/steps/StepAccentMetal";
import StepSeason from "@/components/steps/StepSeason";
import StepBar from "@/components/steps/StepBar";
import StepPriorities from "@/components/steps/StepPriorities";
import StepContact from "@/components/steps/StepContact";

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
    case "1":  return <StepPhotography />;
    case "2":  return <StepVibe />;
    case "3":  return <StepCeremony />;
    case "4":  return <StepAisleFlowers />;
    case "5":  return <StepArch />;
    case "6":  return <StepLinenColors />;
    case "7":  return <StepAccentMetal />;
    case "8":  return <StepSeason />;
    case "9":  return <StepBar />;
    case "10": return <StepPriorities />;
    case "11": return <StepContact />;
    default:   notFound();
  }
}
