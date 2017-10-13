import * as Promise from 'bluebird';
import * as request from 'request-promise';
import { IncomingMessage } from 'http';
import * as url from 'url';

import { IAuthResolver } from './../IAuthResolver';
import { IOnlineAddinCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import { UrlHelper } from './../../utils/UrlHelper';
import * as consts from './../../Consts';

export class OnlineAddinOnly implements IAuthResolver {

  private static TokenCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IOnlineAddinCredentials) { }

  public getAuth(): Promise<IAuthResponse> {
    let sharepointhostname: string = url.parse(this._siteUrl).hostname;
    let cacheKey: string = this._authOptions.clientSecret;

    let cachedToken: string = OnlineAddinOnly.TokenCache.get<string>(cacheKey);

    if (cachedToken) {
      return Promise.resolve({
        headers: {
          'Authorization': `Bearer ${cachedToken}`
        }
      });
    }

    return this.getRealm(this._siteUrl)
      .then(realm => {
        return Promise.all([realm, this.getAuthUrl(realm)]);
      })
      .then(data => {
        let realm: string = data[0];
        let authUrl: string = data[1];

        let resource = `${consts.SharePointServicePrincipal}/${sharepointhostname}@${realm}`;
        let fullClientId = `${this._authOptions.clientId}@${realm}`;

        return request.post(authUrl, {
          json: true,
          form: {
            'grant_type': 'client_credentials',
            'client_id': fullClientId,
            'client_secret': this._authOptions.clientSecret,
            'resource': resource
          }
        });
      })
      .then(data => {
        let expiration: number = parseInt(data.expires_in, 10);
        OnlineAddinOnly.TokenCache.set(cacheKey, data.access_token, expiration - 60);

        return {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        };
      });
  };

  private getAuthUrl(realm: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let url = `https://accounts.accesscontrol.windows.net/metadata/json/1?realm=${realm}`;

      request.get(url, { json: true })
        .then((data: { endpoints: { protocol: string, location: string }[] }) => {
          for (let i = 0; i < data.endpoints.length; i++) {
            if (data.endpoints[i].protocol === 'OAuth2') {
              resolve(data.endpoints[i].location);
              return undefined;
            }
          }
        });
    });
  }

  private getRealm(siteUrl: string): Promise<string> {

    if (this._authOptions.realm) {
      return Promise.resolve(this._authOptions.realm);
    }

    return request.post(`${UrlHelper.removeTrailingSlash(siteUrl)}/vti_bin/client.svc`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '
      },
      resolveWithFullResponse: true,
      simple: false
    })
      .then((data: IncomingMessage) => {
        let header: string = data.headers['www-authenticate'];
        let index: number = header.indexOf('Bearer realm="');
        return header.substring(index + 14, index + 50);
      });
  }
}
