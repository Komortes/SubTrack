import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? "en";

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: deviceLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18next;
