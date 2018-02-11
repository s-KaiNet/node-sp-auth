import * as Promise from 'bluebird';
import * as request from 'request-promise';
import * as url from 'url';
import * as _ from 'lodash';
import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
let xmldoc: any = require('xmldoc');

import { IAuthResolver } from './../IAuthResolver';
import { IAdfsUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';
import { AdfsHelper } from './../../utils/AdfsHelper';
import { SamlAssertion } from './../../utils/SamlAssertion';

import { template as adfsSamlTokenTemplate } from './../../templates/AdfsSamlToken';

export class AdfsCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();
  private _authOptions: IAdfsUserCredentials;

  constructor(private _siteUrl: string, _authOptions: IAdfsUserCredentials) {
    this._authOptions = _.extend<{}, IAdfsUserCredentials>({}, _authOptions);

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

    if (this._authOptions.domain !== undefined) {
      this._authOptions.username = `${this._authOptions.domain}\\${this._authOptions.username}`;
    }
  }

  public getAuth(): Promise<IAuthResponse> {
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);

    let cacheKey = `${siteUrlParsed.host}@${this._authOptions.username}@${this._authOptions.password}`;
    let cachedCookie: string = AdfsCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    return AdfsHelper.getSamlAssertion(this._siteUrl, this._authOptions)
      .then(data => {
        return this.postTokenData(data);
      })
      .then(data => {
        let adfsCookie: string = this._authOptions.adfsCookie || consts.FedAuth;
        let notAfter: number = new Date(data[0]).getTime();
        let expiresIn: number = parseInt(((notAfter - new Date().getTime()) / 1000).toString(), 10);
        let response: IncomingMessage = data[1];
        let authCookie: string = adfsCookie + '=' + cookie.parse(response.headers['set-cookie'][0])[adfsCookie];

        AdfsCredentials.CookieCache.set(cacheKey, authCookie, expiresIn);

        return {
          headers: {
            'Cookie': authCookie
          }
        };
      });
  }

  private postTokenData(samlAssertion: SamlAssertion): Promise<[string, any]> {
    let result: string = _.template(adfsSamlTokenTemplate)({
      created: samlAssertion.notBefore,
      expires: samlAssertion.notAfter,
      relyingParty: this._authOptions.relyingParty,
      token: samlAssertion.value
    });

    let tokenXmlDoc: any = new xmldoc.XmlDocument(result);
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);
    let rootSiteUrl = `${siteUrlParsed.protocol}//${siteUrlParsed.host}`;

    return Promise.all([samlAssertion.notAfter, request.post(`${rootSiteUrl}/_trust/`, {
      form: {
        'wa': 'wsignin1.0',
        'wctx': `${rootSiteUrl}/_layouts/Authenticate.aspx?Source=%2F`,
        'wresult': tokenXmlDoc.toString({ compressed: true })
      },
      resolveWithFullResponse: true,
      simple: false,
      strictSSL: false
    })]);
  }
}
