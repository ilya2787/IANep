import { PageMotion } from "@/components/motion/PageMotion";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Approach, Brief, FAQ, FinalCTA, Hero, Projects, Services } from "@/components/sections";

export default function Home() {
  return (
    <>
      <Header inverse />
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
