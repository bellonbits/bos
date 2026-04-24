import { useState } from 'react';
import {
  Input, Button, Empty, Spin, Modal, Form, Radio,
  Divider, Typography, Badge, message,
  Row, Col, Card, List,
} from 'antd';
import {
  SearchOutlined, ShoppingCartOutlined, DeleteOutlined,
  FilterOutlined, DollarOutlined, MobileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Unstable_NumberInput as NumberInput, numberInputClasses } from "@mui/base/Unstable_NumberInput";
import { useQuery } from '@tanstack/react-query';
import { ProductAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { usePOSStore, type PaymentMethod } from '@/stores/posStore';
import { formatKES } from '@/utils/formatters';
import { tokens, darkTokens } from '@/theme';

const { Text, Title } = Typography;

const numberInputStyles = `
  .base-qty-input {
    display: flex; align-items: center;
    border: 1.5px solid #E2E8F0; border-radius: 8px;
    overflow: hidden; width: 90px;
  }
  .base-qty-input.${numberInputClasses.focused} {
    border-color: ${tokens.primary};
  }
  .base-qty-input input {
    width: 32px; text-align: center; border: none; outline: none;
    font-size: 13px; font-weight: 600; padding: 4px 0;
    background: transparent;
  }
  .base-qty-btn {
    width: 28px; height: 28px; border: none; cursor: pointer;
    background: #F8FAFC; color: ${tokens.primary};
    font-size: 16px; display: flex; align-items: center; justify-content: center;
  }
`;

export default function IncomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const { business } = useAuthStore();
  const { cart, addToCart, total, itemCount } = usePOSStore();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', business?.id, search],
    queryFn: () => ProductAPI.list(business!.id, search || undefined).then((r) => r.data),
    enabled: !!business?.id,
  });

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  const filtered = category
    ? products.filter((p) => p.category === category)
    : products;

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      <style>{numberInputStyles}</style>

      <Row gutter={[32, 32]}>
        {/* ── Left Column: Categories ────────────────────────────────────────── */}
        <Col xs={24} lg={4}>
          <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Text strong style={{ display: 'block', marginBottom: 16 }}>Categories</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button 
                type={!category ? 'primary' : 'text'} 
                block 
                style={{ textAlign: 'left', background: !category ? darkTokens.sidebarBg : 'transparent' }}
                onClick={() => setCategory(null)}
              >
                All Products
              </Button>
              {categories.map(cat => (
                <Button 
                  key={cat}
                  type={category === cat ? 'primary' : 'text'} 
                  block 
                  style={{ textAlign: 'left', background: category === cat ? darkTokens.sidebarBg : 'transparent' }}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <Divider />
            <Button block icon={<FilterOutlined />} size="small">More Filters</Button>
          </Card>
        </Col>

        {/* ── Center Column: Product Search & Grid ────────────────────────────── */}
        <Col xs={24} lg={13}>
          <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Scan barcode or type product name..."
              size="large"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: 12, height: 48, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
            />
            <Button icon={<ReloadOutlined style={{ color: '#94A3B8' }} />} style={{ height: 48, width: 48, borderRadius: 12 }} />
          </div>

          <Card variant="borderless" style={{ borderRadius: 16, minHeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {isLoading ? (
              <div style={{ padding: 100, textAlign: 'center' }}><Spin size="large" /></div>
            ) : filtered.length === 0 ? (
              <Empty description="No matching products found." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                {filtered.map(p => (
                  <CactusProductCard 
                    key={p.id} 
                    product={p} 
                    onAdd={() => addToCart(p)}
                    inCart={cart.find(i => i.product_id === p.id)?.quantity ?? 0}
                  />
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* ── Right Column: Cart / Summary ────────────────────────────────────── */}
        <Col xs={24} lg={7}>
          <Card 
            variant="borderless" 
            style={{ borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <Title level={4} style={{ margin: 0 }}>Current Cart</Title>
              <Text type="secondary">{itemCount()} items selected</Text>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 400 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <ShoppingCartOutlined style={{ fontSize: 48, color: '#E2E8F0', marginBottom: 16 }} />
                  <Text type="secondary" style={{ display: 'block' }}>Cart is empty</Text>
                </div>
              ) : (
                <List
                  dataSource={cart}
                  renderItem={item => (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 14 }}>{item.product_name}</Text>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => usePOSStore.getState().removeFromCart(item.product_id)} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <NumberInput
                          value={item.quantity}
                          min={1}
                          onChange={(_, v) => v && usePOSStore.getState().updateQty(item.product_id, v)}
                          slots={{
                            root: (props) => <div {...props} className="base-qty-input" />,
                            decrementButton: (props) => <button {...props} className="base-qty-btn">−</button>,
                            incrementButton: (props) => <button {...props} className="base-qty-btn">+</button>,
                          }}
                        />
                        <Text strong style={{ color: tokens.primary }}>{formatKES(item.unit_price * item.quantity)}</Text>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: 24, background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Subtotal</Text>
                  <Text strong>{formatKES(total())}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text strong style={{ fontSize: 18 }}>Total Amount</Text>
                  <Text strong style={{ fontSize: 22, color: tokens.primary }}>{formatKES(total())}</Text>
                </div>
                {/* Profit Estimation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Estimated Profit</Text>
                  <Text strong style={{ fontSize: 12, color: '#10B981' }}>
                    {formatKES(cart.reduce((sum, item) => sum + ((item.unit_price - (item.cost_price || 0)) * item.quantity), 0))}
                  </Text>
                </div>
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  onClick={() => setShowPayment(true)}
                  style={{ height: 52, borderRadius: 12, background: darkTokens.sidebarBg, fontWeight: 700 }}
                >
                  Pay with Cash / M-Pesa
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <PaymentModal 
        open={showPayment} 
        onClose={() => setShowPayment(false)} 
        businessId={business?.id || ''} 
      />
    </div>
  );
}

function CactusProductCard({ product, onAdd, inCart }: any) {
  const isOut = product.stock_quantity <= 0;
  return (
    <div 
      onClick={isOut ? undefined : onAdd}
      style={{
        padding: 16, borderRadius: 12, border: `1px solid ${inCart > 0 ? tokens.primary : '#F1F5F9'}`,
        background: '#fff', cursor: isOut ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', textAlign: 'center',
        opacity: isOut ? 0.6 : 1,
        boxShadow: inCart > 0 ? '0 4px 12px rgba(15, 76, 129, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
      }}
      className="product-card"
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }} ellipsis>{product.name}</Text>
      <Text strong style={{ color: tokens.primary, fontSize: 15, display: 'block' }}>{formatKES(product.price)}</Text>
      <Text type="secondary" style={{ fontSize: 11 }}>{product.stock_quantity} in stock</Text>
      {inCart > 0 && <Badge count={inCart} color={tokens.primary} style={{ position: 'absolute', top: 12, right: 12 }} />}
    </div>
  );
}

// ─── Shared Components & Modals ───────────────────────────────────────────────
// Standard AntD icons used directly.

function PaymentModal({ open, onClose, businessId }: any) {
  const [form] = Form.useForm();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const { checkout, isProcessing, total, subtotal, discount, setDiscount, estimatedProfit } = usePOSStore();

  async function handleConfirm() {
    try {
      const values = await form.validateFields();
      await checkout(businessId, method, values.mpesa_code ?? undefined, values.mpesa_phone ?? undefined);
      message.success('Sale recorded successfully!');
      form.resetFields();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message !== 'validation failed') {
        message.error('Failed to complete transaction.');
      }
    }
  }

  const profit = estimatedProfit();

  return (
    <Modal
      title="Complete Payment"
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      centered
    >
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <Text type="secondary">Total to Collect</Text>
        <Title level={1} style={{ margin: '4px 0 0', color: tokens.primary }}>{formatKES(total())}</Title>
        {discount > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Subtotal {formatKES(subtotal())} · Discount −{formatKES(discount)}
          </Text>
        )}
        {profit > 0 && (
          <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: '#ECFDF5' }}>
            <Text style={{ fontSize: 12, color: '#10B981' }}>Est. profit: {formatKES(profit)}</Text>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item label="Payment Method" style={{ marginBottom: 16 }}>
          <Radio.Group 
            value={method} 
            onChange={e => setMethod(e.target.value)} 
            style={{ width: '100%' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PaymentMethodCard selected={method === 'cash'} value="cash" icon={<DollarOutlined />} label="Cash" />
              <PaymentMethodCard selected={method === 'mpesa'} value="mpesa" icon={<MobileOutlined />} label="M-Pesa" />
            </div>
          </Radio.Group>
        </Form.Item>

        {method === 'mpesa' && (
          <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <Form.Item name="mpesa_phone" label="Customer M-Pesa Number (Optional)" style={{ marginBottom: 12 }}>
              <Input placeholder="07XX XXX XXX" />
            </Form.Item>
            <Form.Item name="mpesa_code" label="M-Pesa Confirmation Code" rules={[{ required: true, message: 'Please enter code' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="e.g. QWE123RTY" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </div>
        )}

        <Form.Item label="Discount (Optional)" style={{ marginBottom: 8 }}>
          <Input
            prefix={<span style={{ color: '#94A3B8' }}>KSh</span>}
            type="number"
            placeholder="0"
            value={discount || ''}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Button
          type="primary"
          block
          size="large"
          loading={isProcessing}
          onClick={handleConfirm}
          style={{ height: 52, borderRadius: 12, background: darkTokens.sidebarBg, fontWeight: 700, marginTop: 8 }}
        >
          Confirm {method === 'mpesa' ? 'M-Pesa' : 'Cash'} · {formatKES(total())}
        </Button>
      </Form>
    </Modal>
  );
}

function PaymentMethodCard({ selected, value, icon, label }: any) {
  return (
    <Radio.Button 
      value={value} 
      style={{
        height: 60, borderRadius: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10, border: `1.5px solid ${selected ? tokens.primary : '#E2E8F0'}`,
        background: selected ? '#F1F5F9' : '#fff', transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: 18, color: selected ? tokens.primary : '#94A3B8' }}>{icon}</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </Radio.Button>
  );
}
