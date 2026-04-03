export type LegacyViewerEntry = {
  userId?: unknown;
};

export type LegacyDailyViewEntry = {
  date?: unknown;
  count?: unknown;
};

export type TrackableJobProjection = {
  _id?: unknown;
  createdBy?: unknown;
  applications?: Array<{ status?: unknown }> | null;
  comments?: Array<{ _id?: unknown }> | null;
  views?: {
    count?: unknown;
    dailyViews?: LegacyDailyViewEntry[] | null;
    uniqueViewers?: LegacyViewerEntry[] | null;
  } | null;
};

export type TrackViewResult = {
  applicationCount: number;
  commentCount: number;
  viewCount: number;
  viewTracked: boolean;
};

export type DailyViewAggregate = {
  _id: string;
  count: number;
};
