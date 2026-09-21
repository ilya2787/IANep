export const shots = {
  "home": {
    "src": "/images/projects/propusc-case/home.webp",
    "width": 2800,
    "height": 1788,
    "alt": "Главный экран локальной системы Propusc"
  },
  "phone": {
    "src": "/images/projects/propusc-case/phone.webp",
    "width": 720,
    "height": 1561,
    "alt": "Главный экран Propusc на мобильном устройстве"
  },
  "creation": {
    "src": "/images/projects/propusc-case/creation.webp",
    "width": 2800,
    "height": 1622,
    "alt": "Форма данных, работа с фото и предпросмотр пропуска"
  },
  "preview": {
    "src": "/images/projects/propusc-case/preview.webp",
    "width": 2800,
    "height": 1622,
    "alt": "Предпросмотр A4 с пропусками и оборотными сторонами"
  },
  "print": {
    "src": "/images/projects/propusc-case/print.webp",
    "width": 2800,
    "height": 1628,
    "alt": "Лист A4 в системном диалоге печати"
  },
  "editor": {
    "src": "/images/projects/propusc-case/editor.webp",
    "width": 2800,
    "height": 1628,
    "alt": "Универсальный редактор шаблонов Propusc"
  },
  "users": {
    "src": "/images/projects/propusc-case/users.webp",
    "width": 2800,
    "height": 1626,
    "alt": "Управление пользователями и ролями"
  },
  "audit": {
    "src": "/images/projects/propusc-case/audit.webp",
    "width": 2800,
    "height": 1623,
    "alt": "Журнал действий системы с фильтрами"
  },
  "system": {
    "src": "/images/projects/propusc-case/system.webp",
    "width": 2800,
    "height": 1630,
    "alt": "Системный раздел резервного копирования и восстановления"
  }
} as const;

export type ShotName = keyof typeof shots;
