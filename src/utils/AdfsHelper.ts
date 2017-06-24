import * as Promise from 'bluebird';
import * as request from 'request-promise';
import * as url from 'url';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
let xmldoc: any = require('xmldoc');

import { IAdfsUserCredentials } from './../auth/IAuthOptions';
import { SamlAssertion } from './SamlAssertion';

export class AdfsHelper {
  public static getSamlAssertion(siteUrl: string, credentials: IAdfsUserCredentials): Promise<SamlAssertion> {
    let adfsHost: string = url.parse(credentials.adfsUrl).host;
    let usernameMixedUrl = `https://${adfsHost}/adfs/services/trust/13/usernamemixed`;
    let samlTemplate: Buffer = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'adfs_saml_wsfed.tmpl'));

    let samlBody: string = _.template(samlTemplate.toString())({
      to: usernameMixedUrl,
      username: credentials.username,
      password: credentials.password,
      relyingParty: credentials.relyingParty
    });

    return request.post(usernameMixedUrl, {
      body: samlBody,
      strictSSL: false,
      simple: false,
      headers: {
        'Content-Length': samlBody.length,
        'Content-Type': 'application/soap+xml; charset=utf-8'
      }
    })
      .then(xmlResponse => {
        let doc: any = new xmldoc.XmlDocument(xmlResponse);

        let tokenResponseCollection: any = doc.childNamed('s:Body').firstChild;
        if (tokenResponseCollection.name.indexOf('Fault') !== -1) {
          throw new Error(tokenResponseCollection.toString());
        }

        let responseNamespace: string = tokenResponseCollection.name.split(':')[0];
        let securityTokenResponse: any = doc.childNamed('s:Body').firstChild.firstChild;
        let samlAssertion: any = securityTokenResponse.childNamed(responseNamespace + ':RequestedSecurityToken').firstChild;
        let notBefore: string = samlAssertion.firstChild.attr['NotBefore'];
        let notAfter: string = samlAssertion.firstChild.attr['NotOnOrAfter'];

        return {
          value: samlAssertion.toString({ compressed: true }),
          notAfter: notAfter,
          notBefore: notBefore
        } as SamlAssertion;
      });
  }
}
