import { ListingQuerySchema } from "@/validation/_common";
type NoUndefined<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined>;
};
export type Listing<T> = {
  list: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type ListingQueryWithFilters<T> = {
  pagination: ListingQuerySchema;
  filter: {
    [K in keyof T]?: T[K];
  };
};

export type ListingQuery = NoUndefined<ListingQuerySchema>;

// export type
