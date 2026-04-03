'use client';

import { Search } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { FAQS, HELP_CATEGORIES } from './help.data';
import type { FeedbackErrorMap, FeedbackLoadingMap, FeedbackMap } from './help.types';
import { getSearchResults } from './help.utils';
import HelpArticleView from './HelpArticleView';
import HelpCategoriesGrid from './HelpCategoriesGrid';
import HelpCategoryView from './HelpCategoryView';
import HelpContactSupport from './HelpContactSupport';
import HelpFaqSection from './HelpFaqSection';
import HelpSearchResults from './HelpSearchResults';

export default function HelpPage() {
  const [categoryParam, setCategoryParam] = useQueryState('category', parseAsString);
  const [articleParam, setArticleParam] = useQueryState('article', parseAsString);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(articleParam);
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set<string>());
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [feedbackLoading, setFeedbackLoading] = useState<FeedbackLoadingMap>({});
  const [feedbackError, setFeedbackError] = useState<FeedbackErrorMap>({});
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setSelectedArticle(articleParam);
  }, [categoryParam, articleParam]);

  useEffect(() => {
    void setCategoryParam(selectedCategory ?? null);
  }, [selectedCategory, setCategoryParam]);

  useEffect(() => {
    void setArticleParam(selectedArticle ?? null);
  }, [selectedArticle, setArticleParam]);

  useEffect(() => {
    setIsInteractive(true);
  }, []);

  const toggleFAQ = (id: string): void => {
    setExpandedFAQs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitFeedback = async (articleId: string, helpful: boolean): Promise<void> => {
    const activeCategory = selectedCategory ?? 'general';
    const rating = helpful ? 5 : 1;

    try {
      setFeedbackLoading((prev) => ({ ...prev, [articleId]: true }));
      setFeedbackError((prev) => ({ ...prev, [articleId]: '' }));

      const response = await fetch('/api/help/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          articleId,
          message: helpful
            ? 'This help article solved my problem and was useful.'
            : 'This help article did not solve my problem and needs improvement.',
          rating,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (response.ok) {
        setFeedback((prev) => ({ ...prev, [articleId]: helpful }));
        toast.success('Thank you for your feedback!');
        return;
      }

      const message = payload.message ?? 'Failed to submit feedback';
      setFeedbackError((prev) => ({ ...prev, [articleId]: message }));
      toast.error(message);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const message = 'Failed to submit feedback';
      setFeedbackError((prev) => ({ ...prev, [articleId]: message }));
      toast.error(message);
    } finally {
      setFeedbackLoading((prev) => ({ ...prev, [articleId]: false }));
    }
  };

  const searchResults = getSearchResults(searchQuery, HELP_CATEGORIES, FAQS);

  const activeCategory = HELP_CATEGORIES.find((c) => c.id === selectedCategory);
  const activeArticle = activeCategory?.articles.find((a) => a.id === selectedArticle);

  const renderContent = (): React.ReactNode => {
    if (selectedArticle && activeCategory && activeArticle) {
      return (
        <HelpArticleView
          article={activeArticle}
          category={activeCategory}
          feedback={feedback}
          feedbackError={feedbackError}
          feedbackLoading={feedbackLoading}
          onBack={() => setSelectedArticle(null)}
          onFeedback={submitFeedback}
        />
      );
    }

    if (selectedCategory && activeCategory) {
      return (
        <HelpCategoryView
          category={activeCategory}
          onBack={() => setSelectedCategory(null)}
          onArticleSelect={setSelectedArticle}
        />
      );
    }

    return (
      <div className="mx-auto max-w-6xl">
        {searchQuery ? (
          <HelpSearchResults
            results={searchResults}
            query={searchQuery}
            onArticleSelect={(categoryId, articleId) => {
              setSelectedCategory(categoryId);
              setSelectedArticle(articleId);
            }}
            onFaqToggle={toggleFAQ}
          />
        ) : (
          <>
            <HelpCategoriesGrid
              categories={HELP_CATEGORIES}
              onCategorySelect={setSelectedCategory}
            />
            <HelpFaqSection faqs={FAQS} expandedFAQs={expandedFAQs} onToggle={toggleFAQ} />
          </>
        )}
        <HelpContactSupport />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      <div className="border-b border-fixly-border bg-fixly-card">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold text-fixly-text">How can we help you?</h1>
            <p className="mb-8 text-lg text-fixly-text-light">
              Find answers to common questions or browse our help topics
            </p>
            <div className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted dark:text-fixly-text-light" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  disabled={!isInteractive}
                  className="w-full rounded-xl border border-fixly-border bg-white py-4 pl-12 pr-4 text-lg text-fixly-text transition-colors placeholder:text-fixly-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent dark:bg-fixly-card dark:text-fixly-text"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">{renderContent()}</div>
    </div>
  );
}
