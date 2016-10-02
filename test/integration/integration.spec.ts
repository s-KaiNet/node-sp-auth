import { expect } from 'chai';
import * as request from 'request-promise';
import * as _ from 'lodash';
import { IncomingMessage } from 'http';

import { IAuthOptions } from './../../src/auth/IAuthOptions';
import * as spauth from './../../src/index';

interface ITestInfo {
  name: string;
  creds: IAuthOptions;
  url: string;
}

let config: any = require('./config');

let tests: ITestInfo[] = [
  {
    name: 'on-premise user credentials',
    creds: config.onpremCreds,
    url: config.onpremNtlmUrl
  },
  {
    name: 'online user credentials',
    creds: config.onlineCreds,
    url: config.onlineUrl
  },
  {
    name: 'on-premise addin only',
    creds: config.onpremAddinOnly,
    url: config.onpremAdfsUrl
  },
  {
    name: 'online addin only',
    creds: config.onlineAddinOnly,
    url: config.onlineUrl
  }
];

tests.forEach(test => {
  describe(`node-sp-auth: integration - ${test.name}`, () => {

    it('should get list title', function (done: MochaDone): void {
      this.timeout(30 * 1000);
      let documentTitle: string = 'Documents';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          let options: request.OptionsWithUrl = <request.OptionsWithUrl>getDefaultHeaders();
          _.assign(options.headers, response.headers);
          _.assign(options, response.options);
          options.url = `${test.url}_api/web/lists/getbytitle('${documentTitle}')`;

          return request.get(options);
        })
        .then((data: IncomingMessage) => {
          expect((<any>data).body.d.Title).to.equal(documentTitle);
          done();
        })
        .catch(done);
    });

    it('should get Title field', function (done: MochaDone): void {
      this.timeout(30 * 1000);
      let fieldTitle: string = 'Title';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          let options: request.OptionsWithUrl = <request.OptionsWithUrl>getDefaultHeaders();
          _.assign(options.headers, response.headers);
          _.assign(options, response.options);
          options.url = `${test.url}_api/web/fields/getbytitle('${fieldTitle}')`;

          return request.get(options);
        })
        .then(data => {
          expect((<any>data).body.d.Title).to.equal(fieldTitle);
          done();
        })
        .catch(done);
    });

  });
});

function getDefaultHeaders(): request.RequestPromiseOptions {
  let options: request.RequestPromiseOptions = <request.RequestPromiseOptions>_.assign({}, <request.RequestPromiseOptions>{
    headers: {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose'
    },
    json: true,
    strictSSL: false,
    'rejectunauthorized': false,
    resolveWithFullResponse: true,
    simple: true
  });

  return options;
}
