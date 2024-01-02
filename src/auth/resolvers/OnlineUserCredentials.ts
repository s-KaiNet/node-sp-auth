import * as url from 'url';
import { request } from './../../config';
import * as cookie from 'cookie';
import template = require('lodash.template');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmldoc: any = require('xmldoc');

import { IUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';
import { AdfsHelper } from './../../utils/AdfsHelper';

import { template as onlineSamlWsfedAdfsTemplate } from './../../templates/OnlineSamlWsfedAdfs';
import { template as onlineSamlWsfedTemplate } from './../../templates/OnlineSamlWsfed';
import { HostingEnvironment } from '../HostingEnvironment';
import { OnlineResolver } from './base/OnlineResolver';
import { Response } from 'got';

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
    const parsedUrl: url.Url = url.parse(this._siteUrl);
    const host: string = parsedUrl.host;
    const cacheKey = `${host}@${this._authOptions.username}@${this._authOptions.password}`;
    const cachedCookie: string = OnlineUserCredentials.CookieCache.get<string>(cacheKey);

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
        const response = data[1];
        const diffSeconds: number = data[0];
        let fedAuth: string;
        let rtFa: string;

        for (let i = 0; i < response.headers['set-cookie'].length; i++) {
          const headerCookie: string = response.headers['set-cookie'][i];
          if (headerCookie.indexOf(consts.FedAuth) !== -1) {
            fedAuth = cookie.parse(headerCookie)[consts.FedAuth];
          }
          if (headerCookie.indexOf(consts.RtFa) !== -1) {
            rtFa = cookie.parse(headerCookie)[consts.RtFa];
          }
        }

        const authCookie: string = 'FedAuth=' + fedAuth + '; rtFa=' + rtFa;

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
    this.endpointsMappings.set(HostingEnvironment.USGovernment, 'login.microsoftonline.us');
  }

  private getSecurityToken(): Promise<any> {
    return request.post(this.OnlineUserRealmEndpoint, {
      form: {
        'login': this._authOptions.username
      }
    }).json()
      .then((userRealm: any) => {
        const authType: string = userRealm.NameSpaceType;

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

  private getSecurityTokenWithAdfs(adfsUrl: string, relyingParty: string): Promise<string> {
    return AdfsHelper.getSamlAssertion({
      username: this._authOptions.username,
      password: this._authOptions.password,
      adfsUrl: adfsUrl,
      relyingParty: relyingParty || consts.AdfsOnlineRealm
    })
      .then(samlAssertion => {

        const siteUrlParsed: url.Url = url.parse(this._siteUrl);
        const rootSiteUrl: string = siteUrlParsed.protocol + '//' + siteUrlParsed.host;
        const tokenRequest: string = template(onlineSamlWsfedAdfsTemplate)({
          endpoint: rootSiteUrl,
          token: samlAssertion.value
        });

        return request.post(this.MSOnlineSts, {
          body: tokenRequest,
          headers: {
            'Content-Length': tokenRequest.length.toString(),
            'Content-Type': 'application/soap+xml; charset=utf-8'
          },
          resolveBodyOnly: true
        });
      });
  }

  private getSecurityTokenWithOnline(): Promise<string> {
    const parsedUrl: url.Url = url.parse(this._siteUrl);
    const host: string = parsedUrl.host;
    const spFormsEndPoint = `${parsedUrl.protocol}//${host}/${consts.FormsPath}`;

    const samlBody: string = template(onlineSamlWsfedTemplate)({
      username: this._authOptions.username,
      password: this._authOptions.password,
      endpoint: spFormsEndPoint
    });

    return request
      .post(this.MSOnlineSts, {
        body: samlBody,
        resolveBodyOnly: true,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8'
        }
      });
  }

  private postToken(xmlResponse: any): Promise<[number, Response<string>]> {
    const xmlDoc: any = new xmldoc.XmlDocument(xmlResponse);
    const parsedUrl: url.Url = url.parse(this._siteUrl);
    const spFormsEndPoint = `${parsedUrl.protocol}//${parsedUrl.host}/${consts.FormsPath}`;

    const securityTokenResponse: any = xmlDoc.childNamed('S:Body').firstChild;
    if (securityTokenResponse.name.indexOf('Fault') !== -1) {
      throw new Error(securityTokenResponse.toString());
    }

    const binaryToken: any = securityTokenResponse.childNamed('wst:RequestedSecurityToken').firstChild.val;
    const now: any = new Date().getTime();
    const expires: number = new Date(securityTokenResponse.childNamed('wst:Lifetime').childNamed('wsu:Expires').val).getTime();
    const diff: number = (expires - now) / 1000;

    const diffSeconds: number = parseInt(diff.toString(), 10);

    return Promise.all([Promise.resolve(diffSeconds), request
      .post(spFormsEndPoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: binaryToken
      })]);
  }

  private get MSOnlineSts(): string {
    return `https://${this.endpointsMappings.get(this.hostingEnvironment)}/extSTS.srf`;
  }

  private get OnlineUserRealmEndpoint(): string {
    return `https://${this.endpointsMappings.get(this.hostingEnvironment)}/GetUserRealm.srf`;
  }
}
