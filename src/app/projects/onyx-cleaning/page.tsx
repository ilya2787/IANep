import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Container } from "@/components/layout";
import { Link, ProgressiveImage, SectionLink } from "@/components/ui";
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
            <Image src="/reference/logo-ia.png" alt="" width={44} height={27} />
            <span>Nep</span>
          </Link>
          <div className={styles.headerActions}><ThemeToggle /><SectionLink className={styles.backLink} href="/#projects">Все проекты <span aria-hidden="true">↗</span></SectionLink></div>
        </Container>
      </header>

      <OnyxCaseMotion>
        <section className={styles.hero} aria-labelledby="case-title">
          <Container className={styles.heroInner}>
            <div className={styles.heroCopy} data-case-hero-copy>
              <p className={styles.kicker}>Проект 01 / Сайт и веб-сервис</p>
              <h1 id="case-title">ONYX <span>CLEANING</span></h1>
              <p className={styles.heroLead}>Выбрать уборку. Рассчитать стоимость. Оформить заказ. Всё — на одном сайте.</p>
              <p className={styles.status}>Проект для ИП. Коммерческого запуска не было.</p>
            </div>
            <div className={styles.heroFrame} data-hero-frame>
              <ProgressiveImage
                src="/images/projects/onyx-case/hero-desktop.png"
                alt="Главная страница ONYX CLEANING на настольном экране"
                fill priority fetchPriority="high" quality={90} sizes="(max-width: 768px) 100vw, 78vw"
              />
            </div>
          </Container>
        </section>

        <section className={styles.overview} aria-labelledby="overview-title">
          <Container className={styles.overviewGrid}>
            <div><p className={styles.kicker}>01 / Задача</p><h2 id="overview-title">Больше, чем<br />витрина услуг</h2></div>
            <div className={styles.overviewBody}><p>Для клининговой компании нужен был сайт, на котором клиент мог бы не только узнать об уборке, но и самостоятельно собрать заказ: выбрать услуги, увидеть расчёт и указать время выезда.</p><p>В проекте связаны две стороны сервиса: понятный путь клиента и панель, в которой бизнес управляет услугами и условиями расчёта.</p>
              <dl className={styles.facts}><div><dt>Для клиента</dt><dd>Каталог, расчёт и заказ</dd></div><div><dt>Для бизнеса</dt><dd>Управление и уведомления</dd></div><div><dt>Формат</dt><dd>Десктоп и мобильная версия</dd></div></dl>
            </div>
          </Container>
        </section>

        <section className={styles.design} aria-labelledby="design-title">
          <Container className={styles.overviewGrid}>
            <div><p className={styles.kicker}>02 / Визуальное решение</p><h2 id="design-title">Спокойный образ.<br />Понятные действия.</h2></div>
            <div className={styles.overviewBody}><p>Тёплый светлый фон, графитовые блоки и золотистые акценты продолжают образ ONYX. Крупные фотографии показывают контекст услуги, а контрастные кнопки выделяют переход к заказу.</p><p>Информационная часть знакомит с услугами. В конфигураторе акцент смещается на параметры, состав заказа и стоимость — то, что нужно для решения.</p><div className={styles.designPalette} aria-label="Палитра интерфейса ONYX"><span>Светлая основа</span><span>Графит</span><span>Золотой акцент</span></div></div>
          </Container>
        </section>

        <section className={styles.calculator} data-calculator aria-labelledby="calculator-title">
          <Container>
            <div className={styles.sectionCopy} data-case-reveal>
              <p className={styles.kicker}>03 / Конфигуратор заказа</p>
              <h2 id="calculator-title">Стоимость понятна<br />до отправки заявки</h2>
              <p>Калькулятор учитывает тип уборки, площадь или количество, минимальные цены, дополнительные услуги, выезд и ориентировочное время.</p>
            </div>
            <ol className={styles.flow} aria-label="Этапы расчёта" data-flow>
              {flow.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <div className={styles.sequenceLegend} aria-label="Последовательность оформления заказа">
              <span data-service-label>Выбор услуги</span>
              <span aria-hidden="true">→</span>
              <span data-order-label>Оформление</span>
              <span aria-hidden="true">→</span>
              <span data-review-label>Проверка заказа</span>
            </div>
            <div className={styles.calculatorStage} data-calculator-stage>
              <figure className={`${styles.interfaceFrame} ${styles.serviceFrame}`} data-service-screen>
                <ProgressiveImage src="/images/projects/onyx-case/order.png" alt="Страница услуги ONYX CLEANING с описанием уборки и кнопкой заказа" fill sizes="(max-width: 768px) 90vw, 44vw" />
              </figure>
              <figure className={`${styles.interfaceFrame} ${styles.orderFrame}`} data-order-screen>
                <ProgressiveImage src="/images/projects/onyx-case/calculation.png" alt="Оформление заказа ONYX CLEANING с контактами, адресом, датой и итоговой стоимостью" fill sizes="(max-width: 768px) 90vw, 44vw" />
              </figure>
              <figure className={`${styles.interfaceFrame} ${styles.reviewFrame}`} data-review-screen>
                <ProgressiveImage src="/images/projects/onyx-case/order-summary.png" alt="Финальная проверка состава и стоимости заказа перед отправкой" fill sizes="(max-width: 768px) 90vw, 44vw" />
              </figure>
            </div>
            <div className={styles.mobileShowcase}>
              <div className={styles.mobileCopy} data-case-reveal>
                <h3>Полный сценарий на мобильном</h3>
                <p>Форма сохраняет расчёт, быстрый доступ к итогу и проверку заказа перед отправкой.</p>
              </div>
              <div className={styles.mobileScreens}>
                <figure className={styles.mobileShot} data-mobile-form>
                  <div className={styles.phoneFrame}>
                    <ProgressiveImage src="/images/projects/onyx-case/order-mobile.png" alt="Мобильная форма оформления заказа ONYX CLEANING" fill sizes="(max-width: 768px) 42vw, 22vw" />
                  </div>
                  <figcaption>Форма заказа</figcaption>
                </figure>
                <figure className={styles.mobileShot} data-mobile-confirmation>
                  <div className={styles.phoneFrame}>
                    <ProgressiveImage src="/images/projects/onyx-case/order-confirmation-mobile.png" alt="Проверка состава и стоимости заказа на мобильном экране" fill sizes="(max-width: 768px) 42vw, 22vw" />
                  </div>
                  <figcaption>Проверка перед отправкой</figcaption>
                </figure>
              </div>
            </div>
          </Container>
        </section>

        <section className={styles.telegram} aria-labelledby="telegram-title">
          <Container className={styles.telegramInner}>
            <div className={styles.telegramCopy} data-case-reveal>
              <p className={styles.kicker}>04 / Передача заказа</p>
              <h2 id="telegram-title">С сайта<br />сразу в Telegram</h2>
              <p>После подтверждения заказ отправлялся в Telegram. Команда получала контакты, адрес, состав услуг, стоимость и время работы в одном сообщении.</p>
            </div>
            <div className={styles.telegramFrame} data-telegram-frame>
              <ProgressiveImage src="/images/projects/onyx-case/telegram.png" alt="Заказ ONYX CLEANING в Telegram" fill sizes="(max-width: 768px) 90vw, 36vw" />
            </div>
            <div className={styles.deliveryLine} aria-hidden="true" data-delivery-line />
          </Container>
        </section>

        <section className={styles.admin} aria-labelledby="admin-title">
          <Container>
            <div className={styles.adminHeading} data-case-reveal>
              <p className={styles.kicker}>05 / Панель управления</p>
              <h2 id="admin-title">Управление<br />без изменения кода</h2>
            </div>
            <div className={styles.adminLayout}>
              <figure className={`${styles.interfaceFrame} ${styles.adminMain}`} data-admin-main>
                <ProgressiveImage src="/images/projects/onyx-case/admin-parameters.png" alt="Панель управления ценами, параметрами расчёта и городами выезда" fill sizes="(max-width: 768px) 90vw, 55vw" />
              </figure>
              <figure className={`${styles.interfaceFrame} ${styles.adminDetail}`} data-admin-detail>
                <ProgressiveImage src="/images/projects/onyx-case/admin-edit.png" alt="Редактирование дополнительных услуг в панели ONYX CLEANING" fill sizes="(max-width: 768px) 90vw, 36vw" />
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
            <p className={styles.kicker}>06 / Итог проекта</p>
            <h2 id="final-title">Сайт с логикой<br />полноценного сервиса</h2>
            <p className={styles.resultText}>В проекте реализован путь от знакомства с услугой до расчёта, проверки и передачи заказа команде. Цены, услуги и параметры выезда вынесены в панель управления.</p><p className={styles.resultNote}>Коммерческого запуска не было, поэтому здесь показаны реализованные решения, а не показатели продаж.</p><SectionLink className={styles.homeLink} href="/#brief">Обсудить похожий проект <span aria-hidden="true">↗</span></SectionLink>
            <div className={styles.stack} aria-label="Технологии проекта">
              <span>React 18</span><span>TypeScript</span><span>SCSS</span><span>Mantine</span><span>Framer Motion</span><span>Axios</span><span>React Router</span><span>Node.js</span><span>Express</span><span>MySQL</span>
            </div>
            <SectionLink className={styles.nextProject} href="/#project-pass-system">
              <span>Следующий проект</span>
              <strong>Система управления пропусками</strong>
              <span aria-hidden="true">→</span>
            </SectionLink>
            <SectionLink className={styles.homeLink} href="/#projects">
              <span aria-hidden="true">←</span>
              На главную
            </SectionLink>
          </Container>
        </section>
      </OnyxCaseMotion>
    </main>
  );
}
