// Cloudflare Pages Function: receives Sesim Var's anonymous usage counts and
// keeps one row per device per day in D1 (binding DB, database "sesimvar-usage").
// The IP address and anything else about the request is not stored.
import { parseUsageReport } from '../../src/lib/usage-report';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
}
interface D1 {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
}
interface Ctx {
  request: Request;
  env: { DB?: D1 };
}

const UPSERT = `INSERT INTO usage (device, day, taps, sentences, sends, kind, installed, version, received)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
  ON CONFLICT(device, day) DO UPDATE SET
    taps = MAX(taps, excluded.taps),
    sentences = MAX(sentences, excluded.sentences),
    sends = MAX(sends, excluded.sends),
    kind = excluded.kind, installed = excluded.installed, version = excluded.version, received = excluded.received`;

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!env.DB) return new Response('not configured', { status: 503 });
  const text = await request.text();
  if (text.length > 20_000) return new Response('too large', { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const report = parseUsageReport(body);
  if (!report) return new Response('bad report', { status: 400 });
  const received = new Date().toISOString();
  const stmt = env.DB.prepare(UPSERT);
  await env.DB.batch(
    report.days.map((d) =>
      stmt.bind(report.device, d.day, d.taps, d.sentences, d.sends, report.kind, report.installed ? 1 : 0, report.version, received),
    ),
  );
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
