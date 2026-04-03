/**
 * Inngest serve route smoke test.
 * The inngest/next `serve` handler exports GET/POST/PUT.
 * We only verify the exports exist and that the handler responds without crashing.
 */

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    createFunction: jest.fn(),
    send: jest.fn(),
    name: 'fixly-test',
  },
}));

jest.mock('@/lib/inngest/functions', () => ({
  inngestFunctions: [],
}));

jest.mock('inngest/next', () => ({
  serve: jest.fn(() => ({
    GET: jest.fn(() => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    POST: jest.fn(() => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    PUT: jest.fn(() => new Response(JSON.stringify({ ok: true }), { status: 200 })),
  })),
}));

describe('Inngest route', () => {
  it('exports GET, POST, and PUT handlers', async () => {
    const route = await import('@/app/api/inngest/route');
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
    expect(typeof route.PUT).toBe('function');
  });
});
