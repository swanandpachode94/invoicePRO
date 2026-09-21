import { useTranslation } from 'react-i18next'
import { setLanguage } from '@/i18n'

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const isHindi = i18n.language === 'hi'

  return (
    <div className={`inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold ${className}`}>
      <button
        onClick={() => setLanguage('en')}
        className={`min-w-[2.5rem] rounded-full px-3 py-1.5 transition-colors ${!isHindi ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('hi')}
        className={`min-w-[2.5rem] rounded-full px-3 py-1.5 transition-colors ${isHindi ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}
      >
        हिं
      </button>
    </div>
  )
}
