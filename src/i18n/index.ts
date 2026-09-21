import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import hi from './locales/hi'

const STORAGE_KEY = 'invoicepro-language'

function getStoredLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'en'
  } catch {
    return 'en'
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'hi') {
  void i18n.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Best-effort only — a private-window/blocked-storage session just won't remember the choice.
  }
}

export default i18n
