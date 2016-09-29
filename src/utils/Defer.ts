import * as Promise from 'bluebird';

export interface IDeferred<T> {
  resolve: (result: T) => void;
  reject: (err: T) => void;
  promise: Promise<T>;
}

export function defer<T>(): IDeferred<T> {
  let resolve: (result: T) => void;
  let reject: (err: T) => void;
  let promise: Promise<T> = new Promise<T>(function (): void {
    resolve = arguments[0];
    reject = arguments[1];
  });
  return {
    resolve: resolve,
    reject: reject,
    promise: promise
  };
}
