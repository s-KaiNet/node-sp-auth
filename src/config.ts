import got, { Options } from 'got';
import {
  bootstrap
} from 'global-agent';

export interface IConfiguration {
  requestOptions?: Options;
}

if (process.env['http_proxy'] || process.env['https_proxy']) {
  if (process.env['http_proxy']) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env['http_proxy'];
  }
  if (process.env['https_proxy']) {
    process.env.GLOBAL_AGENT_HTTPS_PROXY = process.env['https_proxy'];
  }

  bootstrap();
}

export let request: typeof got = got.extend({ followRedirect: false, rejectUnauthorized: false, throwHttpErrors: false, retry: 0 });

export function setup(config: IConfiguration): void {
  if (config.requestOptions) {
    request = request.extend(config.requestOptions);
  }
}
