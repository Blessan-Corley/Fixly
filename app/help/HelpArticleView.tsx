'use client';

import { ArrowLeft, ThumbsDown, ThumbsUp } from 'lucide-react';

import type { FeedbackErrorMap, FeedbackLoadingMap, FeedbackMap, HelpArticle, HelpCategory } from './help.types';

type HelpArticleViewProps = {
  article: HelpArticle;
  category: HelpCategory;
  feedback: FeedbackMap;
  feedbackError: FeedbackErrorMap;
  feedbackLoading: FeedbackLoadingMap;
  onBack: () => void;
  onFeedback: (articleId: string, helpful: boolean) => Promise<void>;
};

export default function HelpArticleView({
  article,
  category,
  feedback,
  feedbackError,
  feedbackLoading,
  onBack,
  onFeedback,
}: HelpArticleViewProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-fixly-accent hover:text-fixly-accent-dark"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {category.title}
      </button>

      <div className="rounded-lg border border-fixly-border bg-fixly-card p-8">
        <div
          className="prose prose-headings:text-fixly-text prose-p:text-fixly-text prose-li:text-fixly-text prose-strong:text-fixly-text dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <div className="mt-8 border-t border-fixly-border pt-8">
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Was this article helpful?</h3>

          {feedback[article.id] !== undefined ? (
            <p className="text-green-600">Thank you for your feedback!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {feedbackError[article.id] ? (
                <p className="text-sm text-red-600">{feedbackError[article.id]}</p>
              ) : null}
              <div className="flex space-x-4">
                <button
                  onClick={() => void onFeedback(article.id, true)}
                  disabled={feedbackLoading[article.id] === true}
                  className="flex items-center rounded-lg border border-green-200 px-4 py-2 text-green-600 hover:bg-green-50"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  {feedbackLoading[article.id] ? 'Sending...' : 'Yes'}
                </button>
                <button
                  onClick={() => void onFeedback(article.id, false)}
                  disabled={feedbackLoading[article.id] === true}
                  className="flex items-center rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  {feedbackLoading[article.id] ? 'Sending...' : 'No'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
