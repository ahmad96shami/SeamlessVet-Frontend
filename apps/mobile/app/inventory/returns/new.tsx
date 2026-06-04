import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency, idempotencyKey, newGuidV7 } from "@vet/shared";

import { ArrowDown, Briefcase, Pill as PillIcon, Search, Warn } from "@/components/icons";
import { Button, Card, Input, Pill } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { ScreenShell, TopBar } from "@/components/layout";
import { useAuthStore } from "@/stores/authStore";
import { dialog } from "@/stores/dialogStore";
import { powerSync } from "@/sync/database";
import { useQuery } from "@/sync/hooks";
import { colors } from "@/theme";

interface CustomerWithLedger {
  id: string;
  full_name: string;
  phone_primary: string | null;
  balance: number | null;
  ledger_id: string | null;
}

interface ProductPickRow {
  id: string;
  name_ar: string;
  name_latin: string | null;
  unit_of_measure: string | null;
  selling_price: number | null;
  category: string | null;
  on_hand: number;
}

const ReturnFormSchema = z.object({
  customerId: z.string().uuid("اختر عميلًا"),
  productId: z.string().uuid("اختر منتجًا"),
  quantity: z.number({ message: "الكمية مطلوبة" }).positive("الكمية يجب أن تكون أكبر من صفر"),
  reason: z.string().optional(),
});
type ReturnForm = z.infer<typeof ReturnFormSchema>;

/**
 * Mo3.2 — medication-return flow.
 *
 * Records a single product return *from a customer back to the field doctor's car*:
 *   - appends a `return_add` `inventory_movements` row (positive `quantity_delta`,
 *     `to_location_type='field'` + the doctor's `field_inventory_id`) — the server
 *     normalises the sign and credits the field on-hand atomically.
 *   - appends a `ledger_entries` row with `entry_type='adjustment'` and a NEGATIVE
 *     `amount` (= `selling_price * qty`), reducing the customer's owed balance
 *     (SCHEMA `ledgers.balance` semantics: `+` raises debt, `-` reduces it).
 *
 * Both rows share the same `idempotency_key` so a retry replays the same logical
 * return — the server's per-table `UNIQUE (environment_id, idempotency_key)` enforces
 * at-most-once application of each.
 *
 * No dedicated `/returns` endpoint exists in the API surface (MOBILE.md Mo3) — returns
 * are *client-assembled* via `/sync/inventory_movements` + `/sync/ledger_entries`.
 * Pricing is the catalog `selling_price`; contract pricing for returns is out of scope
 * for Mo3 (Mo4 contract-aware pricing covers the issuance path, not credits).
 */
