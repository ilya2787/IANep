import { Container } from '@/components/layout'
import { Link } from '@/components/ui'
import { ServiceCard } from './ServiceCard'
import { services } from './services.data'
import styles from './Services.module.css'

export function Services() {
	return (
		<section
			className={styles.services}
			id='services'
			aria-labelledby='services-title'
		>
			<Container>
				<div data-reveal className={styles.intro}>
					<div className={styles.introCopy}>
						<h2 className={styles.title} id='services-title'>
							Сайты и web-приложения
						</h2>
					</div>
					<Link className={styles.cta} href='#brief'>
						Рассчитать проект <span aria-hidden='true'>→</span>
					</Link>
				</div>

				<ol className={styles.grid} aria-label='Направления разработки'>
					{services.map(service => (
						<ServiceCard key={service.id} service={service} />
					))}
				</ol>
			</Container>
		</section>
	)
}
