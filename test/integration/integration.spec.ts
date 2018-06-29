import { expect } from 'chai';
import * as request from 'request-promise';
import * as _ from 'lodash';
import { IncomingMessage } from 'http';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

import { IAuthOptions } from './../../src/auth/IAuthOptions';
import * as spauth from './../../src/index';
import { request as configuredRequest } from './../../src/config';

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
    url: config.onpremNtlmEnabledUrl
  },
  {
    name: 'on-premise user UPN credentials',
    creds: config.onpremUpnCreds,
    url: config.onpremNtlmEnabledUrl
  },
  {
    name: 'on-premise user+domain credentials',
    creds: config.onpremUserWithDomainCreds,
    url: config.onpremNtlmEnabledUrl
  },
  {
    name: 'fba on-premise user credentials',
    creds: config.onpremFbaCreds,
    url: config.onpremFbaEnabledUrl
  },
  {
    name: 'adfs online user credentials',
    creds: config.onlineWithAdfsCreds,
    url: config.onlineUrl
  },
  {
    name: 'online user credentials',
    creds: config.onlineCreds,
    url: config.onlineUrl
  },
  {
    name: 'on-premise addin only',
    creds: config.onpremAddinOnly,
    url: config.onpremAdfsEnabledUrl
  },
  {
    name: 'online addin only',
    creds: config.onlineAddinOnly,
    url: config.onlineUrl
  },
  {
    name: 'adfs user credentials',
    creds: config.adfsCredentials,
    url: config.onpremAdfsEnabledUrl
  },
  {
    name: 'ondemand - online',
    creds: {
      ondemand: true
    },
    url: config.onlineUrl
  },
  {
    name: 'ondemand - on-premise with ADFS',
    creds: {
      ondemand: true
    },
    url: config.onpremAdfsEnabledUrl
  },
  {
    name: 'file creds - online',
    creds: null,
    url: config.onlineUrl
  },
  {
    name: 'file creds - on-premise - NTLM',
    creds: null,
    url: config.onpremNtlmEnabledUrl
  },
  {
    name: 'file creds - on-premise - ADFS',
    creds: null,
    url: config.onpremAdfsEnabledUrl
  }
];

tests.forEach(test => {
  describe(`node-sp-auth: integration - ${test.name}`, () => {

    it('should get list title with core http(s)', function (done: MochaDone): void {
      this.timeout(90 * 1000);

      let parsedUrl: url.Url = url.parse(test.url);
      let documentTitle = 'Documents';
      let isHttps: boolean = parsedUrl.protocol === 'https:';

      let send: (options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => http.ClientRequest =
        isHttps ? https.request : http.request;
      let agent: http.Agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) :
        new http.Agent();

      spauth.getAuth(test.url, test.creds)
        .then(response => {

          let options: request.OptionsWithUrl = getDefaultHeaders() as request.OptionsWithUrl;
          let headers: any = _.assign(options.headers, response.headers);

          if (response.options && response.options['agent']) {
            agent = response.options['agent'];
          }

          send({
            host: parsedUrl.host,
            hostname: parsedUrl.hostname,
            port: parseInt(parsedUrl.port, 10),
            protocol: parsedUrl.protocol,
            path: `${parsedUrl.path}_api/web/lists/getbytitle('${documentTitle}')`,
            method: 'GET',
            headers: headers,
            agent: agent
          }, clientRequest => {
            let results = '';

            clientRequest.on('data', chunk => {
              results += chunk;
            });

            clientRequest.on('error', chunk => {
              done(new Error('Unexpected error during http(s) request'));
            });

            clientRequest.on('end', () => {
              let data: any = JSON.parse(results);
              expect(data.d.Title).to.equal(documentTitle);
              done();
            });
          }).end();
        })
        .catch(done);
    });

    it('should get list title', function (done: MochaDone): void {
      this.timeout(90 * 1000);
      let documentTitle = 'Documents';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          let options: request.OptionsWithUrl = getDefaultHeaders() as request.OptionsWithUrl;
          _.assign(options.headers, response.headers);
          _.assign(options, response.options);
          options.url = `${test.url}_api/web/lists/getbytitle('${documentTitle}')`;

          return request.get(options);
        })
        .then((data: IncomingMessage) => {
          expect((data as any).body.d.Title).to.equal(documentTitle);
          done();
        })
        .catch(done);
    });

    it('should get Title field', function (done: MochaDone): void {
      this.timeout(90 * 1000);
      let fieldTitle = 'Title';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          let options: request.OptionsWithUrl = getDefaultHeaders() as request.OptionsWithUrl;
          _.assign(options.headers, response.headers);
          _.assign(options, response.options);
          options.url = `${test.url}_api/web/fields/getbytitle('${fieldTitle}')`;

          return request.get(options);
        })
        .then(data => {
          expect((data as any).body.d.Title).to.equal(fieldTitle);
          done();
        })
        .catch(done);
    });

    it('should not setup custom options for request', function (done: MochaDone): void {
      spauth.setup({
        requestOptions: {
          headers: {
          }
        }
      });
      configuredRequest.get('http://google.com', {
        simple: false,
        resolveWithFullResponse: true
      })
      .then((result: any) => {
        expect(result.request.headers['my-test-header']).equals(undefined);
        done();
      })
      .catch(done);
    });

    it('should setup custom options for request', function (done: MochaDone): void {
      spauth.setup({
        requestOptions: {
          headers: {
            'my-test-header': 'my value'
          }
        }
      });

      configuredRequest.get('http://google.com', {
        simple: false,
        resolveWithFullResponse: true
      })
      .then((result: any) => {
        expect(result.request.headers['my-test-header']).equals('my value');
        done();
      })
      .catch(done);
    });

  });
});

function getDefaultHeaders(): request.RequestPromiseOptions {
  let options: request.RequestPromiseOptions = _.assign({}, {
    headers: {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose'
    },
    json: true,
    strictSSL: false,
    resolveWithFullResponse: true,
    simple: true
  });

  return options;
}
