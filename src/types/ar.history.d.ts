import { SelectArHistory } from "@/db/schema";
import { ListingQueryWithFilters } from "./listing";

export type ListArHistoryArgs = ListingQueryWithFilters<SelectArHistory>;
