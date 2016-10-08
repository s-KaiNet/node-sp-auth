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

    let adfsHost: string = url.parse(this._authOptions.adfsUrl).host;
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);

    let usernameMixedUrl: string = `https://${adfsHost}/adfs/services/trust/13/usernamemixed`;
    let cacheKey: string = util.format('%s@%s', siteUrlParsed.host, this._authOptions.username);
    let cachedCookie: string = AdfsCredentials.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    let samlTemplate: Buffer = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'adfs_saml_wsfed.tmpl'));

    let samlBody: string = _.template(samlTemplate.toString())({
      to: usernameMixedUrl,
      username: this._authOptions.username,
      password: this._authOptions.password,
      relyingParty: this._authOptions.relyingParty
    });

    return <Promise<IAuthResponse>>request.post(usernameMixedUrl, {
      body: samlBody,
      strictSSL: false,
      simple: false,
      headers: {
        'Content-Length': samlBody.length,
        'Content-Type': 'application/soap+xml; charset=utf-8'
      }
    })
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

  private postTokenData(xmlResponse: any): Promise<[string, any]> {

    let doc: any = new xmldoc.XmlDocument(xmlResponse);
    let tokenPostTemplate: Buffer = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'templates', 'adfs_saml_token.tmpl'));

    let tokenResponseCollection: any = doc.childNamed('s:Body').firstChild;
    if (tokenResponseCollection.name.indexOf('Fault') !== -1) {
      throw new Error(tokenResponseCollection.toString());
    }

    let responseNamespace: string = tokenResponseCollection.name.split(':')[0];

    let securityTokenResponse: any = doc.childNamed('s:Body').firstChild.firstChild;
    let samlAssertion: any = securityTokenResponse.childNamed(responseNamespace + ':RequestedSecurityToken').firstChild;

    let notBefore: string = samlAssertion.firstChild.attr['NotBefore'];
    let notAfter: string = samlAssertion.firstChild.attr['NotOnOrAfter'];

    let result: string = _.template(tokenPostTemplate.toString())({
      created: notBefore,
      expires: notAfter,
      relyingParty: this._authOptions.relyingParty,
      token: samlAssertion.toString()
    });

    let tokenXmlDoc: any = new xmldoc.XmlDocument(result);
    let siteUrlParsed: url.Url = url.parse(this._siteUrl);
    let rootSiteUrl: string = `${siteUrlParsed.protocol}//${siteUrlParsed.host}`;

    return Promise.all([notAfter, request.post(`${rootSiteUrl}/_trust/`, {
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
