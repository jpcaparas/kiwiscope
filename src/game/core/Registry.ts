/**
 * Generic keyed registry used for weapons, enemies, pickups and props.
 *
 * New content is added by registering a definition, not by editing a switch.
 *
 * @example
 * const enemies = new Registry<EnemyDef>('enemy');
 * enemies.register('possum', possumDef);
 * enemies.get('possum').speed;
 */
export class Registry<T> {
  private readonly items = new Map<string, T>();

  constructor(private readonly kind: string) {}

  register(id: string, item: T): this {
    if (this.items.has(id)) throw new Error(`Duplicate ${this.kind} id: ${id}`);
    this.items.set(id, item);
    return this;
  }

  get(id: string): T {
    const item = this.items.get(id);
    if (item === undefined) throw new Error(`Unknown ${this.kind}: ${id}`);
    return item;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  ids(): string[] {
    return [...this.items.keys()];
  }

  values(): T[] {
    return [...this.items.values()];
  }
}
