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
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiPageContentBody } from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  EuiToolTip,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDraggable,
  EuiDroppable,
  EuiPanel,
  EuiIconTip,
  EuiSpacer,
  EuiFieldText,
  EuiInMemoryTable,
} from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui/lib/services';
import {
  ApolloClient,
  useQuery,
  useMutation,
  ApolloProvider,
  InMemoryCache,
  from,
  createHttpLink,
} from '@apollo/client';
import { LIST_NODES, LIST_SHARDS, MOVE_SHARD } from './query';
import { PLUGIN_ID } from '../../common';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import { CoreStart } from '../../../../../src/core/public';
const makeId = htmlIdGenerator();

function matchRuleShort(str: string, rule: string) {
  const escapeRegex = (x: string) => x.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
  return new RegExp('^' + rule.split('*').map(escapeRegex).join('.*') + '$').test(str);
}

export function getIndexFriendlyName(str: string) {
  if (matchRuleShort(str, 'cim-*-span*')) {
    const offset = str.indexOf('-span');

    return str.substring('cim-'.length, offset);
  }
  return str;
}

export const loadData = (nodes: any, shards: any) => {
  const indexMap = new Map();
  const nodeMap = new Map();
  for (let i = 0; i < shards.length; i++) {
    const shard = shards[i];

    // console.log('shard [' + i + ']', name, shard.index, shard.shard);
    if (!(shard.node in nodeMap)) {
      nodeMap.set(shard.node, 0);
    }
    if (!(shard.index in indexMap)) {
      indexMap.set(shard.index, 0);
    }
    nodeMap.set(shard.node, nodeMap.get(shard.node) + shard.indexingRate);
    indexMap.set(shard.index, indexMap.get(shard.index) + shard.indexingRate);
  }

  const nodesArray: any = [];
  nodes.forEach((node: any) => {
    let value = 0;
    if (nodeMap.has(node.name)) {
      value = Math.round(nodeMap.get(node.name) / 60) * 1.0;
    }
    nodesArray.push({ node: node.name, indexingRate: value > 0 ? value : 0 });
  });
  const indicesArray: any = [];
  indexMap.forEach((value, key, map) =>
    indicesArray.push({
      index: key,
      indexingRate: value > 0 ? Math.round(value / 60) * 1.0 : 0,
    })
  );
  return [nodesArray, indicesArray];
};

