export type WsHandler = (msg: any) => void;

class WsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private onMsg: (data: any) => void;
  private backoff = 500;
  private timer?: number;

  constructor(url: string, onMsg: (data: any) => void) {
    this.url = url;
    this.onMsg = onMsg;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.backoff = 500;
      };
      this.ws.onmessage = (e) => {
        try { this.onMsg(JSON.parse((e as MessageEvent).data as any)); } catch {}
      };
      this.ws.onclose = () => this.scheduleReconnect();
      this.ws.onerror = () => this.scheduleReconnect();
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.timer) return;
    const delay = Math.min(this.backoff, 30000);
    this.backoff = Math.min(this.backoff * 2, 30000);
    this.timer = window.setTimeout(() => { this.timer = undefined; this.connect(); }, delay);
  }

  send(msg: any) {
    const data = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
    else {
      setTimeout(() => this.send(msg), 300);
    }
  }
}

const WS_URL = 'wss://api-rs.dexcelerate.com/ws';
let shared: WsClient | null = null;
const handlers = new Set<WsHandler>();

function ensure() {
  if (!shared) {
    shared = new WsClient(WS_URL, (msg) => {
      handlers.forEach((h) => {
        try { h(msg); } catch {}
      });
    });
  }
  return shared;
}

export function wsAddHandler(h: WsHandler) {
  ensure();
  handlers.add(h);
}

export function wsRemoveHandler(h: WsHandler) {
  handlers.delete(h);
}

export function wsSend(msg: any) {
  ensure().send(msg);
}
