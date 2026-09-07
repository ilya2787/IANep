import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "@/server/db/prisma";
import { hashAdminPassword } from "@/server/auth/admin-password";

async function readHidden(prompt: string) {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Команду нужно запустить в интерактивном терминале");
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const input = chunk.toString("utf8");
      if (input === "\u0003") {
        cleanup();
        reject(new Error("Создание администратора отменено"));
      } else if (input === "\r" || input === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
      } else if (input === "\u007f") {
        value = value.slice(0, -1);
      } else if (!input.startsWith("\u001b")) {
        value += input;
      }
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const readline = createInterface({ input: stdin, output: stdout });
  const username = (await readline.question("Логин администратора: ")).trim();
  readline.close();
  if (!username || username.length > 100) throw new Error("Логин должен содержать от 1 до 100 символов");

  const password = await readHidden("Пароль: ");
  const confirmation = await readHidden("Повторите пароль: ");
  if (password.length < 12) throw new Error("Пароль должен содержать не менее 12 символов");
  if (password !== confirmation) throw new Error("Пароли не совпадают");

  const admin = await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash: hashAdminPassword(password) },
    update: { passwordHash: hashAdminPassword(password), active: true },
    select: { username: true },
  });
  stdout.write(`Администратор ${admin.username} сохранён.\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Не удалось сохранить администратора";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
