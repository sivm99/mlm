import db from "@/db";
import { InsertOrder, orderItemsTable, ordersTable } from "@/db/schema";
import { OrderId } from "@/types";

export default class OrderService {
  #orderItemReturn = {
    id: orderItemsTable.id,
    price: orderItemsTable.price,
    quantity: orderItemsTable.quantity,
  };
  async placeOrder(orders: InsertOrder[]) {
    return await db.insert(ordersTable).values(orders).returning();
  }
  async placeActiveOrder(order: InsertOrder) {
    // we will get the orderId and then make a orderItem entry
    // return the populated data to them,
    const [newOrder] = await db.insert(ordersTable).values(order).returning();

    const [orderItem] = await db
      .insert(orderItemsTable)
      .values({
        price: 100,
        orderId: newOrder.id,
        quantity: 2,
      })
      .returning(this.#orderItemReturn);

    return {
      ...newOrder,
      ...orderItem,
    };
  }

  async placeSalesRewardOrder(orderId: OrderId, totalAmount: number = 100) {
    const [orderItem] = await db
      .insert(orderItemsTable)
      .values({ orderId, price: totalAmount, quantity: 6 })
      .returning(this.#orderItemReturn);
    return orderItem;
  }
}

export const orderService = new OrderService();
