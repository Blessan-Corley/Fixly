import type { FaqCategory, HelpArticle, HelpCategory, SearchResult } from './help.types';

export function calculateRelevance(
  query: string,
  item: Pick<HelpArticle, 'title' | 'content'>
): number {
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
  let score = 0;

  searchTerms.forEach((term) => {
    if (item.title.toLowerCase().includes(term)) score += 3;
    if (item.content.toLowerCase().includes(term)) score += 1;
  });

  return score;
}

export function getSearchResults(
  query: string,
  helpCategories: HelpCategory[],
  faqCategories: FaqCategory[]
): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const results: SearchResult[] = [];

  helpCategories.forEach((helpCategory) => {
    helpCategory.articles.forEach((helpArticle) => {
      const score = calculateRelevance(query, helpArticle);
      if (score > 0) {
        results.push({
          ...helpArticle,
          category: helpCategory.title,
          categoryId: helpCategory.id,
          score,
        });
      }
    });
  });

  faqCategories.forEach((faqCategory) => {
    faqCategory.questions.forEach((faq) => {
      const score = calculateRelevance(query, { title: faq.q, content: faq.a });
      if (score > 0) {
        results.push({
          id: `faq-${faq.q.replace(/\s+/g, '-').toLowerCase()}`,
          title: faq.q,
          content: faq.a,
          category: 'FAQ',
          categoryId: 'faq',
          score,
          type: 'faq',
        });
      }
    });
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10);
}
