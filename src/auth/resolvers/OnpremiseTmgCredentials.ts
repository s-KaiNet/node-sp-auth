import * as url from 'url';
import { request } from './../../config';
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

    const parsedUrl: url.Url = url.parse(this._siteUrl);
    const host: string = parsedUrl.host;
    const cacheKey = `${host}@${this._authOptions.username}@${this._authOptions.password}`;
    const cachedCookie: string = OnpremiseTmgCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    const tmgEndPoint = `${parsedUrl.protocol}//${host}/${consts.TmgAuthEndpoint}`;

    const isHttps: boolean = url.parse(this._siteUrl).protocol === 'https:';

    const keepaliveAgent: any = isHttps ?
      new https.Agent({ keepAlive: true, rejectUnauthorized: !!this._authOptions.rejectUnauthorized }) :
      new http.Agent({ keepAlive: true });

    return request({
      url: tmgEndPoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'curl=Z2F&flags=0&forcedownlevel=0&formdir=1&trusted=0&' +
        `username=${encodeURIComponent(this._authOptions.username)}&` +
        `password=${encodeURIComponent(this._authOptions.password)}`,
      agent: keepaliveAgent
    })
      .then(response => {

        const authCookie = response.headers['set-cookie'][0];

        return {
          headers: {
            'Cookie': authCookie
          }
        };

      }) as Promise<IAuthResponse>;
  }
}
