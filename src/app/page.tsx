import type { Metadata } from "next";
import { PageMotion } from "@/components/motion/PageMotion";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Approach, Brief, FAQ, FinalCTA, Hero, Projects, Services } from "@/components/sections";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { title: "IANep — разработка цифровых продуктов", description: "Разработка цифровых продуктов", url: "/", images: ["/reference/logo-ia.png"] },
};

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
