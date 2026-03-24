export class EntityPool<T> {
  private pool: T[] = [];
  readonly active: T[] = [];

  constructor(private factory: () => T) {}

  acquire(): T {
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this.active.push(obj);
    return obj;
  }

  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) this.active.splice(idx, 1);
    this.pool.push(obj);
  }

  releaseAll(): void {
    while (this.active.length > 0) {
      this.pool.push(this.active.pop()!);
    }
  }
}
