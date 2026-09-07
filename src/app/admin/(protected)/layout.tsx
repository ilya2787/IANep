import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { logoutAdmin } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { requireAdmin } from "@/server/auth/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className={styles.adminRoot}>
      <header className={styles.shellHeader}>
        <div className={styles.brand}><Link href="/admin" className={styles.brandName}>IANep</Link><span className={styles.brandArea}>/ Администратор</span></div>
        <div className={styles.headerActions}><ThemeToggle /><form action={logoutAdmin}><button className={styles.logoutButton} type="submit">Выйти</button></form></div>
      </header>
      <main id="main-content" className={styles.shellMain}>{children}</main>
    </div>
  );
}
