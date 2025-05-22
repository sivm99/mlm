export type SortOrder = "asc" | "desc";

export type ListingParams<T> = {
  limit?: number;
  cursor?: string;
  search?: string;
  searchColumn?: keyof T;
  sortColumn?: keyof T;
  sortOrder?: SortOrder;
  filters?: Partial<Record<keyof T, unknown>>;
};

export type ListingResult<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};
