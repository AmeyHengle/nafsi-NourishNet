import { useLang } from '../App'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm font-medium">
      {['en', 'es'].map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 transition-colors ${
            lang === l
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
