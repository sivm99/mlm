import { SelectAddress, SelectOrder } from "@/db/schema";
import { ListingQueryWithFilters } from "./listing";

export type Order = SelectOrder;
export type OrderId = Order["id"];

export type AddressListingArgs = ListingQueryWithFilters<SelectAddress>;
