import { EntityPool } from '../../src/entities/EntityPool';

describe('EntityPool', () => {
  it('acquires a new object when pool is empty', () => {
    let created = 0;
    const pool = new EntityPool(() => { created++; return { alive: false }; });
    pool.acquire();
    expect(created).toBe(1);
  });

  it('reuses a released object instead of creating a new one', () => {
    let created = 0;
    const pool = new EntityPool(() => { created++; return { alive: false }; });
    const obj = pool.acquire();
    pool.release(obj);
    pool.acquire();
    expect(created).toBe(1);
  });

  it('tracks active objects', () => {
    const pool = new EntityPool(() => ({ alive: false }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.active).toContain(a);
    expect(pool.active).toContain(b);
    pool.release(a);
    expect(pool.active).not.toContain(a);
    expect(pool.active).toContain(b);
  });

  it('releaseAll moves all active objects to pool', () => {
    const pool = new EntityPool(() => ({ alive: false }));
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.active).toHaveLength(0);
  });
});
