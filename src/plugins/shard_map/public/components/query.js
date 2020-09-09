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

import { gql } from '@apollo/client';

export const LIST_SHARDS = gql`
  query ListShards($filter: String!) {
    shards(filter: $filter) {
      shard
      index
      node
      state
      prirep
      docs
      store
      name
      indexingRate
    }
  }
`;
export const LIST_NODES = gql`
  query ListNodes {
    nodes {
      ip
      heapPercent
      ramPercent
      cpu
      load_1m
      load_5m
      load_15m
      nodeRole
      master
      name
    }
  }
`;
/*
query {
   shards(filter: "cim-*") {
     shard
     index
     node
     state
     prirep
     docs
     store
     name
     indexingRate
   }
 }
*/
export const MOVE_SHARD = gql`
  mutation MoveShard($shard: Int!, $index: String!, $toNode: String!, $fromNode: String!) {
    moveShard(shard: $shard, index: $index, toNode: $toNode, fromNode: $fromNode) {
      name
      node
    }
  }
`;
