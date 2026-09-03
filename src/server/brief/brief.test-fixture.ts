import { createBriefDraft, type SubmitBriefPayload } from './brief.schema';

export function validBriefPayload(): SubmitBriefPayload {
  const draft = createBriefDraft();
  return {
    ...draft, name: ' Тест API ', contact: ' api@example.com ', projectType: 'landing-page',
    answers: {
      ...draft.answers, goals: ['Получать заявки'], features: ['Форма обратной связи'],
      materials: ['Ничего пока нет'], readiness: 'Пока ничего нет', timeframe: 'Конкретного срока нет',
      budget: 'Пока не определён', contactMethod: 'Email', consent: true,
    },
  };
}
