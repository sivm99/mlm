import db from "@/db";
import { InsertOrder, ordersTable } from "@/db/schema";

export default class OrderService {
  async placeOrder(order: InsertOrder) {
    return await db.insert(ordersTable).values(order).returning();
  }
}

export const orderService = new OrderService();
