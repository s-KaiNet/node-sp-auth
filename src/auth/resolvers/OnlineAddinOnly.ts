import * as Promise from 'bluebird';
import * as request from 'request-promise';
import { IncomingMessage } from 'http';
import * as url from 'url';

import { IAuthResolver } from './../IAuthResolver';
import { IOnlineAddinCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';

export class OnlineAddinOnly implements IAuthResolver {

  private static TokenCache: Cache = new Cache();
  private static SharePointServicePrincipal: string = '00000003-0000-0ff1-ce00-000000000000';

  public getAuthHeaders(siteUrl: string, authOptions: IOnlineAddinCredentials): Promise<IAuthResponse> {
    return new Promise<IAuthResponse>((resolve, reject) => {
      let sharepointhostname: string = url.parse(siteUrl).hostname;
      let cacheKey: string = authOptions.clientSecret;

      let cachedToken: string = OnlineAddinOnly.TokenCache.get<string>(cacheKey);

      if (cachedToken) {
        resolve({
          headers: {
            'Authorization': `Bearer ${cachedToken}`
          }
        });
        return;
      }
      this.getRealm(siteUrl)
        .then(realm => {
          let resource: string = `${OnlineAddinOnly.SharePointServicePrincipal}/${sharepointhostname}@${realm}`;
          let fullClientId: string = `${authOptions.clientId}@${realm}`;

          this.getAuthUrl(realm)
            .then(authUrl => {
              return request.post(authUrl, {
                json: true,
                form: {
                  'grant_type': 'client_credentials',
                  'client_id': fullClientId,
                  'client_secret': authOptions.clientSecret,
                  'resource': resource
                }
              });
            })
            .then(data => {
              let expiration: number = parseInt(data.expires_in, 10);
              OnlineAddinOnly.TokenCache.set(cacheKey, data.access_token, expiration - 60);

              resolve({
                headers: {
                  'Authorization': `Bearer ${data.access_token}`
                }
              });
            });
        });
    });
  };

  public removeTrailingSlash(url: string): string {
    return url.replace(/(\/$)|(\\$)/, '');
  }

  private getAuthUrl(realm: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let url: string = `https://accounts.accesscontrol.windows.net/metadata/json/1?realm=${realm}`;

      request.get(url, { json: true })
        .then((data: { endpoints: { protocol: string, location: string }[] }) => {
          for (let i: number = 0; i < data.endpoints.length; i++) {
            if (data.endpoints[i].protocol === 'OAuth2') {
              resolve(data.endpoints[i].location);
              return;
            }
          }
        });
    });
  }

  private getRealm(siteUrl: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      request.post(`${this.removeTrailingSlash(siteUrl)}/vti_bin/client.svc`, {
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
          resolve(header.substring(index + 14, index + 50));
        });
    });
  }
}
