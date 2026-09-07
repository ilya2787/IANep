import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LoginForm } from "./login-form";
import { redirect } from "next/navigation";
import styles from "@/app/admin/admin.module.css";
import { getAdminSession } from "@/server/auth/admin-auth";

export const metadata = { title: "Вход в Admin" };
type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main id="main-content" className={styles.loginMain}>
      <header className={styles.loginHeader}><Link href="/" className={styles.brandName}>IANep</Link><ThemeToggle /></header>
      <div className={styles.loginLayout}>
        <section className={styles.loginVisual} aria-label="Добро пожаловать">
          <div className={styles.visualCaption}><span className={styles.accessLabel}><span /> Только для своих</span><h2>Всё готово.<br />Можно за работу.</h2><p>Ваши заявки, проекты и новые возможности —<br className={styles.desktopBreak} /> в одном рабочем пространстве.</p></div>
          <div className={styles.mascotStage}><div className={styles.orbit} aria-hidden="true" /><div className={styles.mascotFigure}><Image src="/images/admin/mascot-access-v1.png" alt="Фирменный робот IANep с картой доступа приглашает войти" width={1254} height={1254} sizes="(max-width: 760px) 58vw, 420px" preload className={styles.loginMascot} /><svg className={styles.mascotEyes} viewBox="0 0 1254 1254" fill="none" aria-hidden="true"><g className={styles.eyeBlink}><rect x="553" y="406" width="38" height="62" rx="19" /><rect x="701" y="417" width="38" height="62" rx="19" /></g></svg></div><span className={styles.accessCard} aria-hidden="true">IANep workspace <span>↗</span></span></div>
          <span className={styles.visualFooter}>Идеи снаружи. Всё для работы — внутри.</span>
        </section>
        <section className={styles.loginCard} aria-labelledby="login-title">
          <p className={styles.eyebrow}>Панель администратора</p>
          <h1 id="login-title" className={styles.loginTitle}>С возвращением</h1>
          <p className={styles.loginHint}>Войдите, чтобы посмотреть заявки<br />и продолжить работу.</p>
          <LoginForm error={error} />
          <p className={styles.loginNote}>Доступ предоставляется администратором сайта.</p>
          <Link className={styles.loginBack} href="/">← Вернуться на сайт</Link>
        </section>
      </div>
      <footer className={styles.loginFooter}><span>IANep / Рабочее пространство</span><span>Доступ только для администратора</span></footer>
    </main>
  );
}
