export const briefProjectTypes = [
  { id: 'landing-page', label: 'Landing Page', icon: 'browser' },
  { id: 'site', label: 'Многостраничный сайт', icon: 'monitor' },
  { id: 'online-store', label: 'Интернет-магазин', icon: 'cart' },
  { id: 'web-app', label: 'Web-приложение', icon: 'layers' },
  { id: 'site-improvements', label: 'Доработка сайта', icon: 'code' },
  { id: 'support', label: 'Поддержка', icon: 'headset' },
  { id: 'unsure', label: 'Пока не знаю', icon: 'analysis' },
] as const;

export const briefSteps = [
  { id: 'projectType', group: 'О проекте', question: 'Какой тип проекта вам нужен?' },
  { id: 'goals', group: 'О проекте', question: 'Какая задача у будущего сайта?' },
  { id: 'features', group: 'Функциональность', question: 'Какие функции вам нужны?' },
  { id: 'designStyles', group: 'Дизайн', question: 'Дизайн' },
  { id: 'materials', group: 'Материалы', question: 'Какие материалы у вас уже есть?' },
  { id: 'timeframe', group: 'Сроки', question: 'Когда вы хотели бы запустить проект?' },
  { id: 'budget', group: 'Бюджет', question: 'Есть ориентир по бюджету?' },
  { id: 'contact', group: 'Контакты', question: 'Почти готово.' },
] as const;

export const siteGoals = ['Презентовать компанию или услугу', 'Получать заявки', 'Продвигать товар', 'Рекламировать мероприятие', 'Представить продукт', 'Другое'];
export const storeGoals = ['Физические товары', 'Цифровые товары', 'Услуги', 'Смешанный каталог'];
export const appGoals = ['Внутренний инструмент компании', 'Автоматизация процесса', 'Работа с клиентами', 'Учёт данных'];
export const landingFeatures = ['Форма обратной связи', 'Заявка на услугу', 'Квиз / опрос', 'Галерея', 'Отзывы', 'Карта и контакты', 'Интеграция с Telegram', 'Блог / новости', 'Другое'];
export const siteFeatures = ['Форма обратной связи', 'Заявка на услугу', 'Каталог', 'Галерея', 'Карта', 'Интеграция с Telegram', 'Отзывы', 'Блог / новости', 'Личный кабинет', 'Другое'];
export const storeFeatures = ['Каталог товаров', 'Поиск', 'Фильтры', 'Корзина', 'Оформление заказа', 'Онлайн-оплата', 'Личный кабинет', 'Избранное', 'Отзывы', 'Статус заказа', 'Административная панель'];
export const designStyles = ['Минимализм', 'Современный', 'Доверяю вам / пока не знаю'];
export const materialOptions = ['Логотип и фирменный стиль', 'Тексты и контент', 'Фотографии', 'Видео / анимация', 'Каталог / прайс-лист', 'Ничего пока нет'];
export const readinessOptions = ['Всё готово', 'Большая часть готова', 'Есть только часть', 'Пока ничего нет'];
export const timeframeOptions = ['Конкретного срока нет', 'В течение месяца', 'В течение 1–2 месяцев', 'Есть конкретная дата'];
export const budgetOptions = ['До 20 000 ₽', '20 000–40 000 ₽', '40 000–70 000 ₽', '70 000–100 000 ₽', 'Более 100 000 ₽', 'Пока не определён'];
export const contactMethods = ['Telegram', 'Телефон', 'Email'];
export const briefSubmissionWarning = 'Отправка брифа не означает автоматическое принятие проекта в работу.';
export const briefDeadlineWarning = 'Желаемая дата не является автоматически подтверждённым сроком. Возможность реализации проекта в указанный период определим после оценки проекта.';

export function getGoalOptions(projectType: string) {
  if (projectType === 'online-store') return storeGoals;
  if (projectType === 'web-app') return appGoals;
  if (projectType === 'landing-page' || projectType === 'site') return siteGoals;
  return [];
}

export function getGoalQuestion(projectType: string) {
  if (projectType === 'online-store') return 'Что вы планируете продавать?';
  if (projectType === 'web-app') return 'Какую задачу должна решать система?';
  if (projectType === 'site-improvements' || projectType === 'support') return 'Что требуется изменить?';
  if (projectType === 'unsure') return 'Что вы хотите получить в результате?';
  return briefSteps[1].question;
}

export function getFeatureOptions(projectType: string) {
  if (projectType === 'online-store') return storeFeatures;
  if (projectType === 'landing-page') return landingFeatures;
  if (projectType === 'site') return siteFeatures;
  return [];
}
