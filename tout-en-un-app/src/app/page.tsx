import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureSection, FEATURE_VISUALS } from "@/components/landing/feature-section";
import { TeachersSection } from "@/components/landing/teachers-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LANDING_FR } from "@/lib/i18n/landing.fr";

// La section tarifs lit les offres actives en base : sans ceci, Next
// prérendrait la page au build et une offre ajoutée ou désactivée ensuite
// n'apparaîtrait jamais (même principe que (public)/inscription/page.tsx).
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="bg-background">
      <LandingNav />
      <HeroSection />

      <FeatureSection
        id="plateforme"
        contenu={LANDING_FR.features.apprendre}
        visual={FEATURE_VISUALS.apprendre}
      />
      <FeatureSection contenu={LANDING_FR.features.pratiquer} visual={FEATURE_VISUALS.pratiquer} reverse />
      <FeatureSection
        id="accompagnement"
        contenu={LANDING_FR.features.accompagnement}
        visual={FEATURE_VISUALS.accompagnement}
      />
      <FeatureSection contenu={LANDING_FR.features.progression} visual={FEATURE_VISUALS.progression} reverse />

      <TeachersSection />
      <PricingSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
