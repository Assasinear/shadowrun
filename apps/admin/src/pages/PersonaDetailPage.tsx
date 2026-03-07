import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Descriptions,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Card,
  Spin,
  Result,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  message,
  Image,
} from 'antd';
import {
  ArrowLeftOutlined,
  QrcodeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPersona,
  updatePersona,
  changeRole,
  getSinQr,
  issueLicenses,
  removeLicense,
  resetPassword,
} from '../api/personas';
import { setBalance } from '../api/economy';
import dayjs from 'dayjs';
import type { License, Device } from '../types';

export default function PersonaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [balanceForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [licenseForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const { data: persona, isLoading, error } = useQuery({
    queryKey: ['persona', id],
    queryFn: () => getPersona(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => updatePersona(id!, values),
    onSuccess: () => {
      message.success('Persona updated');
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
    },
    onError: () => message.error('Update failed'),
  });

  const roleMutation = useMutation({
    mutationFn: (role: string) => changeRole(id!, role),
    onSuccess: () => {
      message.success('Role changed');
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
      setRoleModalOpen(false);
    },
    onError: () => message.error('Failed to change role'),
  });

  const balanceMutation = useMutation({
    mutationFn: (balance: number) => setBalance(persona!.wallet!.id, balance),
    onSuccess: () => {
      message.success('Balance updated');
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
      setBalanceModalOpen(false);
    },
    onError: () => message.error('Failed to update balance'),
  });

  const licenseMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => issueLicenses(id!, values),
    onSuccess: () => {
      message.success('License issued');
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
      setLicenseModalOpen(false);
      licenseForm.resetFields();
    },
    onError: () => message.error('Failed to issue license'),
  });

  const removeLicenseMutation = useMutation({
    mutationFn: (licenseId: string) => removeLicense(id!, licenseId),
    onSuccess: () => {
      message.success('License removed');
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
    },
    onError: () => message.error('Failed to remove license'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) => resetPassword(id!, password),
    onSuccess: () => {
      message.success('Пароль сброшен');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    },
    onError: () => message.error('Ошибка сброса пароля'),
  });

  const handleGenerateQr = async () => {
    try {
      const result = await getSinQr(id!);
      setQrImage(result.qrDataUrl);
      setQrModalOpen(true);
    } catch {
      message.error('Failed to generate QR');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error || !persona) return <Result status="error" title="Failed to load persona" />;

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/personas')}>
          Back
        </Button>
        <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', margin: 0 }}>
          {persona.name}
        </Typography.Title>
      </Space>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title="Persona Info"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                editForm.setFieldsValue({
                  name: persona.name,
                  avatar: persona.avatar,
                  address: persona.address,
                  profession: persona.profession,
                  extraInfo: persona.extraInfo,
                  isPublic: persona.isPublic,
                });
                setEditModalOpen(true);
              }}
            >
              Редактировать
            </Button>
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="ID">{persona.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{persona.name}</Descriptions.Item>
            <Descriptions.Item label="Address">{persona.address ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Profession">{persona.profession ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Avatar">{persona.avatar ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Public">{persona.isPublic ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Extra Info" span={2}>{persona.extraInfo ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(persona.createdAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="User Info"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Space size="small">
              <Button size="small" icon={<KeyOutlined />} onClick={() => setPasswordModalOpen(true)}>
                Сброс пароля
              </Button>
              <Button size="small" onClick={() => setRoleModalOpen(true)}>
                Сменить роль
              </Button>
            </Space>
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Username">{persona.user?.username ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={persona.user?.role === 'GRIDGOD' ? 'red' : 'default'}>
                {persona.user?.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {persona.user?.isBlocked ? (
                <Tag color="error">Blocked</Tag>
              ) : (
                <Tag color="success">Active</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="LLS (SIN)"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Button size="small" icon={<QrcodeOutlined />} onClick={handleGenerateQr}>
              Generate QR
            </Button>
          }
        >
          {persona.lls ? (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="SIN">{persona.lls.sin}</Descriptions.Item>
              <Descriptions.Item label="Public">{persona.lls.isPublic ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="ICE Level">{persona.lls.iceLevel}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">No LLS assigned</Typography.Text>
          )}
        </Card>

        <Card
          title="Wallet"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            persona.wallet && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  balanceForm.setFieldsValue({ balance: Number(persona.wallet!.balance) });
                  setBalanceModalOpen(true);
                }}
              >
                Edit Balance
              </Button>
            )
          }
        >
          {persona.wallet ? (
            <Typography.Title level={4} style={{ color: '#00ff41', margin: 0 }}>
              ¥{Number(persona.wallet.balance).toFixed(2)}
            </Typography.Title>
          ) : (
            <Typography.Text type="secondary">No wallet</Typography.Text>
          )}
        </Card>

        <Card
          title="Devices"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
        >
          <Table
            dataSource={persona.devices ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code' },
              { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => v ?? '—' },
              { title: 'Type', dataIndex: 'type', key: 'type' },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (s: string) =>
                  s === 'BRICKED' ? <Tag color="error">BRICKED</Tag> : <Tag color="success">ACTIVE</Tag>,
              },
            ]}
          />
        </Card>

        <Card
          title="Licenses"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => setLicenseModalOpen(true)}>
              Add License
            </Button>
          }
        >
          <Table
            dataSource={persona.licenses ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Type', dataIndex: 'type', key: 'type' },
              { title: 'Name', dataIndex: 'name', key: 'name' },
              {
                title: 'Description',
                dataIndex: 'description',
                key: 'description',
                render: (v: string) => v ?? '—',
              },
              {
                title: 'Issued',
                dataIndex: 'issuedAt',
                key: 'issuedAt',
                render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
              },
              {
                title: '',
                key: 'actions',
                width: 50,
                render: (_: unknown, record: License) => (
                  <Popconfirm
                    title="Remove license?"
                    onConfirm={() => removeLicenseMutation.mutate(record.id)}
                  >
                    <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Modal
        title="Generate SIN QR"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
      >
        {qrImage && (
          <div style={{ textAlign: 'center' }}>
            <Image src={qrImage} alt="SIN QR Code" style={{ maxWidth: 300 }} />
          </div>
        )}
      </Modal>

      <Modal
        title="Set Balance"
        open={balanceModalOpen}
        onCancel={() => setBalanceModalOpen(false)}
        onOk={() => balanceForm.submit()}
        confirmLoading={balanceMutation.isPending}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={(values) => balanceMutation.mutate(values.balance)}
        >
          <Form.Item name="balance" label="New Balance" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change Role"
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        confirmLoading={roleMutation.isPending}
      >
        <Form
          form={roleForm}
          layout="vertical"
          initialValues={{ role: persona.user?.role }}
          onFinish={(values) => roleMutation.mutate(values.role)}
        >
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'DECKER', label: 'DECKER' },
                { value: 'SPIDER', label: 'SPIDER' },
                { value: 'GRIDGOD', label: 'GRIDGOD' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Выдать лицензию"
        open={licenseModalOpen}
        onCancel={() => setLicenseModalOpen(false)}
        onOk={() => licenseForm.submit()}
        confirmLoading={licenseMutation.isPending}
      >
        <Form
          form={licenseForm}
          layout="vertical"
          onFinish={(values) => licenseMutation.mutate(values)}
        >
          <Form.Item name="type" label="Тип лицензии" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Редактировать персону"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => {
            updateMutation.mutate(v);
            setEditModalOpen(false);
          }}
        >
          <Form.Item name="name" label="Имя"><Input /></Form.Item>
          <Form.Item name="avatar" label="Аватар"><Input /></Form.Item>
          <Form.Item name="address" label="Адрес"><Input /></Form.Item>
          <Form.Item name="profession" label="Профессия"><Input /></Form.Item>
          <Form.Item name="extraInfo" label="Доп. информация"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Сброс пароля"
        open={passwordModalOpen}
        onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }}
        onOk={() => passwordForm.submit()}
        confirmLoading={resetPasswordMutation.isPending}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={(v) => resetPasswordMutation.mutate(v.password)}
        >
          <Form.Item name="password" label="Новый пароль" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
