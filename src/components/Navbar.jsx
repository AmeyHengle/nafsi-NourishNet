import { useNavigate } from 'react-router-dom'
import { useLang } from '../App'
import LanguageToggle from './LanguageToggle'

export default function Navbar({ showBack = true }) {
  const { t } = useLang()
  const navigate = useNavigate()

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-teal-600 transition-colors flex items-center gap-1 text-sm"
          >
            ← {t.nav.back}
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-semibold text-teal-700 text-lg"
        >
          <span>🥦</span>
          <span>{t.app.name}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/submit')}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium hidden sm:block"
        >
          + {t.nav.submit}
        </button>
        <LanguageToggle />
      </div>
    </nav>
  )
}
