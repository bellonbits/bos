import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@stores/authStore';
import { ProductRepo, type Product, type CreateProductInput } from '@db/repositories/ProductRepo';
import {
  Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow,
} from '@constants/theme';
import { formatKES } from '@utils/helpers';

type FilterType = 'all' | 'low_stock' | 'out_of_stock';

export default function InventoryScreen() {
  const { business } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    if (!business) return;
    setIsLoading(true);
    try {
      let list: Product[];
      if (search.trim()) {
        list = await ProductRepo.searchByName(business.id, search.trim());
      } else if (filter === 'low_stock') {
        list = await ProductRepo.findLowStock(business.id);
      } else {
        list = await ProductRepo.findByBusiness(business.id);
        if (filter === 'out_of_stock') {
          list = list.filter((p) => p.stock_quantity <= 0);
        }
      }
      setProducts(list);
    } finally {
      setIsLoading(false);
    }
  }, [business, filter, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const lowStockCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity <= 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Stat chips */}
      <View style={styles.stats}>
        <StatChip label="Total" count={products.length} color={Colors.primary} />
        <StatChip label="Low Stock" count={lowStockCount} color={Colors.warning} />
        <StatChip label="Out of Stock" count={outOfStockCount} color={Colors.danger} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(['all', 'low_stock', 'out_of_stock'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'All' : f === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadProducts} />}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onPress={() => setSelectedProduct(item)}
            onRestock={(qty) => handleRestock(item, qty)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      <AddProductModal
        visible={showAddModal}
        businessId={business?.id ?? ''}
        onClose={() => setShowAddModal(false)}
        onCreated={() => { setShowAddModal(false); loadProducts(); }}
      />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdated={() => { setSelectedProduct(null); loadProducts(); }}
        />
      )}
    </View>
  );

  async function handleRestock(product: Product, qty: number) {
    await ProductRepo.update(product.id, {
      stock_quantity: product.stock_quantity + qty,
    });
    loadProducts();
  }
}

function StatChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: color }]}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProductRow({
  product, onPress, onRestock,
}: {
  product: Product; onPress: () => void; onRestock: (qty: number) => void;
}) {
  const isOut = product.stock_quantity <= 0;
  const isLow = !isOut && product.stock_quantity <= product.low_stock_threshold;

  const stockColor = isOut ? Colors.danger : isLow ? Colors.warning : Colors.success;

  return (
    <TouchableOpacity style={[styles.productRow, Shadow.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.category && (
          <Text style={styles.productCategory}>{product.category}</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{formatKES(product.price)}</Text>
          <Text style={styles.costPrice}>Cost: {formatKES(product.cost_price)}</Text>
        </View>
      </View>

      <View style={styles.stockSection}>
        <View style={[styles.stockBadge, { backgroundColor: `${stockColor}20` }]}>
          <Text style={[styles.stockQty, { color: stockColor }]}>
            {product.stock_quantity}
          </Text>
          <Text style={[styles.stockUnit, { color: stockColor }]}>{product.unit}</Text>
        </View>
        {(isOut || isLow) && (
          <TouchableOpacity
            style={styles.restockBtn}
            onPress={() => {
              Alert.prompt(
                'Restock',
                `Add stock for ${product.name}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Add', onPress: (val) => { if (val) onRestock(parseInt(val, 10)); } },
                ],
                'plain-text',
                '',
                'number-pad'
              );
            }}
          >
            <Text style={styles.restockBtnText}>Restock</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function AddProductModal({ visible, businessId, onClose, onCreated }: {
  visible: boolean; businessId: string; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', price: '', cost_price: '', stock_quantity: '0',
    category: '', unit: 'piece', low_stock_threshold: '5',
  });
  const [isLoading, setIsLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Required', 'Product name and price are required.');
      return;
    }
    setIsLoading(true);
    try {
      await ProductRepo.create({
        business_id: businessId,
        name: form.name.trim(),
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price || '0'),
        stock_quantity: parseInt(form.stock_quantity || '0', 10),
        category: form.category.trim() || undefined,
        unit: form.unit,
        low_stock_threshold: parseInt(form.low_stock_threshold || '5', 10),
      });
      setForm({ name: '', price: '', cost_price: '', stock_quantity: '0', category: '', unit: 'piece', low_stock_threshold: '5' });
      onCreated();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Product</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <Field label="Product Name *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Coca Cola 500ml" />
          <View style={styles.row2}>
            <Field label="Selling Price (KSh) *" value={form.price} onChangeText={(v) => set('price', v)} placeholder="50" keyboardType="numeric" flex />
            <Field label="Cost Price (KSh)" value={form.cost_price} onChangeText={(v) => set('cost_price', v)} placeholder="35" keyboardType="numeric" flex />
          </View>
          <View style={styles.row2}>
            <Field label="Initial Stock" value={form.stock_quantity} onChangeText={(v) => set('stock_quantity', v)} placeholder="0" keyboardType="numeric" flex />
            <Field label="Low Stock Alert" value={form.low_stock_threshold} onChangeText={(v) => set('low_stock_threshold', v)} placeholder="5" keyboardType="numeric" flex />
          </View>
          <Field label="Category" value={form.category} onChangeText={(v) => set('category', v)} placeholder="e.g. Drinks, Food" />
          <Field label="Unit" value={form.unit} onChangeText={(v) => set('unit', v)} placeholder="piece, kg, litre..." />

          <TouchableOpacity
            style={[styles.saveBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={isLoading}
          >
            <Text style={styles.saveBtnText}>{isLoading ? 'Saving...' : 'Add Product'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ProductDetailModal({ product, onClose, onUpdated }: {
  product: Product; onClose: () => void; onUpdated: () => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [costPrice, setCostPrice] = useState(String(product.cost_price));
  const [stock, setStock] = useState(String(product.stock_quantity));

  async function handleSave() {
    await ProductRepo.update(product.id, {
      price: parseFloat(price),
      cost_price: parseFloat(costPrice),
      stock_quantity: parseInt(stock, 10),
    });
    onUpdated();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <Field label="Selling Price (KSh)" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <Field label="Cost Price (KSh)" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />
          <Field label="Stock Quantity" value={stock} onChangeText={setStock} keyboardType="numeric" />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, flex }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'numeric' | 'default'; flex?: boolean;
}) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textInverse },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  stats: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  statChip: {
    flex: 1, borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.sm,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  statCount: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  searchRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  filters: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.xs },
  filterTab: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.textInverse, fontWeight: FontWeight.semibold },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  productRow: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  productCategory: { fontSize: FontSize.xs, color: Colors.textMuted },
  priceRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginTop: 2 },
  productPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  costPrice: { fontSize: FontSize.xs, color: Colors.textMuted },
  stockSection: { alignItems: 'center', gap: 4 },
  stockBadge: { borderRadius: BorderRadius.md, padding: Spacing.xs, alignItems: 'center', minWidth: 50 },
  stockQty: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  stockUnit: { fontSize: 9, fontWeight: FontWeight.medium },
  restockBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  restockBtnText: { fontSize: 10, color: Colors.textInverse, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, flex: 1 },
  modalBody: { padding: Spacing.lg, gap: Spacing.md },
  row2: { flexDirection: 'row', gap: Spacing.md },
  field: { gap: Spacing.xs },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  fieldInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.base, color: Colors.text, backgroundColor: Colors.surface,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  saveBtnText: { color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
