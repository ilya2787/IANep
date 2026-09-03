import { z } from "zod";
import {
  briefProjectTypes, budgetOptions, contactMethods, designStyles, getFeatureOptions,
  getGoalOptions, materialOptions, readinessOptions, timeframeOptions,
} from "@/components/sections/brief.data";

const text = (max: number) => z.string({ error: "Введите текст" }).trim().max(max, `Не более ${max} символов`);
const choice = (options: readonly string[]) => text(200).refine((value) => options.includes(value), "Выберите один из предложенных вариантов");
const choices = z.array(text(200), { error: "Выберите варианты ответа" }).max(20, "Слишком много вариантов").refine((items) => new Set(items).size === items.length, "Удалите повторяющиеся варианты");
const optionalUrl = text(1000).refine((value) => {
  if (!value) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}, "Укажите ссылку, начинающуюся с https:// или http://");

export const submitBriefSchema = z.object({
  name: text(100).min(2, "Укажите имя от 2 до 100 символов"),
  contact: text(200).min(3, "Укажите контакт для связи"),
  projectType: choice(briefProjectTypes.map((item) => item.id)),
  answers: z.object({
    goals: choices,
    description: text(3000),
    productCount: text(100),
    website: optionalUrl,
    features: choices,
    featureNotes: text(3000),
    designStyles: choices,
    designReference: optionalUrl,
    designNotes: text(2000),
    materials: choices.min(1, "Укажите, какие материалы уже есть"),
    readiness: choice(readinessOptions),
    timeframe: choice(timeframeOptions),
    launchDate: text(10),
    budget: choice(budgetOptions),
    contactMethod: choice(contactMethods),
    comment: text(2000),
    consent: z.boolean({ error: "Подтвердите согласие" }).refine(Boolean, "Нужно согласие на обработку персональных данных"),
  }, { error: "Передайте ответы на вопросы брифа" }).strict(),
}, { error: "Передайте данные заявки" }).strict().superRefine((data, ctx) => {
  const a = data.answers;
  const issue = (key: string, message: string) => ctx.addIssue({ code: 'custom', path: ['answers', key], message });
  const check = (key: 'goals' | 'features' | 'designStyles' | 'materials', allowed: readonly string[]) => {
    if (a[key].some((value) => !allowed.includes(value))) issue(key, 'Выберите варианты для текущего типа проекта');
  };
  const goals = getGoalOptions(data.projectType);
  check('goals', goals);
  check('features', getFeatureOptions(data.projectType));
  check('designStyles', designStyles);
  check('materials', materialOptions);
  if (goals.length && !a.goals.length) issue('goals', 'Выберите хотя бы одну задачу');
  if (!goals.length && a.description.length < 10) issue('description', 'Опишите задачу: не менее 10 символов');
  if (a.goals.includes('Другое') && a.description.length < 10) issue('description', 'Расскажите подробнее о задаче');
  if (a.features.includes('Другое') && a.featureNotes.length < 3) issue('featureNotes', 'Уточните необходимые функции');
  if (a.designStyles.includes(designStyles[2]) && a.designStyles.length > 1) issue('designStyles', 'Выберите направления или вариант «Доверяю вам / пока не знаю»');
  const noMaterials = a.materials.includes('Ничего пока нет');
  if (noMaterials && a.materials.length > 1) issue('materials', 'Вариант «Ничего пока нет» выбирается отдельно');
  if (noMaterials !== (a.readiness === 'Пока ничего нет')) issue('readiness', 'Готовность должна соответствовать выбранным материалам');
  if (a.timeframe === 'Есть конкретная дата') {
    const date = new Date(`${a.launchDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.launchDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== a.launchDate) issue('launchDate', 'Укажите корректную дату запуска');
  } else if (a.launchDate) issue('launchDate', 'Дата указывается только при выборе конкретного срока');
  if (data.projectType !== 'online-store' && a.productCount) issue('productCount', 'Количество товаров указывается для интернет-магазина');
  if (!['site-improvements', 'support'].includes(data.projectType) && a.website) issue('website', 'Адрес существующего сайта указывается для доработки или поддержки');
  const contactValid = a.contactMethod === 'Email'
    ? z.email().safeParse(data.contact).success
    : a.contactMethod === 'Телефон'
      ? /^\+?[\d\s()\-]+$/.test(data.contact) && data.contact.replace(/\D/g, '').length >= 10 && data.contact.replace(/\D/g, '').length <= 15
      : /^@[a-zA-Z0-9_]{5,32}$/.test(data.contact);
  if (!contactValid) ctx.addIssue({ code: 'custom', path: ['contact'], message: a.contactMethod === 'Email' ? 'Укажите корректный email' : a.contactMethod === 'Телефон' ? 'Укажите телефон: от 10 до 15 цифр' : 'Укажите Telegram в формате @username (5–32 символа)' });
});

export type SubmitBriefPayload = z.infer<typeof submitBriefSchema>;
export type BriefAnswers = SubmitBriefPayload['answers'];

export function createBriefDraft(): SubmitBriefPayload {
  return {
    projectType: '', name: '', contact: '',
    answers: {
      goals: [], description: '', productCount: '', website: '', features: [], featureNotes: '',
      designStyles: [], designReference: '', designNotes: '', materials: [], readiness: '',
      timeframe: '', launchDate: '', budget: '', contactMethod: '', comment: '', consent: false,
    },
  };
}

export const briefStepFields = [
  ['projectType'], ['goals', 'description', 'productCount', 'website'], ['features', 'featureNotes'],
  ['designStyles', 'designReference', 'designNotes'], ['materials', 'readiness'],
  ['timeframe', 'launchDate'], ['budget'], ['name', 'contact', 'contactMethod', 'comment', 'consent'],
];
