import * as requestPromise from 'request-promise';
import { CoreOptions } from 'request';

export interface IConfiguration {
  requestOptions?: CoreOptions;
}

export let request: typeof requestPromise = requestPromise;

export function setup(config: IConfiguration): void {
  if (config.requestOptions) {
    request = requestPromise.defaults(config.requestOptions);
  }
}
