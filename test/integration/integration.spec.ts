import { expect } from 'chai';
import * as request from 'request';
import * as _ from 'lodash';


import { IUserCredentialsOnline, IUserCredentialsOnPremise } from './../../src/auth/IAuthOptions';
import * as spauth from './../../src/index';

let config: any = require('./config');
let onlineCreds: IUserCredentialsOnline = config.onlineCreds;
let onpremCreds: IUserCredentialsOnPremise = config.onpremCreds;

describe(`sp-request: integration`, () => {

  xit('should do online', function (done: MochaDone): void {
    this.timeout(20 * 1000);

    spauth.getHeaders(onlineCreds)
      .then(response => {
        request.get(<request.OptionsWithUrl>{
          url: `${onlineCreds.siteUrl}_api/web/lists`,
          json: true,
          headers: _.assign({}, response.headers)
        }, (err, response, data) => {
          if (err) {
            done(err);
            return;
          }
          //console.log(data);
          done();
        });
      });
  });

  it('should do onprem', function (done: MochaDone): void {
    this.timeout(20 * 1000);

    spauth.getHeaders(onpremCreds)
      .then(response => {
        let opts: request.OptionsWithUrl = <request.OptionsWithUrl>_.assign({}, response.options);
        opts.headers = _.assign({}, response.headers);
        opts.url = `${onpremCreds.siteUrl}_api/web/lists`;
        opts.json = true;
        opts['Accept'] = 'application/json;odata=verbose';
        opts['Content-Type'] = 'application/json;odata=verbose';
        request.get(opts, (err, response, data) => {
          if (err) {
            done(err);
            return;
          }
          console.log(data);
          done();
        });
      });
  });
});

