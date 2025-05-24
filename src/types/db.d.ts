import { SQL } from "drizzle-orm";

export interface ListingParams<TSelect = any> {
  limit?: number;
  cursor?: string;
  search?: string;
  searchColumn?: keyof TSelect;
  sortColumn?: keyof TSelect;
  sortOrder?: "asc" | "desc";
  filters?: Partial<Record<keyof TSelect, any>>;
  select?: (keyof TSelect)[];
  relations?: string[];
  customWhere?: SQL[];
}

export interface ListingResult<TSelect> {
  data: TSelect[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface PaginationInfo {
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
}

export interface AdvancedListingParams<TSelect = any>
  extends ListingParams<TSelect> {
  includeTotal?: boolean;
  distinct?: keyof TSelect;
  groupBy?: (keyof TSelect)[];
  having?: SQL[];
}

export interface AdvancedListingResult<TSelect> extends ListingResult<TSelect> {
  pagination?: PaginationInfo;
}
