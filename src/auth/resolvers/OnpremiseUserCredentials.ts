import * as Promise from 'bluebird';
import * as _ from 'lodash';
import * as url from 'url';
import * as request from 'request-promise';
import { IncomingMessage } from 'http';

let ntlm: any = require('httpntlm').ntlm;
let agent: any = require('agentkeepalive');

import { IAuthResolver } from './../IAuthResolver';
import { IOnpremiseUserCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';

export class OnpremiseUserCredentials implements IAuthResolver {

  constructor(private _siteUrl: string, private _authOptions: IOnpremiseUserCredentials) { }

  public getAuth(): Promise<IAuthResponse> {

    _.defaults(this._authOptions, { domain: '', workstation: '' });
    let ntlmOptions: any = _.assign({}, this._authOptions);
    ntlmOptions.url = this._siteUrl;

    let type1msg: any = ntlm.createType1Message(ntlmOptions);

    let isHttps: boolean = url.parse(this._siteUrl).protocol === 'https:';

    let keepaliveAgent: any = isHttps ? new agent.HttpsAgent() : new agent();

    return <Promise<IAuthResponse>>request(<any>{
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
      rejectUnauthorized: false,
      strictSSL: false
    })
      .then((response: IncomingMessage) => {
        let type2msg: any = ntlm.parseType2Message(response.headers['www-authenticate']);
        let type3msg: any = ntlm.createType3Message(type2msg, ntlmOptions);

        return {
          headers: {
            'Connection': 'Close',
            'Authorization': type3msg
          },
          options: {
            strictSSL: false,
            agent: keepaliveAgent,
            rejectUnauthorized: false
          }
        };
      });
  };
}
