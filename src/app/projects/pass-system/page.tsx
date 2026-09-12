import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Link, ProgressiveImage, SectionLink } from "@/components/ui";
import { PropuscMotion } from "./PropuscMotion";
import { shots, type ShotName } from "./screenshots";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Propusc — Система управления пропусками",
  description: "Локальная система для создания, управления и печати пропусков с универсальным редактором шаблонов и разграничением прав доступа.",
};

function Screenshot({ name, caption, priority = false, className = "" }: { name: ShotName; caption: string; priority?: boolean; className?: string }) {
  const shot = shots[name];
  return <figure className={`${styles.shot} ${className}`}>
    <a href={shot.src} target="_blank" rel="noreferrer" aria-label={`${caption}. Открыть скриншот в полном размере`}>
      <ProgressiveImage src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} priority={priority} fetchPriority={priority ? "high" : "auto"} sizes={name === "phone" ? "(max-width: 768px) 70vw, 240px" : "(max-width: 768px) 92vw, (max-width: 1024px) 90vw, 1200px"} />
    </a>
    <figcaption>{caption}<span aria-hidden="true">↗</span></figcaption>
  </figure>;
}

export default function PropuscCase() {
  return <main id="main-content" tabIndex={-1} className={styles.page}>
    <header className={styles.header}>
      <Container className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="IANep, на главную"><Image src="/reference/logo-ia.png" alt="" width={44} height={27} /><span>Nep</span></Link>
        <div className={styles.headerActions}><ThemeToggle /><SectionLink href="/#projects" className={styles.back}>Все проекты <span aria-hidden="true">↗</span></SectionLink></div>
      </Container>
    </header>
    <PropuscMotion>
      <section id="top" className={styles.hero} aria-labelledby="case-title">
        <Container>
          <p className={styles.kicker}>Проект 02 / Propusc</p>
          <h1 id="case-title">СИСТЕМА УПРАВЛЕНИЯ <span>ПРОПУСКАМИ</span></h1>
          <div className={styles.heroIntro}><p className={styles.lead}>Локальное web-приложение для создания, настройки и печати пропусков.</p><p className={styles.context}>Работающая внутренняя система. Рассчитана прежде всего на компьютер без интернета: рабочие данные остаются в локальной среде.</p></div>
          <nav className={styles.sceneNav} aria-label="Разделы кейса"><Link href="#creation">Создание пропуска</Link><Link href="#editor">Редактор шаблонов</Link><Link href="#access">Роли и управление</Link><Link href="#print">A4 и печать</Link></nav>
          <Screenshot name="home" caption="Рабочее пространство системы" priority />
          <div className={styles.systemIntro}>
            <div><p className={styles.kicker}>Одна система, весь сценарий</p><h2>От шаблона<br />к готовому пропуску</h2><p>Локальная система для создания, управления и печати пропусков с универсальным редактором шаблонов и разграничением прав доступа.</p><p>Основное рабочее место — компьютер. Интерфейс адаптируется и к узкому экрану, сохраняя навигацию по системе.</p></div>
            <Screenshot name="phone" caption="Та же система на узком экране" className={styles.phone} />
          </div>
        </Container>
      </section>

      <section id="creation" className={styles.section} data-creation aria-labelledby="creation-title">
        <Container>
          <div className={styles.heading}><p className={styles.kicker}>Создание пропуска</p><h2 id="creation-title">Данные слева.<br />Результат перед глазами.</h2><p>Оператор выбирает шаблон, заполняет поля и работает с фото. Предпросмотр помогает проверить пропуск перед добавлением в очередь.</p></div>
          <ol className={styles.workflow} aria-label="Полный путь пропуска">{["Шаблон", "Данные", "Пропуск", "Очередь", "A4", "Печать"].map((step) => <li key={step}><span>{step}</span><i data-workflow-line aria-hidden="true" /></li>)}</ol>
          <div data-creation-screen><Screenshot name="creation" caption="Заполнение данных и предпросмотр пропуска" /></div>
          <div className={styles.notes}><p><strong>Шаблон задаёт структуру</strong>Стандартные и дополнительные поля появляются в рабочем сценарии.</p><p><strong>Предпросмотр даёт контроль</strong>Фото, текст и расположение элементов можно проверить до печати.</p></div>
        </Container>
      </section>

      <section id="editor" className={`${styles.section} ${styles.editor}`} data-editor aria-labelledby="editor-title">
        <Container>
          <div className={styles.heading}><p className={styles.kicker}>Универсальный редактор</p><h2 id="editor-title">Новый тип пропуска.<br /><span>Без изменения кода.</span></h2><p>От размера карточки до последнего текстового поля: шаблон собирается в визуальном редакторе, а затем используется оператором.</p></div>
          <div className={styles.editorStage}><div data-editor-screen><Screenshot name="editor" caption="Редактор шаблона: инструменты, свойства и рабочая область" /></div></div>
          <div className={styles.editorDetails}>
            <div><h3>Форма и стороны</h3><p>Размеры карточки, односторонние и двусторонние шаблоны, отдельные фоны лицевой и оборотной стороны. Переключение front / back.</p></div>
            <div><h3>Содержание и точность</h3><p>Изображения, фото, стандартные и пользовательские поля, постоянный текст и декоративные блоки. Стили текста, позиции и размеры, сетка и привязка.</p></div>
            <div><h3>Правки и перенос</h3><p>Undo / redo помогают работать с изменениями. Импорт и экспорт позволяют переносить готовые шаблоны.</p></div>
          </div>
        </Container>
      </section>

      <section id="access" className={styles.section} data-access aria-labelledby="access-title">
        <Container>
          <div className={styles.accessHeading}><div className={styles.heading}><p className={styles.kicker}>Роли и управление</p><h2 id="access-title">Каждому —<br />свои действия</h2></div><div className={styles.roles}>
            <div data-role><span className={styles.roleName}>operator</span><h3>Создаёт и печатает</h3><p>Выбирает шаблон, вводит данные, проверяет пропуск и отправляет очередь на печать.</p></div>
            <div data-role><span className={styles.roleName}>admin</span><h3>Настраивает и управляет</h3><p>Шаблоны, пользователи и роли, блокировка, сброс паролей и завершение сессий. Справочники, данные руководителя, журнал и системные операции.</p></div>
          </div></div>
          <Screenshot name="users" caption="Пользователи и управление доступом" />
          <div className={styles.audit}><div><h3>Действия остаются в журнале</h3><p>Audit собран в администрировании: события можно просматривать и фильтровать при проверке работы системы.</p></div><div data-audit><Screenshot name="audit" caption="Журнал действий" /></div></div>
        </Container>
      </section>

      <section id="print" className={`${styles.section} ${styles.print}`} data-print aria-labelledby="print-title">
        <Container>
          <div className={styles.heading}><p className={styles.kicker}>Очередь → A4 → Печать</p><h2 id="print-title">Из отдельных пропусков<br />в готовый лист</h2><p>Пропуски собираются в очередь. Раскладка A4 зависит от шаблона: поддерживаются разные ориентации и варианты с одной или двумя сторонами.</p></div>
          <div className={styles.printSequence}>
            <div data-print-step><span className={styles.stepLabel}>Очередь → A4</span><Screenshot name="preview" caption="Предпросмотр листа с лицевыми и оборотными сторонами" /></div>
            <div data-print-step><span className={styles.stepLabel}>A4 → Печать</span><Screenshot name="print" caption="Подготовленный лист в диалоге печати" /></div>
          </div>
          <div className={styles.local}><div><p className={styles.kicker}>Локальная эксплуатация</p><h3>Данные остаются<br />под контролем</h3><p>Состояние базы, резервное копирование и восстановление доступны в системном разделе.</p><p>Перед restore выполняется проверка и создаётся страховочная копия. После восстановления активные сессии завершаются.</p></div><Screenshot name="system" caption="Система и перенос данных" /></div>
          <div className={styles.final}>
            <p className={styles.kicker}>Результат</p><h2>От универсального шаблона — до готового листа для печати в одной системе.</h2>
            <ul className={styles.outcomes}><li>Универсальные шаблоны</li><li>Ролевой доступ</li><li>A4 и печать</li><li>Локальная работа</li></ul>
            <details className={styles.stack}><summary>Технологии проекта</summary><p>React 18, TypeScript, Vite, Mantine, React Router, Axios</p><p>Node.js, Express, TypeScript, MySQL</p><p>JWT, bcrypt, cookie auth, Multer, react-to-print</p></details>
            <div className={styles.finalLinks}><SectionLink href="/#brief" className={styles.cta}>Обсудить похожий проект <span aria-hidden="true">↗</span></SectionLink><SectionLink href="/#projects" className={styles.back}>Все проекты <span aria-hidden="true">↗</span></SectionLink></div>
          </div>
        </Container>
      </section>
    </PropuscMotion>
  </main>;
}
