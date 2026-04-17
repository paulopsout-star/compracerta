import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { ProofOfNetwork } from "@/components/landing/proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Personas } from "@/components/landing/personas";
import { Ecosystem } from "@/components/landing/ecosystem";
import { FinalCTA, Footer } from "@/components/landing/cta-footer";
import { GlitchStyles } from "@/components/landing/shared";

export default function HomePage() {
  return (
    <>
      <GlitchStyles />
      <LandingHeader />
      <main>
        <Hero />
        <ProofOfNetwork />
        <HowItWorks />
        <Personas />
        <Ecosystem />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
