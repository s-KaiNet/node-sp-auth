import * as url from 'url';
import { request } from './../../config';
import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import template = require('lodash.template');

let xmldoc: any = require('xmldoc');

import { IUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';
import { AdfsHelper } from './../../utils/AdfsHelper';

import { template as onlineSamlWsfedAdfsTemplate } from './../../templates/OnlineSamlWsfedAdfs';
import { template as onlineSamlWsfedTemplate } from './../../templates/OnlineSamlWsfed';
import { HostingEnvironment } from '../HostingEnvironment';
import { OnlineResolver } from './base/OnlineResolver';

export class OnlineUserCredentials extends OnlineResolver {

  private static CookieCache: Cache = new Cache();

  constructor(_siteUrl: string, private _authOptions: IUserCredentials) {
    super(_siteUrl);

    this._authOptions = Object.assign({}, _authOptions);

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
    let cacheKey = `${host}@${this._authOptions.username}@${this._authOptions.password}`;
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
        let fedAuth: string;
        let rtFa: string;

        for (let i = 0; i < response.headers['set-cookie'].length; i++) {
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
  }

  protected InitEndpointsMappings(): void {
    this.endpointsMappings.set(HostingEnvironment.Production, 'login.microsoftonline.com');
    this.endpointsMappings.set(HostingEnvironment.China, 'login.chinacloudapi.cn');
    this.endpointsMappings.set(HostingEnvironment.German, 'login.microsoftonline.de');
    this.endpointsMappings.set(HostingEnvironment.USDefence, 'login-us.microsoftonline.com');
    this.endpointsMappings.set(HostingEnvironment.USGovernment, 'login-us.microsoftonline.com');
  }

  private getSecurityToken(): Promise<any> {
    return request.post(this.OnlineUserRealmEndpoint, {
      rejectUnauthorized: false,
      form: {
        'login': this._authOptions.username
      }
    }).json()
      .then((userRealm: any) => {
        let authType: string = userRealm.NameSpaceType;

        if (!authType) {
          throw new Error('Unable to define namespace type for Online authentiation');
        }

        if (authType === 'Managed') {
          return this.getSecurityTokenWithOnline();
        }

        if (authType === 'Federated') {
          return this.getSecurityTokenWithAdfs(userRealm.AuthURL, userRealm.CloudInstanceIssuerUri);
        }

        throw new Error(`Unable to resolve namespace authentiation type. Type received: ${authType}`);
      });
  }

  private getSecurityTokenWithAdfs(adfsUrl: string, relyingParty: string): Promise<any> {
    return AdfsHelper.getSamlAssertion({
      username: this._authOptions.username,
      password: this._authOptions.password,
      adfsUrl: adfsUrl,
      relyingParty: relyingParty || consts.AdfsOnlineRealm
    })
      .then(samlAssertion => {

        let siteUrlParsed: url.Url = url.parse(this._siteUrl);
        let rootSiteUrl: string = siteUrlParsed.protocol + '//' + siteUrlParsed.host;
        let tokenRequest: string = template(onlineSamlWsfedAdfsTemplate)({
          endpoint: rootSiteUrl,
          token: samlAssertion.value
        });

        return request.post(this.MSOnlineSts, {
          body: tokenRequest,
          headers: {
            'Content-Length': tokenRequest.length.toString(),
            'Content-Type': 'application/soap+xml; charset=utf-8'
          },
          rejectUnauthorized: false
        });
      });
  }

  private getSecurityTokenWithOnline(): Promise<any> {
    let parsedUrl: url.Url = url.parse(this._siteUrl);
    let host: string = parsedUrl.host;
    let spFormsEndPoint = `${parsedUrl.protocol}//${host}/${consts.FormsPath}`;

    let samlBody: string = template(onlineSamlWsfedTemplate)({
      username: this._authOptions.username,
      password: this._authOptions.password,
      endpoint: spFormsEndPoint
    });

    return request
      .post(this.MSOnlineSts, {
        body: samlBody,
        rejectUnauthorized: false,
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
    let spFormsEndPoint = `${parsedUrl.protocol}//${parsedUrl.host}/${consts.FormsPath}`;

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
      .post(spFormsEndPoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: binaryToken,
        rejectUnauthorized: false
      })]);
  }

  private get MSOnlineSts(): string {
    return `https://${this.endpointsMappings.get(this.hostingEnvironment)}/extSTS.srf`;
  }

  private get OnlineUserRealmEndpoint(): string {
    return `https://${this.endpointsMappings.get(this.hostingEnvironment)}/GetUserRealm.srf`;
  }
}
