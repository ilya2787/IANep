export type ProjectKind = "onyx" | "pass-system";

export type Project = {
  id: string;
  number: string;
  kind: ProjectKind;
  title: string;
  type: string;
  description: string;
  steps: string[];
  href: string;
  deviceImage: string;
  deviceAlt: string;
  desktopImage: string;
  desktopAlt: string;
  mobileImage: string;
  mobileAlt: string;
  motionAnchor: string;
};

export const projects: Project[] = [
  {
    id: "onyx-cleaning",
    number: "01",
    kind: "onyx",
    title: "ONYX CLEANING",
    type: "Многостраничный сайт",
    description: "Сайт клининговой компании с каталогом услуг и системой заявок.",
    steps: ["Сайт", "Каталог услуг", "Заявки"],
    href: "#project-onyx-cleaning",
    deviceImage: "/images/projects/devices/separate/tablet.png",
    deviceAlt: "Фотореалистичный планшет",
    desktopImage: "/images/projects/onyx-cleaning/header.png",
    desktopAlt: "Главная страница сайта ONYX CLEANING с каталогом клининговых услуг",
    mobileImage: "/images/projects/onyx-cleaning/mobile-v2.png",
    mobileAlt: "Мобильная версия главной страницы ONYX CLEANING",
    motionAnchor: "project-onyx",
  },
  {
    id: "pass-system",
    number: "02",
    kind: "pass-system",
    title: "Система управления пропусками",
    type: "Web-приложение",
    description: "Система для создания, управления и печати пропусков.",
    steps: ["Шаблоны", "Пользователи", "Журнал", "Печать"],
    href: "#project-pass-system",
    deviceImage: "/images/projects/devices/separate/tablet.png",
    deviceAlt: "Фотореалистичный планшет",
    desktopImage: "/images/projects/pass-system/desktop.png",
    desktopAlt: "Панель управления системой пропусков с разделами администрирования",
    mobileImage: "/images/projects/pass-system/mobile-v2.png",
    mobileAlt: "Мобильная панель администратора системы управления пропусками",
    motionAnchor: "project-pass-system",
  },
];
