// 离线环境的最小 Node 类型声明（仅覆盖测试用到的 API）
declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  interface Assert {
    (value: unknown, message?: string): asserts value;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    throws(fn: () => void, error?: ((err: unknown) => boolean) | RegExp, message?: string): void;
  }
  const assert: Assert;
  export default assert;
}

interface Process {
  hrtime: { bigint(): bigint };
  env: Record<string, string | undefined>;
}
declare const process: Process;
