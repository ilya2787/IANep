export const shots = {
  "home": {
    "src": "/images/projects/propusc-case/home.png",
    "width": 2838,
    "height": 1812,
    "alt": "Главный экран локальной системы Propusc"
  },
  "phone": {
    "src": "/images/projects/propusc-case/phone.png",
    "width": 1290,
    "height": 2796,
    "alt": "Главный экран Propusc на мобильном устройстве"
  },
  "creation": {
    "src": "/images/projects/propusc-case/creation.png",
    "width": 3419,
    "height": 1980,
    "alt": "Форма данных, работа с фото и предпросмотр пропуска"
  },
  "preview": {
    "src": "/images/projects/propusc-case/preview.png",
    "width": 3419,
    "height": 1980,
    "alt": "Предпросмотр A4 с пропусками и оборотными сторонами"
  },
  "print": {
    "src": "/images/projects/propusc-case/print.png",
    "width": 3419,
    "height": 1988,
    "alt": "Лист A4 в системном диалоге печати"
  },
  "editor": {
    "src": "/images/projects/propusc-case/editor.png",
    "width": 3419,
    "height": 1988,
    "alt": "Универсальный редактор шаблонов Propusc"
  },
  "users": {
    "src": "/images/projects/propusc-case/users.png",
    "width": 3419,
    "height": 1985,
    "alt": "Управление пользователями и ролями"
  },
  "audit": {
    "src": "/images/projects/propusc-case/audit.png",
    "width": 3419,
    "height": 1982,
    "alt": "Журнал действий системы с фильтрами"
  },
  "system": {
    "src": "/images/projects/propusc-case/system.png",
    "width": 3419,
    "height": 1990,
    "alt": "Системный раздел резервного копирования и восстановления"
  }
} as const;

export type ShotName = keyof typeof shots;
