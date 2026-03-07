import { Typography, Card, Button, Space, Popconfirm, Row, Col, Tag, Spin, message } from 'antd';
import {
  ThunderboltOutlined,
  StopOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  terminateAllHacks,
  disableDecking,
  enableDecking,
  getDeckingStatus,
  resetAllBricks,
  exportDatabase,
} from '../api/emergency';
import dayjs from 'dayjs';

export default function EmergencyPage() {
  const queryClient = useQueryClient();

  const { data: deckingStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['deckingStatus'],
    queryFn: getDeckingStatus,
  });

  const terminateMutation = useMutation({
    mutationFn: terminateAllHacks,
    onSuccess: (data) => {
      message.success(`Terminated ${data.terminated} hack session(s)`);
    },
    onError: () => message.error('Failed to terminate hacks'),
  });

  const disableDeckingMutation = useMutation({
    mutationFn: disableDecking,
    onSuccess: () => {
      message.success('Decking disabled');
      queryClient.invalidateQueries({ queryKey: ['deckingStatus'] });
    },
    onError: () => message.error('Failed to disable decking'),
  });

  const enableDeckingMutation = useMutation({
    mutationFn: enableDecking,
    onSuccess: () => {
      message.success('Decking enabled');
      queryClient.invalidateQueries({ queryKey: ['deckingStatus'] });
    },
    onError: () => message.error('Failed to enable decking'),
  });

  const resetBricksMutation = useMutation({
    mutationFn: resetAllBricks,
    onSuccess: (data) => {
      message.success(`Reset ${data.reset} bricked device(s)`);
    },
    onError: () => message.error('Failed to reset bricks'),
  });

  const exportMutation = useMutation({
    mutationFn: exportDatabase,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shadowrun_db_${dayjs().format('YYYY-MM-DD_HH-mm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Database exported');
    },
    onError: () => message.error('Failed to export database'),
  });

  const isDeckingEnabled = deckingStatus?.enabled ?? true;

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#ff4d4f', fontFamily: 'monospace' }}>
        EMERGENCY CONTROLS
      </Typography.Title>

      <div
        style={{
          padding: 16,
          border: '2px solid #ff4d4f',
          borderRadius: 8,
          background: 'rgba(255, 77, 79, 0.04)',
        }}
      >
        <Typography.Text type="danger" strong style={{ fontSize: 14 }}>
          DANGER ZONE — These actions affect the entire game system. Use with caution.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card
            style={{
              background: '#1a1a1a',
              border: '1px solid #3a1a1a',
              height: '100%',
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Terminate All Hacks
                </Typography.Title>
                <Typography.Text type="secondary">
                  Immediately terminates all active hack sessions in the system.
                </Typography.Text>
              </div>
              <Popconfirm
                title="Terminate ALL active hack sessions?"
                description="This will cancel every ongoing hack in the game."
                onConfirm={() => terminateMutation.mutate()}
                okText="Terminate"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<ThunderboltOutlined />}
                  loading={terminateMutation.isPending}
                  block
                >
                  Terminate All Hacks
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            style={{
              background: '#1a1a1a',
              border: '1px solid #3a1a1a',
              height: '100%',
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Decking Control
                </Typography.Title>
                <Typography.Text type="secondary">
                  Toggle the ability for deckers to initiate new hacks.
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  {loadingStatus ? (
                    <Spin size="small" />
                  ) : (
                    <span>
                      Status:{' '}
                      {isDeckingEnabled ? (
                        <Tag color="green">ENABLED</Tag>
                      ) : (
                        <Tag color="red">DISABLED</Tag>
                      )}
                    </span>
                  )}
                </div>
              </div>
              {isDeckingEnabled ? (
                <Popconfirm
                  title="Disable decking for all players?"
                  onConfirm={() => disableDeckingMutation.mutate()}
                  okText="Disable"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<StopOutlined />}
                    loading={disableDeckingMutation.isPending}
                    block
                  >
                    Disable Decking
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="Enable decking?"
                  onConfirm={() => enableDeckingMutation.mutate()}
                >
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={enableDeckingMutation.isPending}
                    block
                  >
                    Enable Decking
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            style={{
              background: '#1a1a1a',
              border: '1px solid #3a1a1a',
              height: '100%',
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Reset All Bricked Devices
                </Typography.Title>
                <Typography.Text type="secondary">
                  Resets every bricked device back to active status.
                </Typography.Text>
              </div>
              <Popconfirm
                title="Reset ALL bricked devices?"
                description="All devices currently bricked will be set to ACTIVE."
                onConfirm={() => resetBricksMutation.mutate()}
                okText="Reset"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<ToolOutlined />}
                  loading={resetBricksMutation.isPending}
                  block
                >
                  Reset All Bricks
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            style={{
              background: '#1a1a1a',
              border: '1px solid #3a1a1a',
              height: '100%',
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Export Full Database
                </Typography.Title>
                <Typography.Text type="secondary">
                  Downloads a complete JSON snapshot of all data.
                </Typography.Text>
              </div>
              <Popconfirm
                title="Export full database?"
                onConfirm={() => exportMutation.mutate()}
              >
                <Button
                  icon={<DownloadOutlined />}
                  loading={exportMutation.isPending}
                  block
                >
                  Export Database
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
