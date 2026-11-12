// One small icon set (same artwork as the old app plus a few more). Usage: <Icon name="people" />
const PATHS = {
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
    </>
  ),
  family: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <circle cx="9.5" cy="13" r="1.5" />
      <circle cx="14.5" cy="13" r="1.5" />
      <path d="M7.5 18a2.5 2.5 0 0 1 4 0M12.5 18a2.5 2.5 0 0 1 4 0" />
    </>
  ),
  partners: (
    <>
      <path d="M3 12l4-4 4 3 3-3 7 6" />
      <path d="M3 12v4l5 4 3-2 3 2 7-5v-3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  forward: <path d="M9 5l7 7-7 7" />,
  chevron: <path d="M8 10l4 4 4-4" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 13h5M10 17h5" />
    </>
  ),
  sign: (
    <>
      <path d="M4 20h16" />
      <path d="M5 16c3-8 5-9 6-7s-2 6 0 6 3-5 4-5 .5 3 3 3" />
    </>
  ),
  x: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
}

export default function Icon({ name, small = false }) {
  return (
    <svg className={`ic${small ? ' ic-sm' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
