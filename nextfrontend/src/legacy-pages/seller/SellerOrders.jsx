import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import SellerLayout from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Loader2, Search, ShoppingBag } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-200 text-gray-700",
};

function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, options);
}

function getDeliveryAddress(address = {}) {
  return [
    address.street,
    address.landmark,
    address.area,
    address.district,
    address.division,
    address.postal_code,
  ].filter(Boolean).join(", ") || "—";
}

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderTab, setOrderTab] = useState("details");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingFee, setEditingFee] = useState(false);
  const [shippingFeeDraft, setShippingFeeDraft] = useState("");
  const notify = usePersistentToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    apiClient.auth.me().then(async (user) => {
      const sellers = await apiClient.entities.Seller.filter({ user_id: user.id });
      const seller = sellers.find((entry) => entry.status === "approved");
      if (!seller) {
        navigate("/seller/dashboard");
        return;
      }
      const sellerOrders = await apiClient.entities.Order.list("-created_date", 200);
      const ownOrders = sellerOrders.filter((order) =>
        String(order.customer_email || "").toLowerCase() !== String(seller.email || "").toLowerCase()
      );
      if (active) {
        setOrders(ownOrders);
        setLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load seller orders:", error);
      if (active) {
        notify(error.message || "Could not load orders", "error");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [navigate, notify]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !query ||
        String(order.order_number || "").toLowerCase().includes(query) ||
        String(order.customer_name || "").toLowerCase().includes(query) ||
        String(order.customer_email || "").toLowerCase().includes(query) ||
        String(order.customer_phone || "").toLowerCase().includes(query);
      return matchesSearch && (statusFilter === "all" || order.status === statusFilter);
    });
  }, [orders, search, statusFilter]);

  const replaceOrder = (updated) => {
    setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((current) => current?.id === updated.id ? updated : current);
  };

  const updateStatus = async (order, status) => {
    setSavingOrderId(order.id);
    try {
      const updated = await apiClient.entities.Order.update(order.id, { status });
      replaceOrder(updated);
      notify(`Order ${status}`, "success");
    } catch (error) {
      notify(error.message || "Could not update order status", "error");
    } finally {
      setSavingOrderId(null);
    }
  };

  const saveShippingFee = async () => {
    if (!selectedOrder || selectedOrder.fulfillment_method === "pickup") return;
    const fee = Number(shippingFeeDraft);
    if (!Number.isFinite(fee) || fee < 0) {
      notify("Enter a valid delivery fee", "error");
      return;
    }
    setSavingOrderId(selectedOrder.id);
    try {
      const total = Number(selectedOrder.subtotal || 0) - Number(selectedOrder.discount_amount || 0) + fee;
      const updated = await apiClient.entities.Order.update(selectedOrder.id, { shipping_fee: fee, total });
      replaceOrder(updated);
      setEditingFee(false);
      notify("Delivery fee updated", "success");
    } catch (error) {
      notify(error.message || "Could not update delivery fee", "error");
    } finally {
      setSavingOrderId(null);
    }
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setOrderTab("details");
    setEditingFee(false);
    setShippingFeeDraft(String(order.shipping_fee || 0));
  };

  const printReceipt = (order) => {
    const popup = window.open("", "_blank");
    if (!popup) {
      notify("Allow pop-ups to print the receipt", "error");
      return;
    }
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
    const items = (order.items || []).map((item) => (
      `<tr><td>${escapeHtml(item.product_name || "Product")}</td><td>${Number(item.quantity || 0)}</td><td>৳${Number(item.price || 0).toLocaleString()}</td><td>৳${(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</td></tr>`
    )).join("");
    const fulfillment = order.fulfillment_method === "pickup"
      ? (order.pickup_locations || []).map((location) => `${location.store_name || "Store"}: ${location.address || "Contact store"}`).join("<br>") || "Contact the store for pickup details."
      : getDeliveryAddress(order.delivery_address);
    popup.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(order.order_number)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 20px}p{margin:6px 0}.row{display:flex;justify-content:space-between;margin:8px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:8px;border:1px solid #ddd;text-align:left}.total{font-weight:bold;border-top:2px solid #222;padding-top:10px}</style></head><body><h1>Order Receipt</h1><p>Order: ${escapeHtml(order.order_number)}</p><p>Date: ${escapeHtml(formatDate(order.created_date))}</p><p>Customer: ${escapeHtml(order.customer_name || "Customer")}</p><p>Phone: ${escapeHtml(order.customer_phone || "—")}</p><p>${order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"}: ${fulfillment}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><div class="row"><span>Subtotal</span><span>৳${Number(order.subtotal || 0).toLocaleString()}</span></div><div class="row"><span>Discount</span><span>৳${Number(order.discount_amount || 0).toLocaleString()}</span></div><div class="row"><span>${order.fulfillment_method === "pickup" ? "Pickup fee" : "Delivery fee"}</span><span>${order.fulfillment_method === "pickup" ? "Free" : `৳${Number(order.shipping_fee || 0).toLocaleString()}`}</span></div><div class="row total"><span>Total</span><span>৳${Number(order.total || 0).toLocaleString()}</span></div></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <SellerLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h2 className="flex items-center gap-2 font-poppins text-xl font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" /> Orders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage orders for your products. Orders shared with other sellers remain under admin management. Updates are logged for admin review.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer, phone, or email..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter orders by status"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-12 text-center text-sm text-muted-foreground">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {["Order", "Customer", "Items", "Total", "Fulfillment", "Payment", "Status", "Actions"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-primary">{order.order_number}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(order.created_date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.customer_name || "Customer"}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone || order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 font-semibold">৳{Number(order.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{order.fulfillment_method === "pickup" ? "Store pickup" : "Delivery"}</td>
                    <td className="px-4 py-3 uppercase text-xs">{order.payment_method || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status || "pending"}
                        onChange={(event) => updateStatus(order, event.target.value)}
                        disabled={savingOrderId === order.id}
                        aria-label={`Update status for ${order.order_number}`}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-semibold capitalize disabled:opacity-60 ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => openOrder(order)} aria-label={`View ${order.order_number}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setOrderTab("details");
          setEditingFee(false);
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {["details", "receipt"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setOrderTab(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${orderTab === tab ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {orderTab === "details" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <section className="rounded-xl bg-muted/50 p-3">
                      <p className="mb-1 text-xs text-muted-foreground">Customer</p>
                      <p className="font-semibold">{selectedOrder.customer_name || "Customer"}</p>
                      <p>{selectedOrder.customer_phone || "—"}</p>
                      {selectedOrder.customer_email && <p className="break-all text-xs text-muted-foreground">{selectedOrder.customer_email}</p>}
                    </section>
                    <section className="rounded-xl bg-muted/50 p-3">
                      <p className="mb-1 text-xs text-muted-foreground">Order status</p>
                      <select
                        value={selectedOrder.status || "pending"}
                        onChange={(event) => updateStatus(selectedOrder, event.target.value)}
                        disabled={savingOrderId === selectedOrder.id}
                        className="rounded-md border border-input bg-background px-2 py-1 capitalize"
                      >
                        {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </section>
                    <section className="rounded-xl bg-muted/50 p-3 sm:col-span-2">
                      <p className="mb-1 text-xs text-muted-foreground">
                        {selectedOrder.fulfillment_method === "pickup" ? "Pickup location" : "Delivery address"}
                      </p>
                      {selectedOrder.fulfillment_method === "pickup" ? (
                        selectedOrder.pickup_locations?.length ? selectedOrder.pickup_locations.map((location) => (
                          <div key={location.id} className="mb-2 last:mb-0">
                            <p className="font-semibold">{location.store_name || "Store"}</p>
                            <p>{location.address || "Contact store for pickup details"}</p>
                          </div>
                        )) : <p>Contact the store for pickup details.</p>
                      ) : (
                        <>
                          <p>{getDeliveryAddress(selectedOrder.delivery_address)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedOrder.delivery_address?.address_label || "Home"} · {selectedOrder.delivery_option || "Standard"}
                            {selectedOrder.delivery_address?.office_time ? ` · ${selectedOrder.delivery_address.office_time}` : ""}
                          </p>
                        </>
                      )}
                    </section>
                  </div>

                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Order items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={`${item.product_id}-${index}`} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                          {item.product_image && <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover" />}
                          <div className="min-w-0 flex-1">
                            <Link to={`/product/${item.product_id}`} className="line-clamp-1 font-medium hover:text-primary">
                              {item.product_name || "Product"}
                            </Link>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ৳{Number(item.price || 0).toLocaleString()}</p>
                          </div>
                          <span className="shrink-0 font-semibold">৳{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex justify-between"><span>Subtotal</span><span>৳{Number(selectedOrder.subtotal || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>৳{Number(selectedOrder.discount_amount || 0).toLocaleString()}</span></div>
                    <div className="flex items-center justify-between gap-2">
                      <span>{selectedOrder.fulfillment_method === "pickup" ? "Pickup fee" : "Delivery fee"}</span>
                      {selectedOrder.fulfillment_method === "pickup" ? (
                        <span className="text-green-700">Free</span>
                      ) : editingFee ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={shippingFeeDraft}
                            onChange={(event) => setShippingFeeDraft(event.target.value)}
                            className="h-8 w-28"
                            aria-label="Delivery fee"
                          />
                          <Button type="button" size="sm" onClick={saveShippingFee} disabled={savingOrderId === selectedOrder.id}>
                            {savingOrderId === selectedOrder.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingFee(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          ৳{Number(selectedOrder.shipping_fee || 0).toLocaleString()}
                          <Button type="button" size="sm" variant="outline" onClick={() => {
                            setShippingFeeDraft(String(selectedOrder.shipping_fee || 0));
                            setEditingFee(true);
                          }}>
                            Edit
                          </Button>
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                      <span>Total</span><span>৳{Number(selectedOrder.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1"><span>Payment</span><span className="uppercase">{selectedOrder.payment_method || "—"}</span></div>
                    {selectedOrder.transaction_id && (
                      <div className="flex justify-between gap-3"><span>Transaction ID</span><span className="break-all font-mono text-xs">{selectedOrder.transaction_id}</span></div>
                    )}
                  </section>

                </>
              ) : (
                <section className="space-y-4 rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Order receipt</h3>
                    <Button type="button" size="sm" onClick={() => printReceipt(selectedOrder)}>Print receipt</Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Order:</span> {selectedOrder.order_number}</p>
                    <p><span className="text-muted-foreground">Date:</span> {formatDate(selectedOrder.created_date)}</p>
                    <p><span className="text-muted-foreground">Customer:</span> {selectedOrder.customer_name || "Customer"}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedOrder.customer_phone || "—"}</p>
                  </div>
                  <div className="space-y-1 border-y border-border py-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={`${item.product_id}-${index}`} className="flex justify-between gap-3">
                        <span>{item.product_name || "Product"} × {item.quantity}</span>
                        <span>৳{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>৳{Number(selectedOrder.total || 0).toLocaleString()}</span></div>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
