import { SectionLink } from "@/components/ui";
import { services } from "@/components/sections/services.data";
import { Container } from "./Container";
import styles from "./Footer.module.css";

const navigation = [
  { href: "#services", label: "Услуги" },
  { href: "#projects", label: "Проекты" },
  { href: "#approach", label: "Как работаем" },
  { href: "#faq", label: "FAQ" },
  { href: "#brief", label: "Рассчитать проект" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.wordmark} aria-hidden="true">IANep</div>
        <div className={styles.columns}>
          <div>
            <p className={styles.brand}><span>IA</span>Nep</p>
            <p className={styles.tagline}>Сайты и web-решения под задачи бизнеса.</p>
          </div>
          <nav aria-label="Услуги в подвале">
            <h2 className={styles.heading}>Услуги</h2>
            <ul className={styles.list}>
              {services.map((service) => (
                <li key={service.id}>
                  <SectionLink className={styles.link} href={`#service-${service.id}`}>{service.title}</SectionLink>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Навигация в подвале">
            <h2 className={styles.heading}>Навигация</h2>
            <ul className={styles.list}>
              {navigation.map((item) => (
                <li key={item.href}>
                  <SectionLink className={styles.link} href={item.href}>{item.label}</SectionLink>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className={styles.heading}>Связаться</h2>
            {/* Адреса пока не утверждены. */}
            <ul className={styles.list}>
              <li className={styles.contact}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-4 18-6-6-4 3 1-7 13-8ZM8 11l13-8M11 15l10-12M8 11l-6-3 19-5" /></svg><span>Telegram</span></li>
              <li className={styles.contact}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m3 6 9 7 9-7" /></svg><span>E-mail</span></li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© 2026 IANep</p>
          {/* Документ политики пока отсутствует. */}
          <p>Политика конфиденциальности</p>
          <p className={styles.location}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>Сделано в Калининграде</p>
        </div>
      </Container>
    </footer>
  );
}
