import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleItem } from '../../types'
import { fadeUp, staggerContainer, viewportOnce, hoverLift, tapScale } from '../../lib/motion'

function ArticleCard({ article }: { article: ArticleItem }) {
  const reduceMotion = useReducedMotion()
  const hasUrl = article.url.trim().length > 0
  const Wrapper = hasUrl ? 'a' : 'article'
  const linkProps = hasUrl
    ? { href: article.url, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <motion.div
      variants={fadeUp}
      className="article-card__wrap shrink-0 snap-center"
      whileHover={reduceMotion ? undefined : hoverLift}
      whileTap={reduceMotion ? undefined : tapScale}
    >
      <Wrapper
        {...linkProps}
        className={`article-card group block h-full ${hasUrl ? 'cursor-pointer' : ''}`}
      >
        <div className="article-card__media">
          <img
            src={article.image}
            alt=""
            width={640}
            height={400}
            className="article-card__img"
            loading="lazy"
            decoding="async"
          />
          <div className="article-card__overlay" aria-hidden />
          <div className="article-card__shine" aria-hidden />
          {article.readTime && (
            <span className="article-card__badge">{article.readTime}</span>
          )}
        </div>
        <div className="article-card__body">
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span key={tag} className="article-card__tag">
                {tag}
              </span>
            ))}
          </div>
          <h3 className="article-card__title font-display">{article.title}</h3>
          <p className="article-card__excerpt">{article.excerpt}</p>
          {hasUrl && (
            <span className="article-card__cta">
              Read article
              <span className="article-card__arrow" aria-hidden>
                →
              </span>
            </span>
          )}
        </div>
      </Wrapper>
    </motion.div>
  )
}

interface ArticleCarouselProps {
  items: ArticleItem[]
}

export function ArticleCarousel({ items }: ArticleCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const reduceMotion = useReducedMotion()

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 8)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateScrollState, items.length])

  const scrollBy = (direction: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.min(el.clientWidth * 0.85, 420)
    el.scrollBy({ left: direction * amount, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  if (items.length === 0) return null

  if (items.length === 1) {
    return (
      <div className="article-carousel article-carousel--single">
        <ArticleCard article={items[0]} />
      </div>
    )
  }

  return (
    <div className="article-carousel">
      <div className="article-carousel__toolbar">
        <p className="article-carousel__hint">
          <span className="article-carousel__hint-icon" aria-hidden>
            ↔
          </span>
          Scroll to explore {items.length} articles
        </p>
        <div className="article-carousel__controls">
          <button
            type="button"
            className="article-carousel__btn"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll articles left"
          >
            ←
          </button>
          <button
            type="button"
            className="article-carousel__btn"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Scroll articles right"
          >
            →
          </button>
        </div>
      </div>

      <div className="article-carousel__fade article-carousel__fade--left" aria-hidden />
      <div className="article-carousel__fade article-carousel__fade--right" aria-hidden />

      <motion.div
        ref={scrollRef}
        className="article-carousel__track"
        variants={staggerContainer}
        initial={reduceMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={viewportOnce}
        onScroll={updateScrollState}
      >
        {items.map((article) => (
          <ArticleCard key={article.title} article={article} />
        ))}
      </motion.div>
    </div>
  )
}
