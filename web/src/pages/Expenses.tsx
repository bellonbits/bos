import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Typography, Table, Input, Button,
  Space, Tag, Tooltip, InputNumber, Modal, Form, Divider,
  List, Select, Popconfirm, message, Tabs,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, WarningOutlined,
  FilterOutlined, ReloadOutlined, BoxPlotOutlined,
  EditOutlined, DeleteOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductAPI, ExpenseAPI, type Product, type Expense } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatKES, formatDate } from '@/utils/formatters';
import { tokens, darkTokens, cactusTheme } from '@/theme';

const { Title, Text } = Typography;

const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Utilities', 'Stock Purchase', 'Transport',
  'Marketing', 'Equipment', 'Taxes', 'Insurance', 'Miscellaneous',
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // ── Product modal state ────────────────────────────────────────────────────
  const [productModal, setProductModal] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [productForm] = Form.useForm();

  // ── Expense modal state ────────────────────────────────────────────────────
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm] = Form.useForm();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products', business?.id, search],
    queryFn: () => ProductAPI.list(business!.id, search || undefined).then((r) => r.data),
    enabled: !!business?.id,
  });

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', business?.id],
    queryFn: () => ExpenseAPI.list(business!.id).then((r) => r.data),
    enabled: !!business?.id,
  });

  // ── Product mutations ──────────────────────────────────────────────────────
  const createProduct = useMutation({
    mutationFn: (values: any) =>
      ProductAPI.create({ ...values, business_id: business!.id }).then((r) => r.data),
    onSuccess: () => {
      message.success('Product added successfully');
      qc.invalidateQueries({ queryKey: ['products', business?.id] });
      setProductModal({ open: false, editing: null });
      productForm.resetFields();
    },
    onError: () => message.error('Failed to save product'),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      ProductAPI.update(id, values).then((r) => r.data),
    onSuccess: () => {
      message.success('Product updated');
      qc.invalidateQueries({ queryKey: ['products', business?.id] });
      setProductModal({ open: false, editing: null });
      productForm.resetFields();
    },
    onError: () => message.error('Failed to update product'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => ProductAPI.delete(id),
    onSuccess: () => {
      message.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['products', business?.id] });
    },
    onError: () => message.error('Failed to delete product'),
  });

  // ── Expense mutations ──────────────────────────────────────────────────────
  const createExpense = useMutation({
    mutationFn: (values: any) =>
      ExpenseAPI.create({ ...values, business_id: business!.id }).then((r) => r.data),
    onSuccess: () => {
      message.success('Expense recorded');
      qc.invalidateQueries({ queryKey: ['expenses', business?.id] });
      setExpenseModal(false);
      expenseForm.resetFields();
    },
    onError: () => message.error('Failed to record expense'),
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => ExpenseAPI.delete(id),
    onSuccess: () => {
      message.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses', business?.id] });
    },
    onError: () => message.error('Failed to delete expense'),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Handlers ───────────────────────────────────────────────────────────────


  function openEditProduct(p: Product) {
    productForm.setFieldsValue(p);
    setProductModal({ open: true, editing: p });
  }

  function handleProductSubmit(values: any) {
    if (productModal.editing) {
      updateProduct.mutate({ id: productModal.editing.id, values });
    } else {
      createProduct.mutate(values);
    }
  }

  // ── Product table columns ──────────────────────────────────────────────────
  const productColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.sku || record.category || 'No SKU'}</Text>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag bordered={false}>{cat || 'Uncategorized'}</Tag>,
    },
    {
      title: 'In Stock',
      dataIndex: 'stock_quantity',
      key: 'stock_quantity',
      render: (qty: number, record: Product) => (
        <Space>
          <Text strong style={{ color: qty <= record.low_stock_threshold ? '#F43F5E' : 'inherit' }}>
            {qty} {record.unit}
          </Text>
          {qty <= record.low_stock_threshold && (
            <Tooltip title="Low Stock Alert">
              <WarningOutlined style={{ color: '#F43F5E' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Cost Price',
      dataIndex: 'cost_price',
      key: 'cost_price',
      render: (price: number) => formatKES(price),
    },
    {
      title: 'Selling Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => <Text strong style={{ color: tokens.primary }}>{formatKES(price)}</Text>,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, record: Product) => {
        const margin = record.price > 0 ? ((record.price - record.cost_price) / record.price * 100).toFixed(0) : 0;
        return <Tag color={Number(margin) >= 30 ? 'success' : 'warning'} bordered={false}>{margin}%</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Tooltip title="Edit product">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditProduct(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete this product?"
            description="This cannot be undone."
            onConfirm={() => deleteProduct.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} loading={deleteProduct.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Expense table columns ──────────────────────────────────────────────────
  const expenseColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts: number) => formatDate(ts),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag bordered={false}>{cat}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (d: string) => <Text type="secondary">{d || '—'}</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => <Text strong style={{ color: '#F43F5E' }}>{formatKES(amt)}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Expense) => (
        <Popconfirm
          title="Delete this expense?"
          onConfirm={() => deleteExpense.mutate(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'inventory',
      label: 'Inventory / Products',
      children: (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Search products by name, SKU or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: 8, height: 40 }}
            />
            <Button icon={<FilterOutlined />}>Filters</Button>
          </div>
          <Table
            dataSource={products}
            columns={productColumns}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
          />
        </div>
      ),
    },
    {
      key: 'expenses',
      label: 'Operating Expenses',
      children: (business?.subscription_tier === 'free') ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: '#F8FAFC', borderRadius: 16 }}>
          <Title level={4} style={{ color: '#1E293B', marginBottom: 8 }}>Expense Tracking is a Standard Feature</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Upgrade your account to log utilities, rent, salaries, and auto-deduct them from your profit margins.
          </Text>
          <Button type="primary" onClick={() => navigate('/pricing')} style={{ background: cactusTheme.accent, border: 'none', borderRadius: 8, height: 40, padding: '0 24px' }}>
            Upgrade to Standard
          </Button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">{expenses.length} expense records · Total: <Text strong style={{ color: '#F43F5E' }}>{formatKES(totalExpenses)}</Text></Text>
            <Button icon={<ReloadOutlined />} onClick={() => refetchExpenses()} />
          </div>
          <Table
            dataSource={expenses}
            columns={expenseColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Row gutter={[32, 32]} align="middle" style={{ marginBottom: 32 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>
            Expenses & Inventory
          </Title>
          <Text type="secondary">Manage stock, purchase costs, and operating expenses.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button
              icon={<DollarOutlined />}
              onClick={() => {
                if (business?.subscription_tier === 'free') {
                  message.info('Expense Tracking is a Standard feature. Please upgrade.');
                } else {
                  setExpenseModal(true);
                }
              }}
              style={{ borderRadius: 8, height: 40 }}
            >
              Record Expense
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: (business?.subscription_tier === 'free' && products.length >= 50) ? '#94A3B8' : darkTokens.sidebarBg, borderRadius: 8, height: 40, border: 'none' }}
              onClick={() => {
                if (business?.subscription_tier === 'free' && products.length >= 50) {
                  message.info('Free tier limit reached (50 products). Please upgrade to Standard.');
                } else {
                  setProductModal({ open: true, editing: null });
                }
              }}
            >
              Add Product
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[32, 32]}>
        {/* Main Content */}
        <Col xs={24} lg={17}>
          <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Tabs items={tabItems} />
          </Card>
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} lg={7}>
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24 }}
            title={<Text strong>Inventory Summary</Text>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SummaryRow label="Total Products" value={products.length} icon={<BoxPlotOutlined />} />
              <SummaryRow
                label="Low Stock Alerts"
                value={lowStockCount}
                icon={<WarningOutlined />}
                color={lowStockCount > 0 ? '#F43F5E' : '#94A3B8'}
              />
              <SummaryRow
                label="Total Expenses (All)"
                value={formatKES(totalExpenses)}
                icon={<DollarOutlined />}
                color="#F43F5E"
                raw
              />
              <Divider style={{ margin: '4px 0' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Inventory Valuation (at cost)
                </Text>
                <Title level={3} style={{ margin: 0 }}>{formatKES(inventoryValue)}</Title>
              </div>
            </div>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            title={<Text strong>Recent Expenses</Text>}
          >
            <List
              dataSource={expenses.slice(0, 5)}
              locale={{ emptyText: 'No expenses recorded yet' }}
              renderItem={(exp: Expense) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong style={{ fontSize: 13 }}>{exp.category}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>{exp.description || formatDate(exp.created_at)}</Text>}
                  />
                  <Text strong style={{ color: '#F43F5E' }}>{formatKES(exp.amount)}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Add / Edit Product Modal ─────────────────────────────────────────── */}
      <Modal
        title={productModal.editing ? 'Edit Product' : 'Add New Product'}
        open={productModal.open}
        onCancel={() => { setProductModal({ open: false, editing: null }); productForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => setProductModal({ open: false, editing: null })} style={{ borderRadius: 8 }}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            style={{ background: darkTokens.sidebarBg, borderRadius: 8, color: '#fff' }}
            loading={createProduct.isPending || updateProduct.isPending}
            onClick={() => productForm.submit()}
          >
            {productModal.editing ? 'Save Changes' : 'Add Product'}
          </Button>,
        ]}
        width={560}
      >
        <Form form={productForm} layout="vertical" onFinish={handleProductSubmit} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Coca-Cola 500ml" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                <Select placeholder="Unit">
                  {['pcs', 'kg', 'g', 'L', 'ml', 'box', 'dozen', 'pack'].map(u => (
                    <Select.Option key={u} value={u}>{u}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Selling Price (KSh)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cost_price" label="Cost Price (KSh)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock_quantity" label="Stock Quantity" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="low_stock_threshold" label="Low Stock Alert">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Select placeholder="Select category" allowClear>
                  {['Food & Beverage', 'Electronics', 'Clothing', 'Hardware', 'Medicine', 'Cosmetics', 'Other'].map(c => (
                    <Select.Option key={c} value={c}>{c}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sku" label="SKU / Barcode">
                <Input placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Record Expense Modal ─────────────────────────────────────────────── */}
      <Modal
        title="Record Operating Expense"
        open={expenseModal}
        onCancel={() => { setExpenseModal(false); expenseForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => setExpenseModal(false)} style={{ borderRadius: 8 }}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            style={{ background: '#F43F5E', borderRadius: 8, color: '#fff', border: 'none' }}
            loading={createExpense.isPending}
            onClick={() => expenseForm.submit()}
          >
            Record Expense
          </Button>,
        ]}
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={(v) => createExpense.mutate(v)}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select expense category">
              {EXPENSE_CATEGORIES.map(c => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount (KSh)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="description" label="Description / Notes">
            <Input.TextArea rows={2} placeholder="e.g. Monthly rent for Westlands shop" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function SummaryRow({ label, value, icon, color, raw }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        {icon && <div style={{ color: color || tokens.primary }}>{icon}</div>}
        <Text type="secondary">{label}</Text>
      </Space>
      <Text strong style={{ color: color || 'inherit' }}>{raw ? value : value}</Text>
    </div>
  );
}
