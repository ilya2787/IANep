export type Service = {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
  imageDark: string;
  imagePosition?: string;
  motionAnchor?: string;
};

export const services: Service[] = [
  {
    id: "landing-page",
    number: "01",
    title: "Landing Page",
    description: "Для продукта, услуги или рекламной кампании.",
    image: "/services/landing-page.png",
    imageDark: "/services/landing-page-dark.png",
  },
  {
    id: "multipage-site",
    number: "02",
    title: "Многостраничный сайт",
    description: "Для компании, услуг и сложной структуры контента.",
    image: "/services/multipage-site.png",
    imageDark: "/services/multipage-site-dark.png",
    motionAnchor: "services-multipage",
  },
  {
    id: "online-store",
    number: "03",
    title: "Интернет-магазин",
    description: "Каталог, корзина и оформление заказов.",
    image: "/services/online-store.png",
    imageDark: "/services/online-store-dark.png",
  },
  {
    id: "web-apps",
    number: "04",
    title: "Web-приложения",
    description: "Инструменты и системы под конкретные задачи.",
    image: "/services/web-apps.png",
    imageDark: "/services/web-apps-dark.png",
  },
  {
    id: "site-improvements",
    number: "05",
    title: "Доработка сайтов",
    description: "Развитие и изменение существующих проектов.",
    image: "/services/site-improvements.png",
    imageDark: "/services/site-improvements-dark.png",
  },
  {
    id: "support",
    number: "06",
    title: "Поддержка",
    description: "Помощь после запуска и дальнейшее развитие.",
    image: "/services/support.png",
    imageDark: "/services/support-dark.png",
  },
];