export default function NewReturnScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const doctorId = useAuthStore((s) => s.user?.userId ?? null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Customers — joined with their ledger so we get balance + ledger_id in one read.
  // PowerSync's `useQuery` re-emits when ledgers or customers update locally.
  const { data: customers = [] } = useQuery<CustomerWithLedger>(
    `SELECT c.id, c.full_name, c.phone_primary,
            l.id AS ledger_id, l.balance AS balance
       FROM customers c
       LEFT JOIN ledgers l ON l.customer_id = c.id
       ORDER BY c.full_name`,
  );

  // The doctor's field inventory (one expected per doctor, per SCHEMA). Used to fill
  // `to_location_id` on the movement.
  const { data: fieldRows = [] } = useQuery<{ id: string }>(
    doctorId
      ? `SELECT id FROM field_inventories WHERE doctor_id = ? LIMIT 1`
      : `SELECT id FROM field_inventories WHERE 0 LIMIT 1`,
    doctorId ? [doctorId] : [],
  );
  const fieldInventoryId = fieldRows[0]?.id ?? null;

  // Products that match medications, paired with current local on-hand so the picker
  // shows the doctor's car-side balance. We accept products with zero on-hand: a
  // customer may legitimately return doses the doctor handed out earlier and burned
  // through stock in between.
  const { data: products = [] } = useQuery<ProductPickRow>(
    `SELECT p.id, p.name_ar, p.name_latin, p.unit_of_measure, p.selling_price, p.category,
            COALESCE((SELECT SUM(quantity) FROM stock_items s
                        WHERE s.product_id = p.id AND s.location_type = 'field'), 0) AS on_hand
       FROM products p
       WHERE p.category = 'medication' OR p.category IS NULL
       ORDER BY p.name_ar
       LIMIT 600`,
  );

  const form = useForm<ReturnForm>({
    resolver: zodResolver(ReturnFormSchema),
    defaultValues: {
      customerId: "",
      productId: "",
      quantity: undefined,
      reason: "",
    },
  });
  const customerId = form.watch("customerId");
  const productId = form.watch("productId");
  const quantity = form.watch("quantity");

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q)
        || (c.phone_primary ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!q) return true;
      return (
        p.name_ar.toLowerCase().includes(q)
        || (p.name_latin ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const unitPrice = selectedProduct?.selling_price ?? 0;
  const projectedCredit = quantity && quantity > 0 ? Math.round(unitPrice * quantity * 100) / 100 : 0;

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!fieldInventoryId) {
      void dialog.alert(
        t("mobile.returns.title", { defaultValue: "تسجيل إرجاع" }),
        t("mobile.returns.noFieldInventory", {
          defaultValue: "لم يتم إعداد مخزون ميداني بعد. اطلب من المسؤول تحميل أول دفعة.",
        }),
      );
      return;
    }
    if (!selectedCustomer?.ledger_id) {
      void dialog.alert(
        t("mobile.returns.title", { defaultValue: "تسجيل إرجاع" }),
        t("mobile.returns.noLedger", {
          defaultValue:
            "حساب العميل لم يصل الجهاز بعد. أعد المزامنة وحاول مرة أخرى بعد لحظة.",
        }),
      );
      return;
    }
    if (!selectedProduct) return;

    const sharedKey = idempotencyKey();
    const movementId = newGuidV7();
    const ledgerEntryId = newGuidV7();
    const creditAmount = -Math.round(unitPrice * values.quantity * 100) / 100;
    const currentBalance = selectedCustomer.balance ?? 0;
    const projectedBalanceAfter = Math.round((currentBalance + creditAmount) * 100) / 100;
    const now = new Date().toISOString();
    const description = t("mobile.returns.ledgerDescription", {
      defaultValue: "إرجاع {{product}} × {{qty}}",
      product: selectedProduct.name_ar,
      qty: values.quantity,
    });

    setSubmitting(true);
    try {
      // One local SQLite transaction → one PowerSync CRUD txn → one /sync upload group.
      // If the device dies mid-write neither row hits the queue; on retry the shared
      // idempotency key dedupes both inserts server-side (UNIQUE per-table).
      await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO inventory_movements
            (id, product_id, movement_type, to_location_type, to_location_id,
             quantity_delta, reason, idempotency_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            movementId,
            values.productId,
            "return_add",
            "field",
            fieldInventoryId,
            values.quantity,
            values.reason?.trim() || null,
            sharedKey,
            now,
          ],
        );
        await tx.execute(
          `INSERT INTO ledger_entries
            (id, ledger_id, entry_type, amount, balance_after, description,
             idempotency_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ledgerEntryId,
            selectedCustomer.ledger_id,
            "adjustment",
            creditAmount,
            projectedBalanceAfter,
            description,
            sharedKey,
            now,
          ],
        );
      });
      router.back();
    } catch (err) {
      void dialog.alert(
        t("mobile.returns.title", { defaultValue: "تسجيل إرجاع" }),
        (err as Error).message ?? "Save failed",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <ScreenShell
      header={
        <TopBar
          title={t("mobile.returns.title", { defaultValue: "تسجيل إرجاع" })}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-10">
            {/* Customer picker. Once a customer is selected, the search collapses to a
                pinned card with a "change" affordance so the rest of the form is reachable
                without a long scroll on a phone. */}
            <View className="gap-2">
              <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                {t("customers.title")}
              </Text>
              {selectedCustomer ? (
                <Card className="flex-row items-center gap-3 p-3">
                  <View className="bg-teal-50 h-11 w-11 items-center justify-center rounded-card">
                    <Briefcase size={20} color={colors.teal[600]} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                      {selectedCustomer.full_name}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {selectedCustomer.balance != null ? (
                        <Pill
                          tone={selectedCustomer.balance > 0 ? "amber" : "neutral"}
                          label={`${t("customers.colBalance")} ${formatCurrency(selectedCustomer.balance, i18n.resolvedLanguage)}`}
                        />
                      ) : null}
                    </View>
                  </View>
                  <Pressable onPress={() => form.setValue("customerId", "")}>
                    <Text className="text-navy-700 text-[12px] font-tajawal-bold">
                      {t("actions.change", { defaultValue: "تغيير" })}
                    </Text>
                  </Pressable>
                </Card>
              ) : (
                <>
                  <Input
                    placeholder={t("customers.searchPlaceholder")}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    leading={<Search size={18} color={colors.ink[400]} />}
                    autoCapitalize="none"
                  />
                  <FlatList
                    scrollEnabled={false}
                    data={filteredCustomers.slice(0, 30)}
                    keyExtractor={(c) => c.id}
                    ItemSeparatorComponent={() => <View className="h-2" />}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => form.setValue("customerId", item.id)}>
                        <Card className="flex-row items-center gap-3 p-3">
                          <View className="flex-1">
                            <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                              {item.full_name}
                            </Text>
                            <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={1}>
                              {item.phone_primary ?? "—"}
                            </Text>
                          </View>
                          {item.balance != null && item.balance > 0 ? (
                            <Pill
                              tone="amber"
                              label={formatCurrency(item.balance, i18n.resolvedLanguage)}
                            />
                          ) : null}
                        </Card>
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <Card flat className="p-3">
                        <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                          {t("customers.empty", { defaultValue: "لا يوجد عملاء" })}
                        </Text>
                      </Card>
                    }
                  />
                </>
              )}
            </View>

            {/* Product picker — same collapse-on-pick pattern. */}
            <View className="gap-2">
              <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                {t("inventory.col.product")}
              </Text>
              {selectedProduct ? (
                <Card className="flex-row items-center gap-3 p-3">
                  <View className="bg-teal-50 h-11 w-11 items-center justify-center rounded-card">
                    <PillIcon size={20} color={colors.teal[600]} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                      {selectedProduct.name_ar}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {selectedProduct.unit_of_measure ? (
                        <Pill tone="neutral" label={selectedProduct.unit_of_measure} />
                      ) : null}
                      <Pill
                        tone="neutral"
                        label={`${t("mobile.returns.onHand", { defaultValue: "بالسيارة" })} ${selectedProduct.on_hand}`}
                      />
                      {selectedProduct.selling_price != null ? (
                        <Pill
                          tone="teal"
                          label={formatCurrency(selectedProduct.selling_price, i18n.resolvedLanguage)}
                        />
                      ) : null}
                    </View>
                  </View>
                  <Pressable onPress={() => form.setValue("productId", "")}>
                    <Text className="text-navy-700 text-[12px] font-tajawal-bold">
                      {t("actions.change", { defaultValue: "تغيير" })}
                    </Text>
                  </Pressable>
                </Card>
              ) : (
                <>
                  <Input
                    placeholder={t("inventory.searchPlaceholder")}
                    value={productSearch}
                    onChangeText={setProductSearch}
                    leading={<Search size={18} color={colors.ink[400]} />}
                    autoCapitalize="none"
                  />
                  <FlatList
                    scrollEnabled={false}
                    data={filteredProducts.slice(0, 40)}
                    keyExtractor={(p) => p.id}
                    ItemSeparatorComponent={() => <View className="h-2" />}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => form.setValue("productId", item.id)}>
                        <Card className="flex-row items-center gap-3 p-3">
                          <View className="flex-1 gap-1">
                            <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                              {item.name_ar}
                            </Text>
                            <View className="flex-row flex-wrap gap-1.5">
                              {item.unit_of_measure ? (
                                <Pill tone="neutral" label={item.unit_of_measure} />
                              ) : null}
                              {item.selling_price != null ? (
                                <Pill
                                  tone="teal"
                                  label={formatCurrency(item.selling_price, i18n.resolvedLanguage)}
                                />
                              ) : null}
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <Card flat className="p-3">
                        <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                          {t("inventory.noProducts")}
                        </Text>
                      </Card>
                    }
                  />
                </>
              )}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="quantity"
                  label={t("inventory.col.quantity")}
                  keyboardType="decimal-pad"
                  transform={NumberFieldTransform}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <Input
                      label={t("inventory.col.reason")}
                      value={(field.value as string | undefined) ?? ""}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </View>
            </View>

            {/* Projected credit preview — gives the doctor a "before tapping save" signal that
                the customer's debt will move the right direction by the right amount. The
                server is authoritative on the actual balance_after at sync time. */}
            {selectedProduct && quantity && quantity > 0 ? (
              <Card flat className="bg-emerald-soft border-emerald-soft p-3">
                <View className="flex-row items-center gap-2">
                  <ArrowDown size={16} color={colors.emerald.ink} />
                  <Text className="text-emerald-ink text-[13px] font-tajawal-bold">
                    {t("mobile.returns.creditPreview", {
                      defaultValue: "سيُخفّض حساب العميل بمقدار {{amount}}",
                      amount: formatCurrency(projectedCredit, i18n.resolvedLanguage),
                    })}
                  </Text>
                </View>
              </Card>
            ) : null}

            {!fieldInventoryId ? (
              <Card flat className="bg-rose-soft border-rose-soft p-3">
                <View className="flex-row items-center gap-2">
                  <Warn size={16} color={colors.rose.ink} />
                  <Text className="text-rose-ink text-[12px] font-tajawal-bold">
                    {t("mobile.returns.noFieldInventory", {
                      defaultValue: "لم يتم إعداد مخزون ميداني بعد. اطلب من المسؤول تحميل أول دفعة.",
                    })}
                  </Text>
                </View>
              </Card>
            ) : null}

            <View className="mt-2">
              <Button
                label={t("actions.save", { defaultValue: "حفظ" })}
                onPress={handleSubmit}
                loading={submitting}
                disabled={!fieldInventoryId}
                block
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
