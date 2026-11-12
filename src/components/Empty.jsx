export default function Empty({ title, children }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  )
}
