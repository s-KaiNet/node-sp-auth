import { request } from './../../config';
import * as url from 'url';
import * as cookie from 'cookie';
import template = require('lodash.template');
import { Response } from 'got';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmldoc: any = require('xmldoc');

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

    if (this._authOptions.domain !== undefined) {
      this._authOptions.username = `${this._authOptions.domain}\\${this._authOptions.username}`;
    }
  }

  public getAuth(): Promise<IAuthResponse> {
    const siteUrlParsed: url.Url = url.parse(this._siteUrl);

    const cacheKey = `${siteUrlParsed.host}@${this._authOptions.username}@${this._authOptions.password}`;
    const cachedCookie: string = AdfsCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    return AdfsHelper.getSamlAssertion(this._authOptions)
      .then((data: any) => {
        return this.postTokenData(data);
      })
      .then(data => {
        const adfsCookie: string = this._authOptions.adfsCookie || consts.FedAuth;
        const notAfter: number = new Date(data[0]).getTime();
        const expiresIn: number = parseInt(((notAfter - new Date().getTime()) / 1000).toString(), 10);
        const response = data[1];

        const authCookie: string = adfsCookie + '=' +
          response.headers['set-cookie']
            .map((cookieString: string) => cookie.parse(cookieString)[adfsCookie])
            .filter((cookieString: string) => typeof cookieString !== 'undefined')[0];

        AdfsCredentials.CookieCache.set(cacheKey, authCookie, expiresIn);

        return {
          headers: {
            'Cookie': authCookie
          }
        };
      });
  }

  private postTokenData(samlAssertion: SamlAssertion): Promise<[string, Response<string>]> {
    const result: string = template(adfsSamlTokenTemplate)({
      created: samlAssertion.notBefore,
      expires: samlAssertion.notAfter,
      relyingParty: this._authOptions.relyingParty,
      token: samlAssertion.value
    });

    const tokenXmlDoc: any = new xmldoc.XmlDocument(result);
    const siteUrlParsed: url.Url = url.parse(this._siteUrl);
    const rootSiteUrl = `${siteUrlParsed.protocol}//${siteUrlParsed.host}`;

    return Promise.all([samlAssertion.notAfter, request.post(`${rootSiteUrl}/_trust/`, {
      form: {
        'wa': 'wsignin1.0',
        'wctx': `${rootSiteUrl}/_layouts/Authenticate.aspx?Source=%2F`,
        'wresult': tokenXmlDoc.toString({ compressed: true })
      }
    })]);
  }
}
