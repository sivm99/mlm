import { SelectArHistory } from "@/db/schema";

export type ListArHistoryArgs = {
  pagination: { page?: number; limit?: number };
  filter: {
    fromUserId?: SelectArHistory["fromUserId"];
    toUserId?: SelectArHistory["toUserId"];
    activityType?: SelectArHistory["activityType"];
  };
};
