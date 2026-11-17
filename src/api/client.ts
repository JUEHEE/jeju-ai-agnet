// API 호출 한 곳.
// - VITE_API_BASE 가 있으면 실제 백엔드(FastAPI)로 보낸다.
// - 없으면 docs/api_examples 의 실제 응답(목업)으로 답한다.
// 화면 코드는 어느 쪽인지 모른다. 연결할 때는 .env 의 주소 하나만 바꾼다.
import type { Envelope } from "./types";
import { mockRequest } from "./mock";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";

export const IS_MOCK = !BASE;
export const API_BASE = BASE;

/** ok:false 응답. error 는 백엔드가 준 한국어 문장이라 그대로 보여줘도 된다 (전달문서 2-3) */
export class ApiError extends Error {
  status: number;
  envelope?: Envelope;
  constructor(message: string, status: number, envelope?: Envelope) {
    super(message);
    this.status = status;
    this.envelope = envelope;
  }
}

type Query = Record<string, string | number | undefined | null>;

export function buildPath(path: string, query?: Query): string {
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}

export async function request<T = unknown>(
  method: "GET" | "POST",
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const url = buildPath(path, opts.query);
  let status: number;
  let data: any;

  if (IS_MOCK) {
    ({ status, data } = await mockRequest(method, url, opts.body));
  } else {
    let res: Response;
    try {
      res = await fetch(BASE + url, {
        method,
        headers: opts.body ? { "Content-Type": "application/json" } : undefined,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      throw new ApiError(`서버에 연결하지 못했어요 (${BASE}). 백엔드가 켜져 있는지 확인해 주세요.`, 0);
    }
    status = res.status;
    data = await res.json().catch(() => null);
  }

  if (status >= 400 || (data && data.ok === false)) {
    const msg = data?.error || data?.detail || `요청 실패 (HTTP ${status})`;
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), status, data);
  }
  return data as T;
}
