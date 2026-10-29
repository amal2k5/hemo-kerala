import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import ml from "./locales/ml.json"

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ml", label: "മലയാളം" },
]

const LANGUAGE_STORAGE_KEY = "hemokerala.language"

export function getInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      return stored
    }
  } catch {
    // Storage unavailable; fall through to browser preference.
  }
  const browser = (navigator.language || "en").toLowerCase()
  return browser.startsWith("ml") ? "ml" : "en"
}

export function persistLanguage(code) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch {
    // Ignore; the choice just won't survive a reload.
  }
  document.documentElement.lang = code
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ml: { translation: ml },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

export default i18n
