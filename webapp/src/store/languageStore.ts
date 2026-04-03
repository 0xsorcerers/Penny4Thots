import { create } from "zustand";
import { persist } from "zustand/middleware";
import { availableLanguages, type LanguageCode } from "@/tools/languages";

interface LanguageStore {
  selectedLanguage: LanguageCode;
  setSelectedLanguage: (language: LanguageCode) => void;
}

// Default to EN (English)
const defaultLanguage: LanguageCode = "EN";

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      selectedLanguage: defaultLanguage,

      setSelectedLanguage: (language) => {
        set({ selectedLanguage: language });
      },
    }),
    {
      name: "penny4thots-language",
    }
  )
);

// Helper to get current language (for use outside of React components)
export const getCurrentLanguage = (): LanguageCode => {
  return useLanguageStore.getState().selectedLanguage;
};
