import { request } from './../config';
import * as url from 'url';
import template = require('lodash.template');
let xmldoc: any = require('xmldoc');

import { IAdfsUserCredentials } from './../auth/IAuthOptions';
import { SamlAssertion } from './SamlAssertion';

import { template as adfsSamlWsfedTemplate } from './../templates/AdfsSamlWsfed';

export class AdfsHelper {
  public static getSamlAssertion(credentials: IAdfsUserCredentials): Promise<SamlAssertion> {
    let adfsHost: string = url.parse(credentials.adfsUrl).host;
    let usernameMixedUrl = `https://${adfsHost}/adfs/services/trust/13/usernamemixed`;

    let samlBody: string = template(adfsSamlWsfedTemplate)({
      to: usernameMixedUrl,
      username: credentials.username,
      password: credentials.password,
      relyingParty: credentials.relyingParty
    });

    return request.post(usernameMixedUrl, {
      body: samlBody,
      rejectUnauthorized: false,
      resolveBodyOnly: true,
      headers: {
        'Content-Length': samlBody.length.toString(),
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
