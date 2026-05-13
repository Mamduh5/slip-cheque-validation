import { enMessages } from "@/lib/i18n/messages/en";
import { thMessages } from "@/lib/i18n/messages/th";

export const defaultLocale = "en";
export const supportedLocales = ["en", "th"] as const;
export const localePreferenceCookieName = "ui_locale";
export const localePreferenceCookieMaxAge = 60 * 60 * 24 * 365;

export type SupportedLocale = (typeof supportedLocales)[number];
export type LocaleSource = "explicit" | "saved" | "detected" | "fallback";

type MessageLeaf = string;
export type MessageTree = {
  readonly [key: string]: MessageLeaf | MessageTree;
};

type DotPrefix<TPrefix extends string, TKey extends string> = TPrefix extends "" ? TKey : `${TPrefix}.${TKey}`;
type LeafPaths<TTree, TPrefix extends string = ""> = {
  [TKey in keyof TTree & string]: TTree[TKey] extends MessageLeaf
    ? DotPrefix<TPrefix, TKey>
    : TTree[TKey] extends MessageTree
      ? LeafPaths<TTree[TKey], DotPrefix<TPrefix, TKey>>
      : never;
}[keyof TTree & string];

export type TranslationKey = LeafPaths<typeof enMessages>;
export type TranslationValues = Record<string, string | number>;
export type TranslationResources = Record<SupportedLocale, MessageTree>;

export const messages = {
  en: enMessages,
  th: thMessages
} as const satisfies TranslationResources;

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function ensureSupportedLocale(locale: string | null | undefined): SupportedLocale {
  return locale && isSupportedLocale(locale) ? locale : defaultLocale;
}

export function mapLocaleTagToSupportedLocale(localeTag: string | null | undefined): SupportedLocale | null {
  if (!localeTag) {
    return null;
  }

  const normalized = localeTag.trim().toLowerCase();

  if (normalized === "th" || normalized.startsWith("th-")) {
    return "th";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return null;
}

export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null | undefined): SupportedLocale | null {
  if (!acceptLanguage) {
    return null;
  }

  const candidates = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [localeTag, ...parameters] = part.trim().split(";");
      const qValue = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="))
        ?.slice(2);
      const quality = qValue ? Number(qValue) : 1;

      return {
        index,
        localeTag,
        quality: Number.isFinite(quality) ? quality : 0
      };
    })
    .filter((candidate) => candidate.localeTag && candidate.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const candidate of candidates) {
    const locale = mapLocaleTagToSupportedLocale(candidate.localeTag);

    if (locale) {
      return locale;
    }
  }

  return null;
}

export function resolveLocalePreference({
  explicitLocale,
  savedLocale,
  acceptLanguage
}: {
  explicitLocale?: string | null;
  savedLocale?: string | null;
  acceptLanguage?: string | null;
}): { locale: SupportedLocale; source: LocaleSource } {
  if (explicitLocale && isSupportedLocale(explicitLocale)) {
    return { locale: explicitLocale, source: "explicit" };
  }

  if (savedLocale && isSupportedLocale(savedLocale)) {
    return { locale: savedLocale, source: "saved" };
  }

  const detectedLocale = detectLocaleFromAcceptLanguage(acceptLanguage);

  if (detectedLocale) {
    return { locale: detectedLocale, source: "detected" };
  }

  return { locale: defaultLocale, source: "fallback" };
}

export function translate(locale: SupportedLocale, key: TranslationKey, values?: TranslationValues): string {
  return resolveTranslation(messages, locale, key, values);
}

export function createTranslator(locale: SupportedLocale) {
  return (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values);
}

export function resolveTranslation(
  resources: TranslationResources,
  locale: SupportedLocale,
  key: string,
  values?: TranslationValues
) {
  const localizedMessage = getMessageAtPath(resources[locale], key);
  const fallbackMessage = getMessageAtPath(resources[defaultLocale], key);

  return interpolateMessage(localizedMessage ?? fallbackMessage ?? key, values);
}

function getMessageAtPath(tree: MessageTree, key: string) {
  let current: MessageTree | MessageLeaf | undefined = tree;

  for (const part of key.split(".")) {
    if (!current || typeof current === "string") {
      return undefined;
    }

    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolateMessage(message: string, values?: TranslationValues) {
  if (!values) {
    return message;
  }

  return message.replace(/\{([A-Za-z0-9_]+)\}/g, (match, token: string) => {
    const value = values[token];

    return value === undefined ? match : String(value);
  });
}
