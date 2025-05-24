import { TreeUser } from "@/types";

export default class Node {
  value: TreeUser;
  leftUser: Node | null;
  rightUser: Node | null;

  constructor(value: TreeUser) {
    this.value = value;
    this.leftUser = null;
    this.rightUser = null;
  }
}
