import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Input,
  Select,
  Modal,
  Form,
  Popconfirm,
  Typography,
  Alert,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSpecialRoles, assignRole, removeRole } from '../api/roles';
import { getPersonas } from '../api/personas';

const ROLE_OPTIONS = [
  { value: 'DECKER', label: 'DECKER' },
  { value: 'SPIDER', label: 'SPIDER' },
  { value: 'GRIDGOD', label: 'GRIDGOD' },
];

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['special-roles'],
    queryFn: getSpecialRoles,
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ personaId, role }: { personaId: string; role: string }) =>
      assignRole(personaId, role),
    onSuccess: () => {
      message.success('Роль назначена');
      queryClient.invalidateQueries({ queryKey: ['special-roles'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Ошибка назначения роли'),
  });

  const removeMutation = useMutation({
    mutationFn: (personaId: string) => removeRole(personaId),
    onSuccess: () => {
      message.success('Роль снята');
      queryClient.invalidateQueries({ queryKey: ['special-roles'] });
    },
    onError: () => message.error('Ошибка снятия роли'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const roleColumns = [
    {
      title: 'Персона',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>{name}</span>
      ),
    },
    {
      title: 'Логин',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: { id: string; name: string }) => (
        <Popconfirm
          title={`Снять роль с ${record.name}?`}
          onConfirm={() => removeMutation.mutate(record.id)}
        >
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  const rolesToShow = useMemo(() => {
    const list: ('DECKER' | 'SPIDER' | 'GRIDGOD')[] = filterRole
      ? [filterRole as 'DECKER' | 'SPIDER' | 'GRIDGOD']
      : ['DECKER', 'SPIDER', 'GRIDGOD'];
    return list;
  }, [filterRole]);

  function filterItems(items: { id: string; name: string; username: string }[]) {
    if (!searchText) return items;
    const lower = searchText.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(lower) || i.username.toLowerCase().includes(lower),
    );
  }

  function renderRoleCard(roleName: 'DECKER' | 'SPIDER' | 'GRIDGOD', color: string) {
    const items = filterItems(roles?.[roleName] ?? []);
    return (
      <Card
        title={
          <Typography.Text style={{ color, fontFamily: 'monospace', fontSize: 16 }}>
            {roleName}
          </Typography.Text>
        }
        style={{
          background: '#1a1a1a',
          border: `1px solid ${color}33`,
          flex: 1,
          minWidth: 300,
        }}
        headStyle={{ borderBottom: `1px solid ${color}33` }}
      >
        {roleName === 'GRIDGOD' && (
          <Alert
            message="Только один активный GRIDGOD разрешен"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          columns={roleColumns}
          dataSource={items}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
        />
      </Card>
    );
  }

  const colorMap: Record<string, string> = { DECKER: '#00bfff', SPIDER: '#ff6600', GRIDGOD: '#00ff41' };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', margin: 0 }}>
          РОЛИ
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Назначить роль
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Поиск по имени/логину..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          allowClear
          placeholder="Фильтр по роли"
          value={filterRole}
          onChange={setFilterRole}
          style={{ width: 160 }}
          options={ROLE_OPTIONS}
        />
      </Space>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {rolesToShow.map((r) => renderRoleCard(r, colorMap[r]))}
        </div>
      </Space>

      <Modal
        title="Назначить роль"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={assignMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => assignMutation.mutate(values)}
        >
          <Form.Item name="personaId" label="Персона" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Поиск персоны..."
              filterOption={false}
              onSearch={setPersonaSearch}
              options={personaSelectOptions}
            />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} placeholder="Выберите роль" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
