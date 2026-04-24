import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePOSStore } from '@stores/posStore';
import { useAuthStore } from '@stores/authStore';
import { ProductRepo, type Product } from '@db/repositories/ProductRepo';
import { useDashboardStore } from '@stores/dashboardStore';
import {
  Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow,
} from '@constants/theme';
import { formatKES } from '@utils/helpers';
import type { PaymentMethod } from '@db/repositories/SaleRepo';

const { width } = Dimensions.get('window');
const PRODUCT_COLS = 3;
const PRODUCT_CARD_W = (width - Spacing.lg * 2 - Spacing.sm * (PRODUCT_COLS - 1)) / PRODUCT_COLS;

export default function POSScreen() {
  const { business } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const { cart, addToCart, getTotal, getItemCount } = usePOSStore();

  const loadProducts = useCallback(async () => {
    if (!business) return;
    const list = search.trim()
      ? await ProductRepo.searchByName(business.id, search.trim())
      : await ProductRepo.findByBusiness(business.id);
    setProducts(list);
  }, [business, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const total = getTotal();
  const itemCount = getItemCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Point of Sale</Text>
        {itemCount > 0 && (
          <TouchableOpacity style={styles.cartBtn} onPress={() => setShowCart(true)}>
            <Ionicons name="cart" size={22} color={Colors.textInverse} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Product Grid */}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={PRODUCT_COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            inCart={cart.find((c) => c.product_id === item.id)?.quantity ?? 0}
            onPress={() => addToCart(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'No products found' : 'No products yet.\nAdd products in Inventory.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Checkout Sticky Bar */}
      {total > 0 && (
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.checkoutLabel}>{itemCount} items</Text>
            <Text style={styles.checkoutTotal}>{formatKES(total)}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => setShowPayment(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal */}
      <CartModal visible={showCart} onClose={() => setShowCart(false)} onCheckout={() => {
        setShowCart(false);
        setShowPayment(true);
      }} />

      {/* Payment Modal */}
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          setShowPayment(false);
          if (business) useDashboardStore.getState().refresh(business.id);
        }}
      />
    </View>
  );
}

function ProductCard({
  product, inCart, onPress,
}: {
  product: Product; inCart: number; onPress: () => void;
}) {
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        Shadow.sm,
        inCart > 0 && styles.productCardActive,
        isOutOfStock && styles.productCardDisabled,
      ]}
      onPress={onPress}
      disabled={isOutOfStock}
      activeOpacity={0.75}
    >
      {inCart > 0 && (
        <View style={styles.inCartBadge}>
          <Text style={styles.inCartText}>{inCart}</Text>
        </View>
      )}
      <View style={styles.productEmoji}>
        <Text style={{ fontSize: 28 }}>🛒</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productPrice}>{formatKES(product.price)}</Text>
      <Text style={[styles.productStock, isOutOfStock && styles.outOfStock]}>
        {isOutOfStock ? 'Out of stock' : `${product.stock_quantity} left`}
      </Text>
    </TouchableOpacity>
  );
}

