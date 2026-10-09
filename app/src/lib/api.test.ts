import { ApiError, request, setCsrfToken, upload } from './api';

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
  );
}

describe('request', () => {
  it('unwraps the error envelope into ApiError', async () => {
    mockFetch(422, { error: { code: 'validation_failed', message: 'bad', fields: { slug: 'required' } } });
    const err = await request('POST', '/api/admin/projects', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'validation_failed', fields: { slug: 'required' } });
  });

  it('sends the CSRF header on mutations only, and JSON content-type', async () => {
    const spy = mockFetch(200, { ok: true });
    setCsrfToken('tok');
    await request('POST', '/api/x', { a: 1 });
    await request('GET', '/api/y');
    const [, postInit] = spy.mock.calls[0];
    const [, getInit] = spy.mock.calls[1];
    expect(new Headers(postInit!.headers).get('X-CSRF-Token')).toBe('tok');
    expect(new Headers(postInit!.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(getInit!.headers).get('X-CSRF-Token')).toBeNull();
    expect(postInit!.credentials).toBe('same-origin');
    setCsrfToken(null);
  });

  it('returns undefined for 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(request('DELETE', '/api/admin/projects/1')).resolves.toBeUndefined();
  });

  it('maps non-JSON failures to a generic ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response('<html>502</html>', { status: 502 })));
    await expect(request('GET', '/api/projects')).rejects.toMatchObject({ status: 502, code: 'http_502' });
  });

  it('rejects a 200 with a non-JSON body as bad_response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response('<html>spa</html>', { status: 200 })));
    await expect(request('GET', '/api/projects')).rejects.toMatchObject({ status: 200, code: 'bad_response' });
  });

  it('rejects with network when the body read fails', async () => {
    const res = new Response('{}', { status: 200 });
    vi.spyOn(res, 'text').mockRejectedValue(new Error('reset'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res);
    await expect(request('GET', '/api/projects')).rejects.toMatchObject({ status: 0, code: 'network' });
  });

  it('upload sends multipart without JSON content-type', async () => {
    const spy = mockFetch(201, { id: 1, url: '/uploads/a.png' });
    setCsrfToken('tok');
    await upload(new File(['x'], 'a.png', { type: 'image/png' }));
    const init = spy.mock.calls[0][1]!;
    expect(init.body).toBeInstanceOf(FormData);
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('tok');
    setCsrfToken(null);
  });
});
