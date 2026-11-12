/** Placeholder blocks shown while data loads (instead of "Loading..." text). */
export function Skeleton({ height = 18, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />
}

export function CardSkeletons({ count = 3, height = 96 }) {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} style={{ borderRadius: 'var(--r-lg)' }} />
      ))}
    </div>
  )
}

export function Splash() {
  return <div className="splash">Vouchr</div>
}
