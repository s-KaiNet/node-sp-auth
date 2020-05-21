import * as url from 'url';
import { request } from './../../config';
import * as cookie from 'cookie';
import template = require('lodash.template');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmldoc: any = require('xmldoc');

import { IAuthResolver } from './../IAuthResolver';
import { IOnpremiseUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';

import { template as fbaLoginWsfedTemplate } from './../../templates/FbaLoginWsfed';

export class OnpremiseFbaCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IOnpremiseUserCredentials) { }

  public getAuth(): Promise<IAuthResponse> {

    const parsedUrl: url.Url = url.parse(this._siteUrl);
    const host: string = parsedUrl.host;
    const cacheKey = `${host}@${this._authOptions.username}@${this._authOptions.password}`;
    const cachedCookie: string = OnpremiseFbaCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    const soapBody: string = template(fbaLoginWsfedTemplate)({
      username: this._authOptions.username,
      password: this._authOptions.password
    });

    const fbaEndPoint = `${parsedUrl.protocol}//${host}/${consts.FbaAuthEndpoint}`;

    return request({
      url: fbaEndPoint,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': soapBody.length.toString()
      },
      body: soapBody
    })
      .then(response => {

        const xmlDoc: any = new xmldoc.XmlDocument(response.body);

        if (xmlDoc.name === 'm:error') {
          const errorCode: string = xmlDoc.childNamed('m:code').val;
          const errorMessage: string = xmlDoc.childNamed('m:message').val;
          throw new Error(`${errorCode}, ${errorMessage}`);
        }

        const errorCode: string =
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('ErrorCode').val;
        const cookieName: string =
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('CookieName').val;
        const diffSeconds: number = parseInt(
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('TimeoutSeconds').val,
          null
        );
        let cookieValue: string;

        if (errorCode === 'PasswordNotMatch') {
          throw new Error('Password doesn\'t not match');
        }
        if (errorCode !== 'NoError') {
          throw new Error(errorCode);
        }

        (response.headers['set-cookie'] || []).forEach((headerCookie: string) => {
          if (headerCookie.indexOf(cookieName) !== -1) {
            cookieValue = cookie.parse(headerCookie)[cookieName];
          }
        });

        const authCookie = `${cookieName}=${cookieValue}`;

        OnpremiseFbaCredentials.CookieCache.set(cacheKey, authCookie, diffSeconds);

        return {
          headers: {
            'Cookie': authCookie
          }
        };

      }) as Promise<IAuthResponse>;
  }
}
