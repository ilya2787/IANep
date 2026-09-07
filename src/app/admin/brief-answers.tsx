import type { BriefAnswers } from "@/server/brief/brief.schema";

type AnswerKey = keyof BriefAnswers;
type AnswerField = { key: AnswerKey; label: string; link?: boolean };
type AnswerSection = { title: string; fields: AnswerField[] };

const sections: AnswerSection[] = [
  { title: "О проекте", fields: [
    { key: "goals", label: "Задачи" }, { key: "description", label: "Описание" },
    { key: "productCount", label: "Количество товаров" }, { key: "website", label: "Существующий сайт", link: true },
  ] },
  { title: "Функциональность", fields: [
    { key: "features", label: "Необходимые функции" }, { key: "featureNotes", label: "Уточнения" },
  ] },
  { title: "Дизайн", fields: [
    { key: "designStyles", label: "Направление" }, { key: "designReference", label: "Референс", link: true },
    { key: "designNotes", label: "Пожелания" },
  ] },
  { title: "Материалы", fields: [
    { key: "materials", label: "Что уже есть" }, { key: "readiness", label: "Готовность" },
  ] },
  { title: "Сроки", fields: [
    { key: "timeframe", label: "Желаемый срок" }, { key: "launchDate", label: "Дата запуска" },
  ] },
  { title: "Бюджет", fields: [{ key: "budget", label: "Ориентир" }] },
  { title: "Контакты", fields: [
    { key: "contactMethod", label: "Предпочтительный способ связи" }, { key: "comment", label: "Комментарий" },
    { key: "consent", label: "Согласие на обработку данных" },
  ] },
];

function answerValue(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "boolean") return value ? "Подтверждено" : "Не подтверждено";
  if (typeof value === "string") return value.trim();
  return "";
}

export function BriefAnswersView({ answers }: { answers: unknown }) {
  const values = answers && typeof answers === "object" && !Array.isArray(answers) ? answers as Partial<BriefAnswers> : {};

  return (
    <div className="answerSections">
      {sections.map((section) => {
        const visible = section.fields.map((field) => ({ ...field, value: answerValue(values[field.key]) })).filter((field) => Array.isArray(field.value) ? field.value.length : field.value);
        if (!visible.length) return null;
        return (
          <section className="answerSection" key={section.title}>
            <h2>{section.title}</h2>
            <dl>
              {visible.map((field) => (
                <div className="answerRow" key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>{Array.isArray(field.value) ? <ul>{field.value.map((item) => <li key={item}>{item}</li>)}</ul> : field.link && /^https?:\/\//.test(field.value) ? <a href={field.value} target="_blank" rel="noreferrer">{field.value}</a> : field.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
