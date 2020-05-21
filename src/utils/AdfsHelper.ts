import { request } from './../config';
import * as url from 'url';
import template = require('lodash.template');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmldoc: any = require('xmldoc');

import { IAdfsUserCredentials } from './../auth/IAuthOptions';
import { SamlAssertion } from './SamlAssertion';

import { template as adfsSamlWsfedTemplate } from './../templates/AdfsSamlWsfed';

export class AdfsHelper {
  public static getSamlAssertion(credentials: IAdfsUserCredentials): Promise<SamlAssertion> {
    const adfsHost: string = url.parse(credentials.adfsUrl).host;
    const usernameMixedUrl = `https://${adfsHost}/adfs/services/trust/13/usernamemixed`;

    const samlBody: string = template(adfsSamlWsfedTemplate)({
      to: usernameMixedUrl,
      username: credentials.username,
      password: credentials.password,
      relyingParty: credentials.relyingParty
    });

    return request.post(usernameMixedUrl, {
      body: samlBody,
      resolveBodyOnly: true,
      headers: {
        'Content-Length': samlBody.length.toString(),
        'Content-Type': 'application/soap+xml; charset=utf-8'
      }
    })
      .then(xmlResponse => {
        const doc: any = new xmldoc.XmlDocument(xmlResponse);

        const tokenResponseCollection: any = doc.childNamed('s:Body').firstChild;
        if (tokenResponseCollection.name.indexOf('Fault') !== -1) {
          throw new Error(tokenResponseCollection.toString());
        }

        const responseNamespace: string = tokenResponseCollection.name.split(':')[0];
        const securityTokenResponse: any = doc.childNamed('s:Body').firstChild.firstChild;
        const samlAssertion: any = securityTokenResponse.childNamed(responseNamespace + ':RequestedSecurityToken').firstChild;
        const notBefore: string = samlAssertion.firstChild.attr['NotBefore'];
        const notAfter: string = samlAssertion.firstChild.attr['NotOnOrAfter'];

        return {
          value: samlAssertion.toString({ compressed: true }),
          notAfter: notAfter,
          notBefore: notBefore
        } as SamlAssertion;
      });
  }
}