const Node = ({ node, shards }) => {
  return (
    <EuiToolTip position="right" content={node.name}>
      <EuiFlexItem>
        <EuiDroppable
          key={node.name}
          droppableId={'DROPPABLE_AREA_TYPE_' + node.name}
          type="TYPE_ONE"
          spacing="m"
          withPanel
        >
          {shards.map((shard, idx) => (
            <Shard index={idx} key={makeId()} shard={shard} />
          ))}
        </EuiDroppable>
      </EuiFlexItem>
    </EuiToolTip>
  );
};
const getColor = (state: string) => {
  switch (state) {
    case 'STARTED':
      return '#017D73';
    case 'RELOCATING':
      return '#F1D86F';
    case 'UNASSIGNED':
      return '#E7664C';
    default:
      return '#017D73';
  }
};
const Shard = ({ index, shard }) => {
  return (
    <EuiDraggable
      key={shard.id}
      index={index}
      draggableId={`${shard.node}/${shard.index}/${shard.shard}`}
      spacing="m"
    >
      {(provided, state) => (
        <EuiToolTip
          position="right"
          content={'index ' + shard.index + ' shard ' + shard.shard + ' state ' + shard.state}
        >
          <EuiPanel key={makeId()} hasShadow={state.isDragging}>
            <div style={{ color: getColor(shard.state) }}>
              {getIndexFriendlyName(shard.name) + ':' + shard.shard + ':' + shard.prirep}
              {state.isDragging && ' ✨'}
            </div>
          </EuiPanel>
        </EuiToolTip>
      )}
    </EuiDraggable>
  );
};
const Table2 = ({ data }) => {
  const columns = [
    {
      field: 'node',
      name: 'Node',
      sortable: true,
    },
    {
      name: 'Indexing Rate',
      field: 'indexingRate',
      sortable: true,
    },
  ];
  const sorting = {
    sort: {
      field: 'indexingRate',
      direction: 'desc',
    },
  };
  return <EuiInMemoryTable items={data} columns={columns} pagination={false} sorting={sorting} />;
};
const Table3 = ({ data }) => {
  const columns = [
    {
      field: 'index',
      name: 'Index',
      sortable: true,
    },
    {
      field: 'indexingRate',
      name: 'Indexing Rate',
      sortable: true,
    },
  ];
  const sorting = {
    sort: {
      field: 'indexingRate',
      direction: 'desc',
    },
  };
  return <EuiInMemoryTable items={data} columns={columns} pagination={false} sorting={sorting} />;
};
export const Table = () => {
  const [indexName, setIndexName] = useState('cim-*');
  const onChangeIndexName = (e) => {
    setIndexName(e.target.value);
  };
  const onDragEnd = async ({ source, destination, draggableId }) => {
    const [node, index, shard] = draggableId.split('/');
    const target = destination.droppableId.substring('DROPPABLE_AREA_TYPE_'.length);
    // console.log("target", target);
    if (source && destination && source.droppableId !== destination.droppableId) {
      // console.log(`moving ${index} ${shard} from ${node} to ${target}`);
      const res = await moveShard({
        variables: { shard, index, toNode: target, fromNode: node },
        update: (cache) => {
          // console.log('moved');
        },
      });
      // console.log(res.data);
    }
  };
  const { loading: loadingNodes, error: errorNodes, data: dataNodes } = useQuery(LIST_NODES);
  const { loading: loadingShards, error: errorShards, data: dataShards } = useQuery(LIST_SHARDS, {
    variables: {
      filter: indexName,
    },
  });
  const [moveShard] = useMutation(MOVE_SHARD);
  if (loadingNodes) return <p>Loading nodes ...</p>;
  if (errorNodes) return <p>`Error in loading nodes! {errorNodes.message}`</p>;
  if (loadingShards) return <p>Loading shards ...</p>;
  if (errorShards) return <p>`Error in loading shards! {errorShards.message}`</p>;
  const shardMap = {};
  for (let i = 0; i < dataShards.shards.length; i++) {
    const shard = dataShards.shards[i];
    if (!(shard.node in shardMap)) {
      shardMap[shard.node] = [];
    }
    shardMap[shard.node].push(shard);
  }
  const [nodeData, indexData] = loadData(dataNodes.nodes, dataShards.shards);
  return (
    <Fragment>
      <EuiFieldText
        key="textfield-0"
        fullWidth
        placeholder="cim-*"
        value={indexName}
        onChange={(e) => onChangeIndexName(e)}
        append={[<EuiIconTip key={makeId()} content="index" />]}
        aria-label="Use aria labels when no actual label is in use"
      />
      <EuiSpacer key={makeId()} size="m" />
      <div>
        <EuiDragDropContext key={makeId()} onDragEnd={onDragEnd}>
          <EuiFlexGroup key={makeId()} wrap={true}>
            {dataNodes.nodes.map((node, idx) => (
              <Node idx={idx} key={makeId()} node={node} shards={shardMap[node.name] || []} />
            ))}
          </EuiFlexGroup>
        </EuiDragDropContext>
      </div>
      <EuiSpacer key={makeId()} size="m" />
      <Table2 data={nodeData} />
      <EuiSpacer key={makeId()} size="m" />
      <Table3 data={indexData} />
    </Fragment>
  );
};
interface ShardmapAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}
export const ShardMapApp = ({ basename, notifications, http, navigation }: ShardmapAppDeps) => {
  // Use React hooks to manage state.
  const client = new ApolloClient({
    link: from([
      createHttpLink({
        credentials: 'same-origin',
        headers: { 'kbn-xsrf': 'true' },
        uri: `${http.basePath.get()}/api/shard_map/query`,
      }),
    ]),
    cache: new InMemoryCache(),
  });
  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <ApolloProvider client={client}>
        <I18nProvider>
          <>
            <navigation.ui.TopNavMenu appName={PLUGIN_ID} showSearchBar={false} />
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>
                  <EuiPageContentBody>
                    <Table />
                  </EuiPageContentBody>
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </>
        </I18nProvider>
      </ApolloProvider>
    </Router>
  );
};
