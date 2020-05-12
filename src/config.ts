import got, { Options } from 'got';

export interface IConfiguration {
  requestOptions?: Options;
}

export let request: typeof got = got;

export function setup(config: IConfiguration): void {
  if (config.requestOptions) {
    request = got.extend(config.requestOptions);
  }
}
