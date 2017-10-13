import * as Promise from 'bluebird';
import * as util from 'util';
import * as url from 'url';
import * as request from 'request-promise';
import * as http from 'http';
import * as https from 'https';

import { IAuthResolver } from './../IAuthResolver';
import { IOnpremiseUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';

export class OnpremiseTmgCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IOnpremiseUserCredentials) { }

  public getAuth(): Promise<IAuthResponse> {

    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let host: string = parsedUrl.host;
    let cacheKey: string = util.format('%s@%s', host, this._authOptions.username);
    let cachedCookie: string = OnpremiseTmgCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    let tmgEndPoint = `${parsedUrl.protocol}//${host}/${consts.TmgAuthEndpoint}`;

    let isHttps: boolean = url.parse(this._siteUrl).protocol === 'https:';

    let keepaliveAgent: any = isHttps ?
      new https.Agent({ keepAlive: true, rejectUnauthorized: false }) :
      new http.Agent({ keepAlive: true });

    return request({
      url: tmgEndPoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `curl=Z2F&flags=0&forcedownlevel=0&formdir=1&trusted=0&` +
               `username=${encodeURIComponent(this._authOptions.username)}&` +
               `password=${encodeURIComponent(this._authOptions.password)}`,
      agent: keepaliveAgent,
      json: false,
      simple: false,
      resolveWithFullResponse: true,
      strictSSL: false
    } as any)
      .then((response: any) => {

        let authCookie = response.headers['set-cookie'][0];

        return {
          headers: {
            'Cookie': authCookie
          }
        };

      }) as Promise<IAuthResponse>;
  };
}
