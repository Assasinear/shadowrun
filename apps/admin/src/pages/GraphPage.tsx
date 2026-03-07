import { useMemo, useCallback } from 'react';
import { Typography, Spin } from 'antd';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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

    const ns: Node[] = [];
    const es: Edge[] = [];

    const personaColumns = new Map<string, number>();
    let pIdx = 0;

    for (const p of personas) {
      const col = pIdx++;
      personaColumns.set(p.id, col);
      ns.push({
        id: `p-${p.id}`,
        type: 'default',
        position: { x: col * 220, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: `👤 ${p.name}` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${NODE_COLORS.persona}`,
          color: NODE_COLORS.persona,
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          minWidth: 120,
          textAlign: 'center' as const,
        },
      });
    }

    let hIdx = 0;
    for (const h of hosts) {
      ns.push({
        id: `h-${h.id}`,
        type: 'default',
        position: { x: hIdx * 220, y: 200 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: `🖥️ ${h.name}` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${NODE_COLORS.host}`,
          color: NODE_COLORS.host,
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          minWidth: 120,
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
          style: { stroke: NODE_COLORS.persona },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.persona },
          labelStyle: { fontSize: 10, fill: '#888' },
        });
      }

      if (h.spiderPersonaId) {
        es.push({
          id: `e-spider-${h.id}`,
          source: `p-${h.spiderPersonaId}`,
          target: `h-${h.id}`,
          label: 'spider',
          type: 'smoothstep',
          style: { stroke: NODE_COLORS.spider, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.spider },
          labelStyle: { fontSize: 10, fill: '#ff6600' },
        });
      }

      hIdx++;
    }

    let dIdx = 0;
    for (const d of devices) {
      ns.push({
        id: `d-${d.id}`,
        type: 'default',
        position: { x: dIdx * 180, y: 420 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: `📱 ${d.name ?? d.code} (${d.type})` },
        style: {
          background: '#1a1a1a',
          border: `2px solid ${d.status === 'BRICKED' ? '#ff4d4f' : NODE_COLORS.device}`,
          color: d.status === 'BRICKED' ? '#ff4d4f' : NODE_COLORS.device,
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 6,
          minWidth: 100,
          textAlign: 'center' as const,
        },
      });

      if (d.ownerPersonaId) {
        es.push({
          id: `e-device-${d.id}`,
          source: `p-${d.ownerPersonaId}`,
          target: `d-${d.id}`,
          label: 'device',
          type: 'smoothstep',
          style: { stroke: NODE_COLORS.device },
          markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.device },
          labelStyle: { fontSize: 10, fill: '#888' },
        });
      }

      dIdx++;
    }

    return { nodes: ns, edges: es };
  }, [personasData, hostsData, devicesData]);

  const loading = lp || lh || ld;

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', marginBottom: 16 }}>
        ГРАФ СВЯЗЕЙ
      </Typography.Title>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries({ persona: '👤 Персона', host: '🖥️ Хост', spider: '🕷️ Spider', device: '📱 Устройство' }).map(([key, label]) => (
          <span key={key} style={{ color: NODE_COLORS[key], fontFamily: 'monospace', fontSize: 13 }}>
            ● {label}
          </span>
        ))}
      </div>

      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
      ) : (
        <div style={{ width: '100%', height: 'calc(100vh - 250px)', background: '#0a0a0a', borderRadius: 8, border: '1px solid #1a3a1a' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
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
