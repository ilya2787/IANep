import Link from "next/link";
import styles from "@/app/admin/admin.module.css";

export default function BriefNotFound() {
  return <section className={styles.emptyState}><h1>Заявка не найдена</h1><p>Проверьте адрес или вернитесь к списку заявок.</p><Link className={styles.backLink} href="/admin">Вернуться к заявкам</Link></section>;
}
