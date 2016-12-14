import * as Promise from 'bluebird';
import * as url from 'url';
import * as util from 'util';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as request from 'request-promise';
import * as cookie from 'cookie';
import * as path from 'path';
import { IncomingMessage } from 'http';

let xmldoc: any = require('xmldoc');

import { IAuthResolver } from './../IAuthResolver';
import { IUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';
import { AdfsHelper } from './../../utils/AdfsHelper';

export class OnlineUserCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IUserCredentials) {
    this._authOptions = _.extend<{}, IUserCredentials>({}, _authOptions);

    this._authOptions.username = this._authOptions.username
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    this._authOptions.password = this._authOptions.password
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

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    return this.getSecurityToken()
      .then(xmlResponse => {
        return this.postToken(xmlResponse);
      })
      .then(data => {
        let response: IncomingMessage = data[1];
        let diffSeconds: number = data[0];
        let fedAuth: string, rtFa: string;

        for (let i: number = 0; i < response.headers['set-cookie'].length; i++) {
          let headerCookie: string = response.headers['set-cookie'][i];
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
  };

  private getSecurityToken(): Promise<any> {
    return request.post(consts.OnlineUserRealmEndpoint, {
      simple: false,
      strictSSL: false,
      json: true,
      form: {
        'login': this._authOptions.username
      }
    })
      .then(userRealm => {
        let authType: string = userRealm.NameSpaceType;

        if (!authType) {
          throw new Error('Unable to define namespace type for Online authentiation');
        }

        if (authType === 'Managed') {
          return this.getSecurityTokenWithOnline();
        }

        if (authType === 'Federated') {
          return this.getSecurityTokenWithAdfs(userRealm.AuthURL);
        }

        throw new Error(`Unable to resolve namespace authentiation type. Type received: ${authType}`);
      });
  }

  private getSecurityTokenWithAdfs(adfsUrl: string): Promise<any> {
    return AdfsHelper.getSamlAssertion(this._siteUrl, {
      username: this._authOptions.username,
      password: this._authOptions.password,
      adfsUrl: adfsUrl,
      relyingParty: consts.AdfsOnlineRealm
    })
      .then(samlAssertion => {

        let siteUrlParsed: url.Url = url.parse(this._siteUrl);
        let rootSiteUrl: string = siteUrlParsed.protocol + '//' + siteUrlParsed.host;
        let tokenRequest: string = _.template(
          fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'online_saml_wsfed_adfs.tmpl')).toString())({
            endpoint: rootSiteUrl,
            token: samlAssertion.value
          });

        return request.post(consts.MSOnlineSts, {
          body: tokenRequest,
          headers: {
            'Content-Length': tokenRequest.length,
            'Content-Type': 'application/soap+xml; charset=utf-8'
          },
          simple: false,
          strictSSL: false
        });
      });
  }

  private getSecurityTokenWithOnline(): Promise<any> {
    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let host: string = parsedUrl.host;
    let spFormsEndPoint: string = `${parsedUrl.protocol}//${host}/${consts.FormsPath}`;

    let samlBody: string = _.template(
      fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'online_saml_wsfed.tmpl')).toString())({
        username: this._authOptions.username,
        password: this._authOptions.password,
        endpoint: spFormsEndPoint
      });

    return request
      .post(consts.MSOnlineSts, <any>{
        body: samlBody,
        simple: false,
        strictSSL: false,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8'
        }
      })
      .then(xmlResponse => {
        return xmlResponse;
      });
  }

  private postToken(xmlResponse: any): Promise<[number, any]> {
    let xmlDoc: any = new xmldoc.XmlDocument(xmlResponse);
    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let spFormsEndPoint: string = `${parsedUrl.protocol}//${parsedUrl.host}/${consts.FormsPath}`;

    let securityTokenResponse: any = xmlDoc.childNamed('S:Body').firstChild;
    if (securityTokenResponse.name.indexOf('Fault') !== -1) {
      throw new Error(securityTokenResponse.toString());
    }

    let binaryToken: any = securityTokenResponse.childNamed('wst:RequestedSecurityToken').firstChild.val;
    let now: any = new Date().getTime();
    let expires: number = new Date(securityTokenResponse.childNamed('wst:Lifetime').childNamed('wsu:Expires').val).getTime();
    let diff: number = (expires - now) / 1000;

    let diffSeconds: number = parseInt(diff.toString(), 10);

    return Promise.all([diffSeconds, request
      .post(spFormsEndPoint, <any>{
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: binaryToken,
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false
      })]);
  }
}
