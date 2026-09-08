"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section role="alert"><h2>Не удалось загрузить кабинет</h2><p>Попробуйте снова. Ваши сохранённые решения остаются в истории.</p><button onClick={reset}>Повторить</button></section>; }
