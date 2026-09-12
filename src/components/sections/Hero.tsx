import { Container } from '@/components/layout'
import { ProgressiveImage, SectionLink } from '@/components/ui'
import styles from './Hero.module.css'

export function Hero() {
	return (
		<section data-hero className={styles.hero} aria-labelledby='hero-title'>
			<Container className={styles.stage}>
				<div className={styles.ambientGlow} aria-hidden='true' />

				<h1 className={styles.title} id='hero-title'>
					<span
						data-hero-title-line
						className={styles.titleLead}
					>
						РАЗРАБАТЫВАЕМ
					</span>
					<span className={styles.titleCounterpoint}>
						<span data-hero-title-line className={styles.titleSites}>
							САЙТЫ
						</span>
						<span data-hero-title-line className={styles.titleForBusiness}>
							<span>под ваш</span>
							<span>БИЗНЕС</span>
						</span>
					</span>
				</h1>

				<div data-hero-mascot className={styles.mascotStage}>
					<div data-hero-mascot-motion className={styles.mascot}>
						<ProgressiveImage
							className={styles.mascotImage}
							src='/images/hero-mascot-front-no-eyes-v3.png'
							alt='Фирменный цифровой помощник IANep'
							fill
							priority
							fetchPriority='high'
							quality={90}
							sizes='(max-width: 768px) 88vw, 42vw'
							readyOverlay={
								<div className={styles.visor} aria-hidden='true'>
									<div data-hero-eyes className={styles.eyes}>
										<span className={`${styles.eye} ${styles.eyeLeft}`} />
										<span className={`${styles.eye} ${styles.eyeRight}`} />
									</div>
								</div>
							}
						/>
					</div>
				</div>

				<div data-hero-copy className={styles.copy}>
					<div className={styles.actions}>
						<SectionLink
							className={styles.primaryAction}
							href='#brief'
							variant='primary'
						>
							<span className={styles.actionLabel}>Рассчитать проект</span>
							<svg
								className={styles.actionArrow}
								viewBox='0 0 20 20'
								aria-hidden='true'
							>
								<path d='M4 10h11m-4.5-4.5L15 10l-4.5 4.5' />
							</svg>
						</SectionLink>
					</div>
				</div>
			</Container>
		</section>
	)
}
