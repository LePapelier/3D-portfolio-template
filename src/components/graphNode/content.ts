import type { Language } from '../../store/graph/types'
import type { CardNodeContent } from './types'
import { cardContentEn } from '../../../portfolio/cards/en'
import { cardContentFr } from '../../../portfolio/cards/fr'

const cardNodeContentsByLanguage: Record<Language, Record<string, CardNodeContent>> = {
  en: cardContentEn,
  fr: cardContentFr,
}

export function getCardNodeContent(templateKey: string, language: Language): CardNodeContent | undefined {
  return cardNodeContentsByLanguage[language][templateKey] ?? cardNodeContentsByLanguage.en[templateKey]
}
