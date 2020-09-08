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
// yarn test:jest --watch -t testing src/plugins/shard_map/public/components/app.test.ts
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { LIST_NODES, LIST_SHARDS /* , MOVE_SHARD*/ } from './query';
import { loadData } from './app';

import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

test('loading data', async () => {
  const client = new ApolloClient({
    uri: 'http://localhost:8000/query',
    cache: new InMemoryCache(),
  });
  let res;
  res = await client.query({
    query: LIST_SHARDS,
    variables: {
      filter: 'cim-*',
    },
  });

  const shards = res.data.shards;
  res = await client.query({
    query: LIST_NODES,
  });

  let data = JSON.stringify(shards, null, 2);
  await writeFileAsync('shards.json', data);

  const nodes = res.data.nodes;
  // console.log('shards', shards.length);

  data = JSON.stringify(nodes, null, 2);
  await writeFileAsync('nodes.json', data);
});

test('testing data', async () => {
  let data = await readFileAsync('shards.json');
  const shards = JSON.parse(data.toString());
  data = await readFileAsync('nodes.json');
  const nodes = JSON.parse(data.toString());
  const res = loadData(nodes, shards);
  // console.log('res', res.length);
  // console.log('res', res);
});
