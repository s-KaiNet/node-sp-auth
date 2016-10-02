import * as Promise from 'bluebird';
import * as consts from 'constants';
import * as url from 'url';
import * as util from 'util';

let sp: any = require('node-spoauth');

import { IAuthResolver } from './../IAuthResolver';
import { IUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';

export class OnlineUserCredentials implements IAuthResolver {

  private static _cookieCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IUserCredentials) { }

  public getAuth(): Promise<IAuthResponse> {
    return new Promise<IAuthResponse>((resolve, reject) => {
      let host: string = url.parse(this._siteUrl).host;
      let cacheKey: string = util.format('%s@%s', host, this._authOptions.username);
      let cachedCookie: string = OnlineUserCredentials._cookieCache.get<string>(cacheKey);

      if (cachedCookie) {
        resolve({
          headers: {
            'Cookie': cachedCookie
          }
        });
        return;
      }

      let service: any = new sp.RestService(this._siteUrl);

      let signin: (username: string, password: string) => Promise<any> =
        Promise.promisify<any, string, string>(service.signin, { context: service });

      this._authOptions.username = this._authOptions.username.replace(/&amp;/g, '&').replace(/&/g, '&amp;');
      this._authOptions.password = this._authOptions.password.replace(/&amp;/g, '&').replace(/&/g, '&amp;');

      signin(this._authOptions.username, this._authOptions.password)
        .then((auth) => {
          let cookie: string = `FedAuth=${auth.FedAuth}; rtFa=${auth.rtFa}`;
          OnlineUserCredentials._cookieCache.set(cacheKey, cookie, 30 * 60);

          resolve({
            headers: {
              'Cookie': cookie,
              'secureOptions': consts.SSL_OP_NO_TLSv1_2
            }
          });

          return;
        })
        .catch(reject);
    });
  };
}
