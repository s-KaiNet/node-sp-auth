import * as Promise from 'bluebird';
import * as _ from 'lodash';
import * as url from 'url';
import { request } from './../../config';
import * as cookie from 'cookie';

let xmldoc: any = require('xmldoc');

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

    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let host: string = parsedUrl.host;
    let cacheKey = `${host}@${this._authOptions.username}@${this._authOptions.password}`;
    let cachedCookie: string = OnpremiseFbaCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    let soapBody: string = _.template(fbaLoginWsfedTemplate)({
      username: this._authOptions.username,
      password: this._authOptions.password
    });

    let fbaEndPoint = `${parsedUrl.protocol}//${host}/${consts.FbaAuthEndpoint}`;

    return request({
      url: fbaEndPoint,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': soapBody.length
      },
      body: soapBody,
      json: false,
      simple: false,
      strictSSL: false,
      transform: (body: any, response: any, resolveWithFullResponse: any) => {
        return response;
      }
    } as any)
      .then((response: any) => {

        let xmlDoc: any = new xmldoc.XmlDocument(response.body);

        if (xmlDoc.name === 'm:error') {
          let errorCode: string = xmlDoc.childNamed('m:code').val;
          let errorMessage: string = xmlDoc.childNamed('m:message').val;
          throw new Error(`${errorCode}, ${errorMessage}`);
        }

        let errorCode: string =
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('ErrorCode').val;
        let cookieName: string =
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('CookieName').val;
        let diffSeconds: number = parseInt(
          xmlDoc.childNamed('soap:Body').childNamed('LoginResponse').childNamed('LoginResult').childNamed('TimeoutSeconds').val,
          null
        );
        let cookieValue: string;

        if (errorCode === 'PasswordNotMatch') {
          throw new Error(`Password doesn't not match`);
        }
        if (errorCode !== 'NoError') {
          throw new Error(errorCode);
        }

        (response.headers['set-cookie'] || []).forEach((headerCookie: string) => {
          if (headerCookie.indexOf(cookieName) !== -1) {
            cookieValue = cookie.parse(headerCookie)[cookieName];
          }
        });

        let authCookie = `${cookieName}=${cookieValue}`;

        OnpremiseFbaCredentials.CookieCache.set(cacheKey, authCookie, diffSeconds);

        return {
          headers: {
            'Cookie': authCookie
          }
        };

      }) as Promise<IAuthResponse>;
  }
}
