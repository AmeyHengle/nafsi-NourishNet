import { useLang } from '../App'

export default function CommunityBadge({ source, status }) {
  const { t } = useLang()

  if (source === 'community') {
    return (
      <span className="badge bg-teal-50 text-teal-700 border border-teal-200">
        ✦ {t.badge.community}
      </span>
    )
  }
  if (status === 'unverified') {
    return (
      <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
        ⚠ {t.badge.unverified}
      </span>
    )
  }
  return null
}
