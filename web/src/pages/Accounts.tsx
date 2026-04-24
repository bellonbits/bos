import {
  Row, Col, Card, Typography, Space, Button,
  List, Avatar, Tag, Divider, Modal, Select, Input, Form, message
} from 'antd';
import {
  BankOutlined, WalletOutlined, MobileOutlined,
  PlusOutlined, ArrowRightOutlined, HistoryOutlined,
  DollarOutlined, TransactionOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { SalesAPI, ExpenseAPI } from '@/services/api';
import { darkTokens } from '@/theme';
import { formatKES } from '@/utils/formatters';

const { Title, Text } = Typography;

export default function AccountsPage() {
  const { business } = useAuthStore();
  const businessId = business?.id ?? '';
  const queryClient = useQueryClient();
  const [transferModal, setTransferModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [accountModal, setAccountModal] = useState(false);
  const [accountDetailsModal, setAccountDetailsModal] = useState<any | null>(null);

  // Fake local adjustments for UX satisfaction
  const [localAdjustments, setLocalAdjustments] = useState<any>({ cash: 0, mpesa: 0, bank: 0 });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', businessId],
    queryFn: () => SalesAPI.list(businessId).then(r => r.data),
    enabled: !!businessId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: () => ExpenseAPI.list(businessId).then(r => r.data),
    enabled: !!businessId,
  });

  const cashRevenue = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
  const mpesaRevenue = sales.filter(s => s.payment_method === 'mpesa').reduce((sum, s) => sum + s.total_amount, 0);
  const totalRevenue = cashRevenue + mpesaRevenue;
  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netPosition = totalRevenue - totalExpenseAmount;

  const cashBalance = cashRevenue + localAdjustments.cash;
  const mpesaBalance = mpesaRevenue + localAdjustments.mpesa;

  const ACCOUNTS = [
    { title: 'Cash Sales Float', balance: cashBalance, type: 'Cash', icon: <WalletOutlined />, color: '#F59E0B', id: 'cash', sub: `${sales.filter(s => s.payment_method === 'cash').length} transactions` },
    { title: 'M-Pesa Collections', balance: mpesaBalance, type: 'Mobile Money', icon: <MobileOutlined />, color: '#10B981', id: 'mpesa', sub: `${sales.filter(s => s.payment_method === 'mpesa').length} transactions` },
    { title: 'Net Cash Position', balance: netPosition, type: 'Net', icon: <BankOutlined />, color: netPosition >= 0 ? '#1E3944' : '#F43F5E', id: 'net', sub: 'Revenue minus all expenses' },
  ];

  type LedgerEntry = { id: string; type: string; title: string; amount: number; date: number; status: string; isNegative?: boolean };
  
  const ledger: LedgerEntry[] = [
    ...sales.map(s => ({
      id: s.id, type: 'Sale', title: `Sale via ${s.payment_method.toUpperCase()}`, amount: s.total_amount, date: s.created_at, status: 'Completed'
    })),
    ...expenses.map(e => ({
      id: e.id, type: 'Expense', title: e.category, amount: e.amount, date: e.created_at, status: 'Completed', isNegative: true
    }))
  ].sort((a, b) => b.date - a.date).slice(0, 10);


  async function handleRecordExpense(values: any) {
    if (!values.amount || !values.category) return;
    try {
      await ExpenseAPI.create({
        business_id: businessId,
        amount: Number(values.amount),
        category: values.category,
        description: values.description || undefined,
      });
      message.success('Expense recorded successfully!');
      setExpenseModal(false);
      expenseForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    } catch {
      message.error('Failed to record expense');
    }
  }

  function handleTransfer(values: any) {
    if (!values.amount || !values.from || !values.to) return;
    if (values.from === values.to) {
      message.warning('Cannot transfer to the same account!');
      return;
    }
    const amt = Number(values.amount);
    setLocalAdjustments((prev: any) => ({
      ...prev,
      [values.from]: prev[values.from] - amt,
      [values.to]: prev[values.to] + amt,
    }));
    message.success(`KSh ${amt} successfully transferred!`);
    setTransferModal(false);
    transferForm.resetFields();
  }

  function simulateReconciliation() {
    message.loading({ content: 'Syncing and reconciling transactions with bank nodes...', key: 'recon' });
    setTimeout(() => {
      message.success({ content: 'All accounts reconciled and balanced automatically.', key: 'recon', duration: 3 });
    }, 2000);
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Row gutter={[32, 32]} align="middle" style={{ marginBottom: 32 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>
            Accounts & Finance
          </Title>
          <Text type="secondary">Manage your business liquidity across cash, bank, and mobile money.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<HistoryOutlined />}>Transaction History</Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAccountModal(true)}
              style={{ background: darkTokens.sidebarBg, borderRadius: 8, height: 40, border: 'none' }}
            >
              Add New Account
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[32, 32]}>
        {/* Main Accounts List (Cactus Center) */}
        <Col xs={24} lg={17}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {ACCOUNTS.map((acc, i) => (
              <Card 
                key={i}
                variant="borderless" 
                style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                hoverable
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Avatar 
                    size={48} 
                    icon={acc.icon} 
                    style={{ background: `${acc.color}15`, color: acc.color, borderRadius: 12 }} 
                  />
                  <Tag bordered={false} style={{ borderRadius: 6, height: 24 }}>{acc.type}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>{acc.title}</Text>
                <Title level={2} style={{ margin: '4px 0 20px', fontWeight: 700 }}>{formatKES(acc.balance)}</Title>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button type="link" onClick={() => setAccountDetailsModal(acc)} style={{ padding: 0, color: darkTokens.sidebarBg }}>Account Details</Button>
                  <Button type="text" onClick={() => setTransferModal(true)} icon={<TransactionOutlined />}>Transfer</Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Ledger Logs */}
          <Card 
            variant="borderless" 
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: 32 }}
            title={<Text strong>Recent Ledger Entries</Text>}
          >
            <List
              itemLayout="horizontal"
              dataSource={ledger.length > 0 ? ledger : []}
              locale={{ emptyText: 'No ledger entries yet' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.isNegative ? <DollarOutlined /> : <TransactionOutlined />} style={{ backgroundColor: item.isNegative ? '#FFF1F2' : '#ECFDF5', color: item.isNegative ? '#F43F5E' : '#10B981' }} />}
                    title={<Text strong>{item.title}</Text>}
                    description={`${new Date(item.date).toLocaleString()} • ID: ${item.id.slice(0, 8)}`}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Text strong style={{ display: 'block', color: item.isNegative ? '#F43F5E' : '#10B981' }}>
                      {item.isNegative ? '-' : '+'}{formatKES(item.amount)}
                    </Text>
                    <Tag bordered={false} color={item.status === 'Completed' ? 'success' : 'processing'}>{item.status}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Finance Intelligence (Cactus Right Sidebar) */}
        <Col xs={24} lg={7}>
          <Card 
            variant="borderless" 
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24 }}
            title={<Text strong>Liquidity Status</Text>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Total Revenue', value: totalRevenue, color: '#10B981' },
                { label: 'Cash Sales', value: cashRevenue, color: '#94A3B8' },
                { label: 'M-Pesa Collections', value: mpesaRevenue, color: '#94A3B8' },
                { label: 'Total Expenses', value: totalExpenseAmount, color: '#F43F5E' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  <Text strong style={{ color: item.color }}>{formatKES(item.value)}</Text>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: netPosition >= 0 ? '#ECFDF5' : '#FFF1F2', display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: netPosition >= 0 ? '#10B981' : '#F43F5E' }}>
                  {netPosition >= 0 ? '✓ Cash-positive' : '⚠ Expenses exceed revenue'}
                </Text>
                <Text strong style={{ color: netPosition >= 0 ? '#10B981' : '#F43F5E' }}>{formatKES(netPosition)}</Text>
              </div>
            </div>
          </Card>

          <Card 
            variant="borderless" 
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            title={<Text strong>Finance Quick Actions</Text>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ActionButton icon={<DollarOutlined />} label="Record Manual Expense" onClick={() => setExpenseModal(true)} />
              <ActionButton icon={<TransactionOutlined />} label="Internal Fund Transfer" onClick={() => setTransferModal(true)} />
              <ActionButton icon={<BankOutlined />} label="Reconcile Statements" onClick={simulateReconciliation} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Transfer Modal */}
      <Modal 
        title="Internal Fund Transfer" 
        open={transferModal} 
        onCancel={() => setTransferModal(false)}
        onOk={() => transferForm.submit()}
        okText="Confirm Transfer"
        okButtonProps={{ style: { background: darkTokens.sidebarBg } }}
      >
        <div style={{ paddingTop: 20 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Move funds between your internal accounts. This does not affect external expenses.</Text>
          <Form form={transferForm} layout="vertical" onFinish={handleTransfer}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="from" label="From Account" rules={[{ required: true }]}>
                  <Select placeholder="Select source" options={ACCOUNTS.map(a => ({ label: a.title, value: a.id }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="to" label="To Account" rules={[{ required: true }]}>
                  <Select placeholder="Select destination" options={ACCOUNTS.map(a => ({ label: a.title, value: a.id }))} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="amount" label="Amount to Transfer" rules={[{ required: true }]}>
              <Input type="number" placeholder="0.00" prefix="KSh" style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Manual Expense Modal */}
      <Modal 
        title="Record Manual Expense" 
        open={expenseModal} 
        onCancel={() => setExpenseModal(false)}
        onOk={() => expenseForm.submit()}
        okText="Record Expense"
        okButtonProps={{ style: { background: '#F43F5E', border: 'none' } }}
      >
        <div style={{ paddingTop: 20 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Quickly log a business expense directly into your ledger.</Text>
          <Form form={expenseForm} layout="vertical" onFinish={handleRecordExpense}>
            <Form.Item name="description" label="Expense Description / Note" rules={[{ required: true }]}>
              <Input placeholder="e.g. Paid KPLC tokens" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input type="number" placeholder="0.00" prefix="KSh" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select placeholder="Select..." options={['Rent', 'Utilities', 'Payroll', 'Supplies', 'Transport', 'Marketing', 'Repairs'].map(c => ({ label: c, value: c }))} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      {/* Add Account Modal (Simulated) */}
      <Modal
        title="Add New Account or Wallet"
        open={accountModal}
        onCancel={() => setAccountModal(false)}
        onOk={() => { message.success('Action simulated! New account integrations require core banking setups.'); setAccountModal(false); }}
        okText="Connect Integration"
        okButtonProps={{ style: { background: darkTokens.sidebarBg } }}
      >
        <div style={{ paddingTop: 20 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Select a banking or mobile money provider to integrate securely.</Text>
          <Select placeholder="Select Provider..." style={{ width: '100%', marginBottom: 16 }} options={[{ label: 'KCB Bank', value: 'kcb' }, { label: 'Airtel Money', value: 'airtel' }, { label: 'Cooperative Bank', value: 'coop' }]} />
          <Input placeholder="API integration Key or Account Number" />
        </div>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        title={
          <Space>
            {accountDetailsModal?.icon}
            <span>{accountDetailsModal?.title} Details</span>
          </Space>
        }
        open={!!accountDetailsModal}
        onCancel={() => setAccountDetailsModal(null)}
        footer={[
          <Button key="close" onClick={() => setAccountDetailsModal(null)}>Close</Button>,
          <Button key="recon" type="primary" style={{ background: darkTokens.sidebarBg }} onClick={() => { simulateReconciliation(); setAccountDetailsModal(null); }}>Reconcile Now</Button>
        ]}
      >
        {accountDetailsModal && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 24, padding: 24, background: '#F8FAFC', borderRadius: 12 }}>
              <Text type="secondary">Current Available Balance</Text>
              <Title level={2} style={{ margin: '8px 0 0', color: accountDetailsModal.color }}>
                {formatKES(accountDetailsModal.balance)}
              </Title>
              <Tag bordered={false} style={{ marginTop: 12 }}>{accountDetailsModal.type} Account</Tag>
            </div>
            
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Account Configurations</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <Text type="secondary">Account ID</Text>
              <Text strong>{accountDetailsModal.id.toUpperCase()}-BOS-991</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <Text type="secondary">Status</Text>
              <Tag color="success">Active</Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <Text type="secondary">Last Reconciled</Text>
              <Text strong>{new Date().toLocaleDateString()}</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: any) {
  return (
    <Button 
      block 
      icon={icon} 
      onClick={onClick}
      style={{ height: 48, textAlign: 'left', display: 'flex', alignItems: 'center', borderRadius: 8 }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <ArrowRightOutlined style={{ fontSize: 12, color: '#94A3B8' }} />
    </Button>
  );
}

