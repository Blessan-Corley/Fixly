import type { DailyViewEntry, JobDocument, ObjectIdLike, ViewerEntry } from '../types';

export function addView(
  this: JobDocument,
  userId: ObjectIdLike,
  ipAddress: string | undefined,
  userAgent: string | undefined
) {
  if (this.createdBy.toString() === userId.toString()) {
    return {
      count: this.views?.count || 0,
      didIncrement: false,
    };
  }

  if (!this.views) {
    this.views = {
      count: 0,
      uniqueViewers: [],
      dailyViews: [],
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  const viewedToday = this.views.uniqueViewers.some(
    (view: ViewerEntry) =>
      view.userId &&
      view.userId.toString() === userId.toString() &&
      new Date(view.viewedAt) >= today
  );

  if (!viewedToday) {
    this.views.count += 1;

    this.views.uniqueViewers.push({
      userId,
      viewedAt: new Date(),
      ipAddress,
      userAgent,
    });

    const existingDayIndex = this.views.dailyViews.findIndex(
      (dailyView: DailyViewEntry) => dailyView.date === todayString
    );

    if (existingDayIndex > -1) {
      this.views.dailyViews[existingDayIndex].count += 1;
    } else {
      this.views.dailyViews.push({
        date: todayString,
        count: 1,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];

    this.views.dailyViews = this.views.dailyViews.filter(
      (dailyView: DailyViewEntry) => dailyView.date >= thirtyDaysAgoString
    );

    if (this.views.uniqueViewers.length > 1000) {
      this.views.uniqueViewers = this.views.uniqueViewers.slice(-1000);
    }
  }

  return {
    count: this.views.count,
    didIncrement: !viewedToday,
  };
}