function CartModal({ visible, onClose, onCheckout }: {
  visible: boolean; onClose: () => void; onCheckout: () => void;
}) {
  const { cart, removeFromCart, updateQuantity, getTotal, getSubtotal, discount, setDiscount } = usePOSStore();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Cart</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.cartList}>
          {cart.map((item) => (
            <View key={item.product_id} style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>{item.product_name}</Text>
                <Text style={styles.cartItemPrice}>{formatKES(item.unit_price)} each</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cartItemSubtotal}>
                {formatKES(item.unit_price * item.quantity)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.cartFooter}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatKES(getTotal())}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} activeOpacity={0.85}>
            <Text style={styles.checkoutBtnText}>Proceed to Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PaymentModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { business } = useAuthStore();
  const { getTotal, recordSale, isProcessing, clearCart } = usePOSStore();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [mpesaCode, setMpesaCode] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');

  async function handleConfirm() {
    if (!business) return;
    if (method === 'mpesa' && !mpesaCode.trim()) {
      Alert.alert('M-Pesa Code Required', 'Please enter the M-Pesa confirmation code.');
      return;
    }
    try {
      await recordSale(
        business.id, method,
        method === 'mpesa' ? mpesaCode.trim() : undefined,
        method === 'mpesa' ? mpesaPhone.trim() : undefined,
      );
      setMpesaCode('');
      setMpesaPhone('');
      onSuccess();
    } catch (err) {
      Alert.alert('Sale Failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Payment</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.paymentAmount}>
          <Text style={styles.payLabel}>Amount Due</Text>
          <Text style={styles.payTotal}>{formatKES(getTotal())}</Text>
        </View>

        <View style={styles.methodSection}>
          <Text style={styles.methodLabel}>Payment Method</Text>
          <View style={styles.methodRow}>
            <MethodButton
              label="Cash"
              icon="cash"
              active={method === 'cash'}
              color={Colors.primary}
              onPress={() => setMethod('cash')}
            />
            <MethodButton
              label="M-Pesa"
              icon="phone-portrait"
              active={method === 'mpesa'}
              color={Colors.mpesa}
              onPress={() => setMethod('mpesa')}
            />
          </View>
        </View>

        {method === 'mpesa' && (
          <View style={styles.mpesaFields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>M-Pesa Code *</Text>
              <TextInput
                style={styles.fieldInput}
                value={mpesaCode}
                onChangeText={setMpesaCode}
                placeholder="e.g. QJK7SL8X2Y"
                autoCapitalize="characters"
                autoCorrect={false}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Customer Phone (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={mpesaPhone}
                onChangeText={setMpesaPhone}
                placeholder="0712 345 678"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, isProcessing && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
            {isProcessing ? 'Processing...' : `Confirm ${method === 'mpesa' ? 'M-Pesa' : 'Cash'} Payment`}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MethodButton({ label, icon, active, color, onPress }: {
  label: string; icon: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.methodBtn, active && { borderColor: color, backgroundColor: `${color}15` }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as never} size={24} color={active ? color : Colors.textMuted} />
      <Text style={[styles.methodBtnLabel, active && { color, fontWeight: FontWeight.bold }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textInverse },
  cartBtn: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: Colors.primary },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  row: { gap: Spacing.sm, marginBottom: Spacing.sm },
  productCard: {
    width: PRODUCT_CARD_W, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', gap: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  productCardActive: { borderColor: Colors.primary },
  productCardDisabled: { opacity: 0.5 },
  inCartBadge: {
    position: 'absolute', top: 6, right: 6, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full, width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  inCartText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textInverse },
  productEmoji: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text, textAlign: 'center' },
  productPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  productStock: { fontSize: 10, color: Colors.textMuted },
  outOfStock: { color: Colors.danger },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, padding: Spacing.md, paddingBottom: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.lg,
  },
  checkoutLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  checkoutTotal: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  checkoutBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
  },
  checkoutBtnText: { color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  cartList: { flex: 1, padding: Spacing.lg },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm,
  },
  cartItemName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  cartItemPrice: { fontSize: FontSize.xs, color: Colors.textMuted },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: BorderRadius.sm, borderWidth: 1,
    borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, minWidth: 24, textAlign: 'center' },
  cartItemSubtotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, minWidth: 70, textAlign: 'right' },
  cartFooter: { padding: Spacing.lg, gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
  paymentAmount: { padding: Spacing.xl, alignItems: 'center', gap: 4 },
  payLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  payTotal: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.text },
  methodSection: { padding: Spacing.lg, gap: Spacing.sm },
  methodLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  methodRow: { flexDirection: 'row', gap: Spacing.md },
  methodBtn: {
    flex: 1, borderWidth: 2, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.xs,
  },
  methodBtnLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  mpesaFields: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  field: { gap: Spacing.xs },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  fieldInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.base, color: Colors.text, backgroundColor: Colors.surface,
  },
  confirmBtn: {
    margin: Spacing.lg, backgroundColor: Colors.success, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
