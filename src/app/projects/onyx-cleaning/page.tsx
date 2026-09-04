import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout";
import { Link } from "@/components/ui";
import { OnyxCaseMotion } from "./OnyxCaseMotion";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "ONYX CLEANING",
  description: "Кейс сайта клининговой компании с конфигуратором заказа и панелью управления.",
};

const flow = ["Услуга", "Тип уборки", "Площадь", "Доп. услуги", "Адрес и выезд", "Итог"];

export default function OnyxCleaningCase() {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="IANep, на главную">
            <Image src="/reference/logo-ia.png" alt="" width={44} height={27} priority />
            <span>Nep</span>
          </Link>
          <Link className={styles.backLink} href="/#projects">Все проекты <span aria-hidden="true">↗</span></Link>
        </Container>
      </header>

      <OnyxCaseMotion>
        <section className={styles.hero} aria-labelledby="case-title">
          <Container className={styles.heroInner}>
            <div className={styles.heroCopy} data-case-hero-copy>
              <p className={styles.kicker}>Сайт и система самостоятельного заказа</p>
              <h1 id="case-title">ONYX<br /><span>CLEANING</span></h1>
              <p className={styles.heroLead}>Цифровой сервис для реального клинингового бизнеса: от выбора услуги до готового заказа.</p>
              <p className={styles.status}>Проект для ИП. Коммерческого запуска не было.</p>
            </div>
            <div className={styles.heroFrame} data-hero-frame>
              <Image
                src="/images/projects/onyx-case/hero-desktop.png"
                alt="Главная страница ONYX CLEANING на настольном экране"
                fill priority sizes="(max-width: 768px) 100vw, 78vw"
              />
            </div>
          </Container>
        </section>

        <section className={styles.calculator} data-calculator aria-labelledby="calculator-title">
          <Container>
            <div className={styles.sectionCopy} data-case-reveal>
              <p className={styles.kicker}>Конфигуратор заказа</p>
              <h2 id="calculator-title">Расчёт собирается<br />из решений клиента</h2>
              <p>Калькулятор учитывает тип уборки, площадь или количество, минимальные цены, дополнительные услуги, выезд и ориентировочное время.</p>
            </div>
            <ol className={styles.flow} aria-label="Этапы расчёта" data-flow>
              {flow.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <div className={styles.calculatorStage} data-calculator-stage>
              <figure className={`${styles.interfaceFrame} ${styles.calculationFrame}`} data-calc-screen>
                <Image src="/images/projects/onyx-case/calculation.png" alt="Расчёт стоимости уборки с площадью, адресом и дополнительными услугами" fill sizes="(max-width: 768px) 96vw, 76vw" />
              </figure>
              <figure className={`${styles.interfaceFrame} ${styles.orderFrame}`} data-order-screen>
                <Image src="/images/projects/onyx-case/order.png" alt="Оформление заказа ONYX CLEANING с итоговой стоимостью" fill sizes="(max-width: 768px) 96vw, 76vw" />
              </figure>
              <figure className={styles.mobileFrame} data-mobile-screen>
                <Image src="/images/projects/onyx-case/order-mobile.png" alt="Мобильное оформление заказа ONYX CLEANING" fill sizes="(max-width: 768px) 64vw, 22vw" />
              </figure>
            </div>
          </Container>
        </section>

        <section className={styles.telegram} aria-labelledby="telegram-title">
          <Container className={styles.telegramInner}>
            <div className={styles.telegramCopy} data-case-reveal>
              <p className={styles.kicker}>Заказ принят</p>
              <h2 id="telegram-title">С сайта<br />сразу в Telegram</h2>
              <p>После подтверждения заказ отправлялся через Telegram Bot API. Команда получала контакты, адрес, состав услуг, стоимость и время работы в одном сообщении.</p>
            </div>
            <div className={styles.orderSummary} data-order-summary>
              <Image src="/images/projects/onyx-case/order-summary.png" alt="Финальная проверка заказа перед отправкой" fill sizes="(max-width: 768px) 94vw, 54vw" />
            </div>
            <div className={styles.telegramFrame} data-telegram-frame>
              <Image src="/images/projects/onyx-case/telegram.png" alt="Заказ ONYX CLEANING в Telegram" fill sizes="(max-width: 768px) 74vw, 25vw" />
            </div>
            <div className={styles.deliveryLine} aria-hidden="true" data-delivery-line />
          </Container>
        </section>

        <section className={styles.admin} aria-labelledby="admin-title">
          <Container>
            <div className={styles.adminHeading} data-case-reveal>
              <p className={styles.kicker}>Панель управления</p>
              <h2 id="admin-title">Управление<br />без изменения кода</h2>
            </div>
            <div className={styles.adminLayout}>
              <figure className={`${styles.interfaceFrame} ${styles.adminMain}`} data-admin-main>
                <Image src="/images/projects/onyx-case/admin-parameters.png" alt="Панель управления ценами, параметрами расчёта и городами выезда" fill sizes="(max-width: 768px) 96vw, 82vw" />
              </figure>
              <figure className={`${styles.interfaceFrame} ${styles.adminDetail}`} data-admin-detail>
                <Image src="/images/projects/onyx-case/admin-edit.png" alt="Редактирование дополнительных услуг в панели ONYX CLEANING" fill sizes="(max-width: 768px) 82vw, 42vw" />
              </figure>
              <ul className={styles.adminList} data-case-reveal>
                <li>Услуги и цены</li><li>Параметры расчёта</li><li>Города и стоимость выезда</li><li>Контакты и отзывы</li><li>Повторные обращения по телефону</li>
              </ul>
            </div>
            <p className={styles.security} data-case-reveal>Доступ администратора: bcrypt, JWT и httpOnly cookie.</p>
          </Container>
        </section>

        <section className={styles.final} aria-labelledby="final-title">
          <Container className={styles.finalInner}>
            <p className={styles.kicker}>Полный путь клиента</p>
            <h2 id="final-title">От каталога услуг<br />до самостоятельного<br />оформления заказа</h2>
            <div className={styles.stack} aria-label="Технологии проекта">
              <span>React 18</span><span>TypeScript</span><span>SCSS</span><span>Mantine</span><span>Framer Motion</span><span>Axios</span><span>React Router</span><span>Node.js</span><span>Express</span><span>MySQL</span>
            </div>
            <Link className={styles.nextProject} href="/#project-pass-system">
              <span>Следующий проект</span>
              <strong>Система управления пропусками</strong>
              <span aria-hidden="true">→</span>
            </Link>
          </Container>
        </section>
      </OnyxCaseMotion>
    </main>
  );
}
