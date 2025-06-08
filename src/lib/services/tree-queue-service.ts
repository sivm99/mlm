type Task = () => Promise<void>;

class TreeQueueService {
  private queues: Map<number, Task[]> = new Map();
  private running: Set<number> = new Set();

  async enqueue(treeId: number, task: Task) {
    if (!this.queues.has(treeId)) {
      this.queues.set(treeId, []);
    }

    this.queues.get(treeId)!.push(task);
    await this.runNext(treeId);
  }

  private async runNext(treeId: number) {
    if (this.running.has(treeId)) return;

    const queue = this.queues.get(treeId);
    if (!queue || queue.length === 0) return;

    this.running.add(treeId);
    const task = queue.shift()!;

    try {
      await task();
    } catch (err) {
      console.error(`Error running queued task for treeId=${treeId}:`, err);
    } finally {
      this.running.delete(treeId);
      if (queue.length > 0) {
        this.runNext(treeId);
      }
    }
  }
}

export const treeQueueService = new TreeQueueService();
