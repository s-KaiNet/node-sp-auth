import { expect } from 'chai';
import got, { Options } from 'got';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import 'mocha';

import { IAuthOptions } from './../../src/auth/IAuthOptions';
import * as spauth from './../../src/index';
import { request as configuredRequest } from './../../src/config';
import { UrlHelper } from '../../src/utils/UrlHelper';

interface ITestInfo {
  name: string;
  creds: IAuthOptions;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config: any = require('./config');

const tests: any[] = [
 /* {
    name: 'adfs user credentials',
    creds: config.adfsCredentials,
    url: config.onpremAdfsEnabledUrl
  },
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
    name: 'online user credentials',
    creds: config.onlineCreds,
    url: config.onlineUrl
  },*/
  {
    name: 'on-premise addin only',
    creds: config.onpremAddinOnly,
    url: config.onpremNtlmEnabledUrl
  } /*
  {
    name: 'online addin only',
    creds: config.onlineAddinOnly,
    url: config.onlineUrl
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
  }*/
];

tests.forEach(test => {
  test.url = UrlHelper.removeTrailingSlash(test.url);

  describe(`node-sp-auth: integration - ${test.name}`, () => {

    it('should get list title with core http(s)', function (done: Mocha.Done): void {
      this.timeout(90 * 1000);

      const parsedUrl: url.Url = url.parse(test.url);
      const documentTitle = 'Documents';
      const isHttps: boolean = parsedUrl.protocol === 'https:';

      const send: (options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => http.ClientRequest =
        isHttps ? https.request : http.request;
      let agent: http.Agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) :
        new http.Agent();

      spauth.getAuth(test.url, test.creds)
        .then(response => {

          const options = getDefaultHeaders();
          const headers: any = Object.assign(options.headers, response.headers);

          if (response.options && response.options['agent']) {
            agent = response.options['agent'];
          }

          send({
            host: parsedUrl.host,
            hostname: parsedUrl.hostname,
            port: parseInt(parsedUrl.port, 10),
            protocol: parsedUrl.protocol,
            path: `${parsedUrl.path}/_api/web/lists/getbytitle('${documentTitle}')`,
            method: 'GET',
            headers: headers,
            agent: agent
          }, clientRequest => {
            let results = '';

            clientRequest.on('data', chunk => {
              results += chunk;
            });

            clientRequest.on('error', () => {
              done(new Error('Unexpected error during http(s) request'));
            });

            clientRequest.on('end', () => {
              const data: any = JSON.parse(results);
              expect(data.d.Title).to.equal(documentTitle);
              done();
            });
          }).end();
        })
        .catch(done);
    });

    it('should get list title', function (done: Mocha.Done): void {
      this.timeout(90 * 1000);
      const documentTitle = 'Documents';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          const options = getDefaultHeaders();
          Object.assign(options.headers, response.headers);
          Object.assign(options, response.options);
          options.url = `${test.url}/_api/web/lists/getbytitle('${documentTitle}')`;

          return got.get(options).json();
        })
        .then(data => {
          expect((data as any).d.Title).to.equal(documentTitle);
          done();
        })
        .catch(done);
    });

    it('should get Title field', function (done: Mocha.Done): void {
      this.timeout(90 * 1000);
      const fieldTitle = 'Title';

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          const options = getDefaultHeaders();
          Object.assign(options.headers, response.headers);
          Object.assign(options, response.options);
          options.url = `${test.url}/_api/web/fields/getbytitle('${fieldTitle}')`;

          return got(options).json();
        })
        .then(data => {
          expect((data as any).d.Title).to.equal(fieldTitle);
          done();
        })
        .catch(done);
    });

    it('should throw 500 error', function (done: Mocha.Done): void {
      this.timeout(90 * 1000);

      spauth.getAuth(test.url, test.creds)
        .then(response => {
          const options = getDefaultHeaders();
          Object.assign(options.headers, response.headers);
          Object.assign(options, response.options);
          const path = UrlHelper.trimSlashes(url.parse(test.url).path);
          options.url = `${test.url}/_api/web/GetFileByServerRelativeUrl(@FileUrl)?@FileUrl='/${path}/SiteAssets/${encodeURIComponent('undefined.txt')}'`;
          options.retry = 0;

          return got.get(options);
        })
        .then(() => {
          done(new Error('Should throw'));
        })
        .catch(err => {
          if (err.message.indexOf('500') !== -1 || err.message.indexOf('404') !== -1) {
            done()
          } else {
            done(err);
          }
        });
    });

    it('should not setup custom options for request', function (done: Mocha.Done): void {
      spauth.setup({
        requestOptions: {
          headers: {
          }
        }
      });
      configuredRequest.get('http://google.com')
        .then(result => {
          expect(result.headers['my-test-header']).equals(undefined);
          done();
        })
        .catch(done);
    });

    it('should setup custom options for request', function (done: Mocha.Done): void {
      spauth.setup({
        requestOptions: {
          headers: {
            'my-test-header': 'my value'
          }
        }
      });

      configuredRequest.get('http://google.com')
        .then(result => {
          expect(result.request.options.headers['my-test-header']).equals('my value');
          done();
        })
        .catch(done);
    });

  });
});

function getDefaultHeaders(): any {
  const options: Options = {
    responseType: 'json',
    headers: {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose'
    },
    rejectUnauthorized: false
  };

  return options;
}
