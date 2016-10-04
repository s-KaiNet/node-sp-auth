import * as Promise from 'bluebird';
import * as url from 'url';
import * as util from 'util';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as request from 'request-promise';
import * as cookie from 'cookie';
import * as path from 'path';

let xmldoc: any = require('xmldoc');

import { IAuthResolver } from './../IAuthResolver';
import { IUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import { UrlHelper } from './../../utils/UrlHelper';
import * as consts from './../../Consts';

export class OnlineUserCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IUserCredentials) {
    _authOptions.username = _authOptions.username
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    _authOptions.password = _authOptions.password
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  public getAuth(): Promise<IAuthResponse> {
    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let host: string = parsedUrl.host;
    let cacheKey: string = util.format('%s@%s', host, this._authOptions.username);
    let cachedCookie: string = OnlineUserCredentials.CookieCache.get<string>(cacheKey);
    let spFormsEndPoint: string = UrlHelper.removeTrailingSlash(`${parsedUrl.protocol}//${host}/${consts.FormsPath}`);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    let samlBody: string = _.template(
      fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'online_saml_wsfed.tmpl')).toString())({
        username: this._authOptions.username,
        password: this._authOptions.password,
        endpoint: spFormsEndPoint
      });

    return <Promise<IAuthResponse>>request
      .post(consts.MSOnlineSts, <any>{
        body: samlBody,
        simple: false,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8'
        }
      })
      .then(xmlResponse => {
        let xmlDoc: any = new xmldoc.XmlDocument(xmlResponse);

        let securityTokenResponse: any = xmlDoc.childNamed('S:Body').firstChild;
        if (securityTokenResponse.name.indexOf('Fault') !== -1) {
          throw new Error(securityTokenResponse.toString());
        }

        let binaryToken: any = securityTokenResponse.childNamed('wst:RequestedSecurityToken').firstChild.val;
        let now: any = new Date().getTime();
        let expires: number = new Date(securityTokenResponse.childNamed('wst:Lifetime').childNamed('wsu:Expires').val).getTime();
        let diff: number = (expires - now) / 1000;

        let diffSeconds: number = parseInt(diff.toString(), 10);

        return request
          .post(spFormsEndPoint, <any>{
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)',
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: binaryToken,
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            simple: false
          })
          .then(data => {
            let fedAuth: string, rtFa: string;

            for (let i: number = 0; i < data.headers['set-cookie'].length; i++) {
              let headerCookie: string = data.headers['set-cookie'][i];
              if (headerCookie.indexOf(consts.FedAuth) !== -1) {
                fedAuth = cookie.parse(headerCookie)[consts.FedAuth];
              }
              if (headerCookie.indexOf(consts.RtFa) !== -1) {
                rtFa = cookie.parse(headerCookie)[consts.RtFa];
              }
            }

            let authCookie: string = 'FedAuth=' + fedAuth + '; rtFa=' + rtFa;

            OnlineUserCredentials.CookieCache.set(cacheKey, authCookie, diffSeconds);

            return {
              headers: {
                'Cookie': authCookie
              }
            };
          });
      });
  };
}
