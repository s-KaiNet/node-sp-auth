import * as Promise from 'bluebird';
import * as request from 'request-promise';
import * as url from 'url';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import * as util from 'util';
let xmldoc: any = require('xmldoc');

import { IAuthResolver } from './../IAuthResolver';
import { IAdfsUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';
import {AdfsHelper} from './../../utils/AdfsHelper';
import {SamlAssertion} from './../../utils/SamlAssertion';

export class AdfsCredentials implements IAuthResolver {

  private static CookieCache: Cache = new Cache();
  private _authOptions: IAdfsUserCredentials;

  constructor(private _siteUrl: string, _authOptions: IAdfsUserCredentials) {
    this._authOptions = _.extend<{}, IAdfsUserCredentials>({}, _authOptions);

    if (this._authOptions.domain !== undefined) {
      this._authOptions.username = `${this._authOptions.domain}\\${this._authOptions.username}`;
    }
  }

  public getAuth(): Promise<IAuthResponse> {
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);

    let cacheKey: string = util.format('%s@%s', siteUrlParsed.host, this._authOptions.username);
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
        let notAfter: number = new Date(data[0]).getTime();
        let expiresIn: number = parseInt(((notAfter - new Date().getTime()) / 1000).toString(), 10);
        let response: IncomingMessage = data[1];
        let authCookie: string = 'FedAuth=' + cookie.parse(response.headers['set-cookie'][0])[consts.FedAuth];

        AdfsCredentials.CookieCache.set(cacheKey, authCookie, expiresIn);

        return {
          headers: {
            'Cookie': authCookie
          }
        };
      });
  }

  private postTokenData(samlAssertion: SamlAssertion): Promise<[string, any]> {
    let tokenPostTemplate: Buffer = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'adfs_saml_token.tmpl'));

    let result: string = _.template(tokenPostTemplate.toString())({
      created: samlAssertion.notBefore,
      expires: samlAssertion.notAfter,
      relyingParty: this._authOptions.relyingParty,
      token: samlAssertion.value
    });

    let tokenXmlDoc: any = new xmldoc.XmlDocument(result);
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);
    let rootSiteUrl: string = `${siteUrlParsed.protocol}//${siteUrlParsed.host}`;

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
