import { PageMotion } from "@/components/motion/PageMotion";
import { Footer } from "@/components/layout/Footer";
import { Approach, Brief, FAQ, FinalCTA, Hero, Projects, Services } from "@/components/sections";

export default function Home() {
  return (
    <>
      <PageMotion>
        <Hero />
        <Services />
        <Projects />
        <Approach />
        <Brief />
        <FAQ />
        <FinalCTA />
      </PageMotion>
      <Footer />
    </>
  );
}
