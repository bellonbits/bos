import * as Network from 'expo-network';

type ConnectedCallback = () => void | Promise<void>;

class NetworkMonitorClass {
  private callbacks = new Set<ConnectedCallback>();
  private wasOnline: boolean | null = null;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    // Poll every 10 seconds — expo-network doesn't give reliable change events on all devices
    this.pollIntervalId = setInterval(async () => {
      const online = await this.isOnline();
      if (online && !this.wasOnline) {
        this.wasOnline = true;
        this.callbacks.forEach((cb) => cb());
      } else if (!online) {
        this.wasOnline = false;
      }
    }, 10_000);
  }

  stop(): void {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
  }

  onConnected(cb: ConnectedCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  async isOnline(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.isConnected === true && state.isInternetReachable === true;
    } catch {
      return false;
    }
  }
}

export const NetworkMonitor = new NetworkMonitorClass();
