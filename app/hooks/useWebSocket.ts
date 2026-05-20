/**
 * useWebSocket — PC サーバへの接続を 1 本管理する hook。
 *
 * Console log naming convention: APP_10 番台
 */

import { useCallback, useRef, useState } from "react";
import type {
  ConnectionSettings,
  ConnectionState,
  KeyEvent,
  ServerMessage,
} from "../types";

export interface UseWebSocketResult {
  state: ConnectionState;
  lastError: string | null;
  connect: (settings: ConnectionSettings) => void;
  disconnect: () => void;
  sendKeyPress: (key: string, layer: number, event: KeyEvent) => void;
}

export function useWebSocket(): UseWebSocketResult {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const settingsRef = useRef<ConnectionSettings | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(1000);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (settings: ConnectionSettings) => {
      clearTimer();
      wsRef.current?.close();
      settingsRef.current = settings;
      retryDelayRef.current = 1000;

      const url = `ws://${settings.serverHost}:${settings.serverPort}`;
      console.info(`APP_10 connecting to ${url}`);
      setState("connecting");
      setLastError(null);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.info("APP_10 connected");
        retryDelayRef.current = 1000;
        setState("connected");
        ws.send(
          JSON.stringify({
            type: "hello",
            device_name: "KeyDeck-Android",
            app_version: "0.1.0",
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const msg: ServerMessage = JSON.parse(e.data as string);
          dispatchServerMessage(msg);
        } catch (err) {
          console.warn("APP_10 message parse error:", err);
        }
      };

      ws.onerror = () => {
        console.warn("APP_10 WebSocket error");
        setLastError("Connection error");
        setState("error");
      };

      ws.onclose = () => {
        console.info("APP_11 disconnected");
        wsRef.current = null;
        setState("disconnected");

        const s = settingsRef.current;
        if (s?.autoReconnect) {
          const delay = retryDelayRef.current;
          console.info(`APP_11 reconnecting in ${delay}ms`);
          timerRef.current = setTimeout(() => {
            retryDelayRef.current = Math.min(delay * 2, 30_000);
            if (settingsRef.current) connect(settingsRef.current);
          }, delay);
        }
      };
    },
    [clearTimer]
  );

  const disconnect = useCallback(() => {
    clearTimer();
    settingsRef.current = null; // prevent autoReconnect
    wsRef.current?.close();
    wsRef.current = null;
    setState("disconnected");
    console.info("APP_11 manually disconnected");
  }, [clearTimer]);

  const sendKeyPress = useCallback(
    (key: string, layer: number, event: KeyEvent) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("APP_12 sendKeyPress: not connected");
        return;
      }
      console.info(`APP_12 sendKeyPress key=${key} layer=${layer} event=${event}`);
      ws.send(JSON.stringify({ type: "keypress", key, layer, event }));
    },
    []
  );

  return { state, lastError, connect, disconnect, sendKeyPress };
}

function dispatchServerMessage(msg: ServerMessage): void {
  if (msg.type === "server_hello") {
    console.info(
      `APP_11 server_hello platform=${msg.platform} version=${msg.server_version}`
    );
  } else if (msg.type === "ack") {
    if (!msg.ok) {
      console.warn(`APP_11 ack error: key=${msg.key} error=${msg.error}`);
    }
  }
}
