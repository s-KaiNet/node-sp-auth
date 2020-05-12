import * as Promise from 'bluebird';
import * as url from 'url';
import { request } from './../../config';
import { IncomingMessage } from 'http';
import * as http from 'http';
import * as https from 'https';

let ntlm: any = require('node-ntlm-client/lib/ntlm');

import { IAuthResolver } from './../IAuthResolver';
import { IOnpremiseUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';

export class OnpremiseUserCredentials implements IAuthResolver {

  constructor(private _siteUrl: string, private _authOptions: IOnpremiseUserCredentials) { }

  public getAuth(): Promise<IAuthResponse> {

    let ntlmOptions: any = Object.assign({}, this._authOptions);
    ntlmOptions.url = this._siteUrl;

    if (ntlmOptions.username.indexOf('\\') > 0) {
      let parts = ntlmOptions.username.split('\\');
      ntlmOptions.username = parts[1];
      ntlmOptions.domain = parts[0].toUpperCase();
    }

    // check upn case, i.e. user@domain.com
    if (ntlmOptions.username.indexOf('@') > 0) {
      ntlmOptions.domain = '';
    }

    let type1msg: any = ntlm.createType1Message();

    let isHttps: boolean = url.parse(this._siteUrl).protocol === 'https:';

    let keepaliveAgent: any = isHttps ? new https.Agent({ keepAlive: true, rejectUnauthorized: false }) :
      new http.Agent({ keepAlive: true });

    return request({
      url: this._siteUrl,
      method: 'GET',
      headers: {
        'Connection': 'keep-alive',
        'Authorization': type1msg,
        'Accept': 'application/json;odata=verbose'
      },
      agent: keepaliveAgent,
      resolveWithFullResponse: true,
      simple: false,
      strictSSL: false
    } as any)
      .then((response: IncomingMessage) => {
        let type2msg: any = ntlm.decodeType2Message(response.headers['www-authenticate']);
        let type3msg: any = ntlm.createType3Message(type2msg, ntlmOptions.username, ntlmOptions.password, ntlmOptions.workstation, ntlmOptions.domain);

        return {
          headers: {
            'Connection': 'Close',
            'Authorization': type3msg
          },
          options: {
            agent: keepaliveAgent
          }
        };
      }) as Promise<IAuthResponse>;
  }
}
