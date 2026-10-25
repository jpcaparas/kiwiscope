/**
 * Keyboard + mouse state with pointer lock. Systems poll it each frame;
 * one-shot presses are consumed with `consumePress`.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  mouseDown = false;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    element.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('wheel', (e) => {
      if (this.locked) this.wheel += Math.sign(e.deltaY);
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element;
  }

  lock(): void {
    // Electron/Chromium returns a promise; a rejected request (e.g. too soon after Esc) is harmless.
    const result = this.element.requestPointerLock() as unknown as Promise<void> | undefined;
    result?.catch?.(() => undefined);
  }

  unlock(): void {
    if (this.locked) document.exitPointerLock();
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  consumePress(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Returns and clears accumulated mouse movement since the last call. */
  takeMouseDelta(): { dx: number; dy: number } {
    const d = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return d;
  }

  takeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  reset(): void {
    this.down.clear();
    this.pressed.clear();
    this.mouseDown = false;
    this.mouseDX = this.mouseDY = this.wheel = 0;
  }

  private onKey(e: KeyboardEvent, isDown: boolean): void {
    if (isDown) {
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    } else {
      this.down.delete(e.code);
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
}
