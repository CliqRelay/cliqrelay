type Listener = (event: MessageEvent) => void;

export class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<string, Listener[]>();
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, fn: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data?: unknown) {
    const event = {
      type,
      data: data === undefined ? undefined : JSON.stringify(data),
    } as MessageEvent;
    this.listeners.get(type)?.forEach((fn) => fn(event));
  }

  static latest() {
    return MockEventSource.instances.at(-1)!;
  }
}
