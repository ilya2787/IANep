export type ApproachStep = {
  id: "understand" | "design" | "develop" | "launch";
  number: string;
  title: string;
  description: string;
  imageLight: string;
  imageDark: string;
};

export const approachSteps: ApproachStep[] = [
  {
    id: "understand",
    number: "01",
    title: "Понимаем вашу задачу",
    description: "Анализируем цели, аудиторию и контекст вашего бизнеса.",
    imageLight: "/images/approach/understand-light.png",
    imageDark: "/images/approach/understand-dark.png",
  },
  {
    id: "design",
    number: "02",
    title: "Проектируем решение",
    description: "Создаём структуру, прототипы и согласовываем логику.",
    imageLight: "/images/approach/design-light.png",
    imageDark: "/images/approach/design-dark.png",
  },
  {
    id: "develop",
    number: "03",
    title: "Разрабатываем и тестируем",
    description: "Пишем чистый код, проверяем качество и доводим до идеала.",
    imageLight: "/images/approach/develop-light.png",
    imageDark: "/images/approach/develop-dark.png",
  },
  {
    id: "launch",
    number: "04",
    title: "Запускаем и поддерживаем",
    description: "Помогаем с запуском, развиваем и остаёмся на связи.",
    imageLight: "/images/approach/launch-light.png",
    imageDark: "/images/approach/launch-dark.png",
  },
];
