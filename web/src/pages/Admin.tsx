import { 
  Row, Col, Card, Typography, Statistic, Table, Tag, 
  Space, Button, List, Avatar, Tabs, message, Spin
} from 'antd';
import { 
  UserOutlined, ShopOutlined, TransactionOutlined, 
  AreaChartOutlined, TeamOutlined, SafetyOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAPI } from '@/services/api';
import { formatKES, formatDate } from '@/utils/formatters';

const { Title, Text } = Typography;

export default function AdminPage() {
  const qc = useQueryClient();
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => AdminAPI.stats().then(r => r.data)
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => AdminAPI.users().then(r => r.data)
  });

  const { data: businesses = [], isLoading: bizLoading, refetch: refetchBiz } = useQuery({
    queryKey: ['admin', 'businesses'],
    queryFn: () => AdminAPI.businesses().then(r => r.data)
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => AdminAPI.updateRole(userId, role),
    onSuccess: () => {
      message.success('User role updated');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const userColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'volcano' : 'blue'}>{role.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Businesses',
      dataIndex: 'business_count',
      key: 'business_count'
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts: number) => formatDate(ts)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.role !== 'admin' && (
            <Button size="small" onClick={() => updateRole.mutate({ userId: record.id, role: 'admin' })}>Make Admin</Button>
          )}
          {record.role === 'admin' && (
            <Button size="small" onClick={() => updateRole.mutate({ userId: record.id, role: 'owner' })}>Demote</Button>
          )}
        </Space>
      )
    }
  ];

  const bizColumns = [
    {
      title: 'Business Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: 'Owner',
      dataIndex: 'owner_email',
      key: 'owner_email'
    },
    {
      title: 'Plan',
      dataIndex: 'tier',
      key: 'tier',
      render: (tier: string) => (
        <Tag color={tier === 'premium' ? 'gold' : tier === 'standard' ? 'green' : 'default'} bordered={false}>
          {tier.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts: number) => formatDate(ts)
    }
  ];

  const tabItems = [
    {
      key: 'dashboard',
      label: <Space><AreaChartOutlined /> Overview</Space>,
      children: (
        <div>
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={12} sm={6}>
              <Card variant="borderless" style={{ background: '#F8FAFC' }}>
                <Statistic title="Total Users" value={stats?.total_users} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" style={{ background: '#F8FAFC' }}>
                <Statistic title="Businesses" value={stats?.total_businesses} prefix={<ShopOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" style={{ background: '#F8FAFC' }}>
                <Statistic title="Total Revenue" value={stats?.total_revenue} prefix={<TransactionOutlined />} formatter={(v) => formatKES(Number(v))} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" style={{ background: '#F8FAFC' }}>
                <Statistic title="Active Admins" value={users.filter((u: any) => u.role === 'admin').length} prefix={<SafetyOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="Recent Signups" variant="borderless" style={{ borderRadius: 16 }}>
                <List
                  dataSource={stats?.recent_users || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={item.name}
                        description={item.email}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.created_at)}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Plan Distribution" variant="borderless" style={{ borderRadius: 16 }}>
                <div style={{ padding: '20px 0' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Free Tier</Text>
                      <Text strong>{stats?.tiers?.free || 0}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Standard Tier</Text>
                      <Text strong>{stats?.tiers?.standard || 0}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Premium Tier</Text>
                      <Text strong>{stats?.tiers?.premium || 0}</Text>
                    </div>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'users',
      label: <Space><UserOutlined /> User Management</Space>,
      children: (
        <Table 
          dataSource={users} 
          columns={userColumns} 
          rowKey="id" 
          loading={usersLoading}
          pagination={{ pageSize: 12 }}
        />
      )
    },
    {
      key: 'businesses',
      label: <Space><ShopOutlined /> Business Oversight</Space>,
      children: (
        <Table 
          dataSource={businesses} 
          columns={bizColumns} 
          rowKey="id" 
          loading={bizLoading}
        />
      )
    }
  ];

  if (statsLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>System Administration</Title>
          <Text type="secondary">Global overview and platform management.</Text>
        </Col>
        <Col>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => { refetchStats(); refetchUsers(); refetchBiz(); }}
          >
            Refresh All
          </Button>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs items={tabItems} size="large" />
      </Card>
    </div>
  );
}
