// @ts-nocheck — local dev server only, not used in production
import 'dotenv/config';
import http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import analyzeHandler from './api/analyze';
import healthHandler from './api/health';

const PORT = 3000;

function mockVercelReq(req: IncomingMessage, body: string) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  return Object.assign(req, {
    query: Object.fromEntries(url.searchParams),
    body: body ? JSON.parse(body) : {},
  });
}

function mockVercelRes(res: ServerResponse) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const originalEnd = res.end.bind(res);

  return Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(data: unknown) {
      for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
      res.setHeader('Content-Type', 'application/json');
      originalEnd(JSON.stringify(data));
      return this;
    },
    end(...args: Parameters<ServerResponse['end']>) {
      for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
      return originalEnd(...args);
    },
  });
}

const server = http.createServer((req, res) => {
  const vRes = mockVercelRes(res);

  if (req.method === 'OPTIONS') {
    vRes.status(204).end();
    return;
  }

  console.log(`→ ${req.method} ${req.url}`);
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const vReq = mockVercelReq(req, body) as Parameters<typeof analyzeHandler>[0];
    const path = req.url?.split('?')[0];

    if (path === '/api/analyze') return analyzeHandler(vReq, vRes as Parameters<typeof analyzeHandler>[1]);
    if (path === '/api/health') return healthHandler(vReq, vRes as Parameters<typeof healthHandler>[1]);

    vRes.status(404).json({ error: 'Not found' });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend ready at http://127.0.0.1:${PORT}`);
});
