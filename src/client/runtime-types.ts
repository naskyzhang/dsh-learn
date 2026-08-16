/** Minimal structural types for DSH's browser services used by this package. */

export interface ObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface RpcErrorResult {
  readonly ok: false
  readonly error: { readonly message: string }
}

export interface RpcSuccessResult {
  readonly ok: true
  readonly value: unknown
}

export interface ConnectionHandle {
  readonly rpc: {
    call(
      channel: string,
      endpoint: string,
      payload: unknown,
      signal?: AbortSignal,
    ): Promise<RpcSuccessResult | RpcErrorResult>
  }
}

export interface ClientContext {
  readonly connection: ConnectionHandle
  effect(setup: () => void | (() => void), description: string): void
  readonly slots: {
    inject(name: string, mount: () => (() => void)): void
    register(
      options: {
        name: string
        id: string
        inject?: () => object
      },
      component: unknown,
    ): () => void
  }
}

export type SnapshotSelectorHook<T> = <S>(
  selector: (snapshot: T) => S,
  equal?: (left: S, right: S) => boolean,
) => S
