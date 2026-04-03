import type { LucideIcon } from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  articles: HelpArticle[];
}

export interface FaqQuestion {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  questions: FaqQuestion[];
}

export type SearchResult =
  | (HelpArticle & {
      category: string;
      categoryId: string;
      score: number;
      type?: 'article';
    })
  | {
      id: string;
      title: string;
      content: string;
      category: 'FAQ';
      categoryId: 'faq';
      score: number;
      type: 'faq';
    };

export type FeedbackMap = Record<string, boolean>;
export type FeedbackLoadingMap = Record<string, boolean>;
export type FeedbackErrorMap = Record<string, string>;
