/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import http from 'http';
import { IRouter } from '../../../../../src/core/server';

async function doRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (resp) => {
      let body = '';

      resp.on('data', (chunk) => {
        body += chunk;
      });

      resp.on('end', (res) => {
        resolve(body);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    req.write(options.body);
    req.end();
  });
}

export function defineRoutes(router: IRouter) {
  router.post(
    {
      path: '/api/shard_map/query',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (ctx, req, resp) => {
      try {
        const ret = await doRequest({
          method: 'POST',
          host: 'localhost',
          port: 8000,
          path: '/query',
          body: JSON.stringify(req.body),
          headers: {
            'content-type': 'application/json',
          },
        });
        return resp.ok({ body: ret });
      } catch (err) {
        // console.log('doRequest', err);
        return resp.badRequest({ body: err });
      }
    }
  );
}
