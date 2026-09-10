const EMAIL_ORIGIN = "https://ianep.ru";

export type NotificationEmailInput = {
  title: string;
  message: string;
  href?: string | null;
};

export function notificationEmail(input: NotificationEmailInput) {
  const link = notificationLink(input.href);
  const escapedTitle = escapeHtml(input.title);
  const escapedMessage = escapeHtml(input.message).replace(/\r?\n/g, "<br>");
  const escapedLink = link ? escapeHtml(link) : null;
  const action = escapedLink
    ? `<tr><td style="padding:0 40px 40px 40px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:10px;background:#6f52ff"><a href="${escapedLink}" style="display:inline-block;padding:15px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap">Открыть в IANep</a></td></tr></table></td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapedTitle}</title></head>
<body style="margin:0;padding:0;background:#05050c;color:#f7f7fb">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapedTitle}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#05050c">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #29283a;border-radius:16px;background:#0d0d18">
<tr><td style="height:4px;border-radius:16px 16px 0 0;background:#6f52ff;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:34px 40px 16px 40px;font-family:Arial,Helvetica,sans-serif">
<div style="font-size:19px;line-height:24px;font-weight:700;letter-spacing:-0.4px;color:#f8f7ff">IANep</div>
<div style="padding-top:26px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#9db8ff">Уведомление по проекту</div>
</td></tr>
<tr><td style="padding:0 40px 18px 40px;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:38px;font-weight:700;letter-spacing:-0.8px;color:#f7f7fb">${escapedTitle}</td></tr>
<tr><td style="padding:0 40px 32px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#c8c6d2">${escapedMessage}</td></tr>
${action}
<tr><td style="padding:26px 40px 32px 40px;border-top:1px solid #29283a;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#8f8d9b">
Конфиденциальные материалы и файлы не прикладываются к письму. Открывайте их только в защищённом кабинете IANep.<br><br>
Это автоматическое уведомление. Отвечать на это письмо не нужно.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "IANep",
    "Уведомление по проекту",
    "",
    input.title,
    "",
    input.message,
    ...(link ? ["", `Открыть в IANep: ${link}`] : []),
    "",
    "Конфиденциальные материалы и файлы не прикладываются к письму. Открывайте их только в защищённом кабинете IANep.",
    "",
    "Это автоматическое уведомление. Отвечать на это письмо не нужно.",
  ].join("\n");

  return { subject: `IANep: ${input.title}`, text, html };
}

export function notificationLink(href?: string | null) {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href, EMAIL_ORIGIN);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== EMAIL_ORIGIN || url.username || url.password) return null;
  return url.toString();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
