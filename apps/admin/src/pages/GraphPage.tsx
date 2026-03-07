import { useMemo } from 'react';
import { Typography, Spin } from 'antd';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { useQuery } from '@tanstack/react-query';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import { getDevices } from '../api/devices';

const NODE_COLORS: Record<string, string> = {
  persona: '#00ff41',
  host: '#00bfff',
  spider: '#ff6600',
  device: '#ffcc00',
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 100,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  Dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export default function GraphPage() {
  const { data: personasData, isLoading: lp } = useQuery({
    queryKey: ['graph-personas'],
    queryFn: () => getPersonas({ limit: 200 }),
  });

  const { data: hostsData, isLoading: lh } = useQuery({
    queryKey: ['graph-hosts'],
    queryFn: () => getHosts({ limit: 200 }),
  });

  const { data: devicesData, isLoading: ld } = useQuery({
    queryKey: ['graph-devices'],
    queryFn: () => getDevices({ limit: 200 }),
  });

  const { nodes, edges } = useMemo(() => {
    const personas = personasData?.items ?? [];
    const hosts = hostsData?.items ?? [];
    const devices = devicesData?.items ?? [];

    const rawNodes: Node[] = [];
    const es: Edge[] = [];

    for (const p of personas) {
      rawNodes.push({
        id: `p-${p.id}`,
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: `👤 ${p.name}` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${NODE_COLORS.persona}`,
          color: NODE_COLORS.persona,
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          minWidth: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });
    }

    for (const h of hosts) {
      rawNodes.push({
        id: `h-${h.id}`,
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: `🖥️ ${h.name}` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${NODE_COLORS.host}`,
          color: NODE_COLORS.host,
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          minWidth: NODE_WIDTH,
          textAlign: 'center' as const,
        },
      });

      if (h.ownerPersonaId) {
        es.push({
          id: `e-owner-${h.id}`,
          source: `p-${h.ownerPersonaId}`,
          target: `h-${h.id}`,
          label: 'owner',
          type: 'smoothstep',
          animated: false,
          style: { stroke: NODE_COLORS.persona, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.persona },
          labelStyle: { fontSize: 10, fill: '#aaa', fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
        });
      }

      if (h.spiderPersonaId) {
        es.push({
          id: `e-spider-${h.id}`,
          source: `p-${h.spiderPersonaId}`,
          target: `h-${h.id}`,
          label: '🕷 spider',
          type: 'smoothstep',
          animated: true,
          style: { stroke: NODE_COLORS.spider, strokeWidth: 2, strokeDasharray: '8,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.spider },
          labelStyle: { fontSize: 10, fill: NODE_COLORS.spider, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
        });
      }
    }

    for (const d of devices) {
      const borderColor = d.status === 'BRICKED' ? '#ff4d4f' : NODE_COLORS.device;
      rawNodes.push({
        id: `d-${d.id}`,
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: `📱 ${d.name ?? d.code}\n(${d.type})` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${borderColor}`,
          color: borderColor,
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 6,
          minWidth: 120,
          textAlign: 'center' as const,
          whiteSpace: 'pre-line' as const,
        },
      });

      if (d.ownerPersonaId) {
        es.push({
          id: `e-device-${d.id}`,
          source: `p-${d.ownerPersonaId}`,
          target: `d-${d.id}`,
          label: 'device',
          type: 'smoothstep',
          style: { stroke: NODE_COLORS.device, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.device },
          labelStyle: { fontSize: 10, fill: '#aaa', fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
        });
      }
    }

    const layoutedNodes = layoutGraph(rawNodes, es);
    return { nodes: layoutedNodes, edges: es };
  }, [personasData, hostsData, devicesData]);

  const loading = lp || lh || ld;

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', marginBottom: 16 }}>
        ГРАФ СВЯЗЕЙ
      </Typography.Title>

      <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: NODE_COLORS.persona, fontFamily: 'monospace', fontSize: 13 }}>
          ● Персона
        </span>
        <span style={{ color: NODE_COLORS.host, fontFamily: 'monospace', fontSize: 13 }}>
          ● Хост
        </span>
        <span style={{ color: NODE_COLORS.spider, fontFamily: 'monospace', fontSize: 13 }}>
          - - Spider
        </span>
        <span style={{ color: NODE_COLORS.device, fontFamily: 'monospace', fontSize: 13 }}>
          ● Устройство
        </span>
        <span style={{ color: '#ff4d4f', fontFamily: 'monospace', fontSize: 13 }}>
          ● Bricked
        </span>
      </div>

      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
      ) : (
        <div style={{ width: '100%', height: 'calc(100vh - 250px)', background: '#0a0a0a', borderRadius: 8, border: '1px solid #1a3a1a' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="#1a3a1a" gap={24} />
            <Controls
              style={{ background: '#1a1a1a', borderColor: '#1a3a1a' }}
            />
            <MiniMap
              nodeColor={(node) => {
                const id = node.id;
                if (id.startsWith('p-')) return NODE_COLORS.persona;
                if (id.startsWith('h-')) return NODE_COLORS.host;
                if (id.startsWith('d-')) return NODE_COLORS.device;
                return '#888';
              }}
              style={{ background: '#0a0a0a', border: '1px solid #1a3a1a' }}
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
