import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePersistentToast } from "@/components/ui/PersistentToast";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
const STATUS_COLORS = {
  pending: "bg-yellow-900/50 text-yellow-400",
  processing: "bg-blue-900/50 text-blue-400",
  shipped: "bg-purple-900/50 text-purple-400",
  delivered: "bg-green-900/50 text-green-400",
  cancelled: "bg-red-900/50 text-red-400",
  refunded: "bg-gray-700 text-gray-400",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderTab, setOrderTab] = useState("details");
  const [editingFeeOrderId, setEditingFeeOrderId] = useState(null);
  const [shippingFeeEditValue, setShippingFeeEditValue] = useState(null);
  const [savingFee, setSavingFee] = useState(false);
  const [searchParams] = useSearchParams();
  const notify = usePersistentToast();

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearch(urlSearch);
    apiClient.entities.Order.list("-created_date", 200).then(o => { setOrders(o); setLoading(false); });
  }, [searchParams]);

  const getOrderLocalDate = (value) => {
    const date = new Date(value || "");
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number?.includes(search) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const created = new Date(o.created_date || o.created_at || "");
    const createdDateKey = getOrderLocalDate(o.created_date || o.created_at);
    const matchDate = !dateFilter || createdDateKey === dateFilter;
    const matchFrom = !dateFrom || (createdDateKey && createdDateKey >= dateFrom);
    const matchTo = !dateTo || (createdDateKey && createdDateKey <= dateTo);
    return matchSearch && matchStatus && matchDate && matchFrom && matchTo;
  });

  const updateStatus = async (orderId, status) => {
    const updated = await apiClient.entities.Order.update(orderId, { status });
    setOrders(orders.map(o => o.id === orderId ? updated : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    notify(`Order ${status}`, "success");
  };

  const saveShippingFee = async (orderId, feeValue) => {
    setSavingFee(true);
    const parsed = Number(feeValue) || 0;
    const order = orders.find(o => o.id === orderId) || selectedOrder;
    const newTotal = (order.subtotal || 0) - (order.discount_amount || 0) + parsed;
    const updated = await apiClient.entities.Order.update(orderId, { shipping_fee: parsed, total: newTotal });
    setOrders(orders.map(o => o.id === orderId ? updated : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    setSavingFee(false);
    setEditingFeeOrderId(null);
    setShippingFeeEditValue(null);
    notify('Shipping fee updated', 'success');
  };

  const formatOrderDateOnly = (value) => {
    const date = new Date(value || "");
    if (isNaN(date.getTime())) return value || "-";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const formatOrderDateTime = (value) => {
    const date = new Date(value || "");
    if (isNaN(date.getTime())) return value || "-";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const printReceipt = (order) => {
    if (!order) return;
    const receiptHtml = `
      <html>
        <head>
          <title>Receipt ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .header { margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 24px; }
            .section { margin-bottom: 18px; }
            .section h2 { margin-bottom: 8px; font-size: 16px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background: #f4f4f4; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Receipt</h1>
            <p>Order #: ${order.order_number}</p>
            <p>Date: ${formatOrderDateTime(order.created_date || order.created_at)}</p>
          </div>
          <div class="section">
            <h2>Customer</h2>
            <div class="row"><span>Name</span><span>${order.customer_name || '-'}</span></div>
            <div class="row"><span>Phone</span><span>${order.customer_phone || '-'}</span></div>
            <div class="row"><span>Email</span><span>${order.customer_email || '-'}</span></div>
          </div>
          <div class="section">
            <h2>Delivery</h2>
            <div class="row"><span>Type</span><span>${order.delivery_address?.address_label || '-'}</span></div>
            <div class="row"><span>Option</span><span>${order.delivery_option || '-'}</span></div>
            <div class="row"><span>Time</span><span>${order.delivery_address?.office_time || '-'}</span></div>
            <div class="row"><span>Address</span><span>${order.delivery_address?.street || ''} ${order.delivery_address?.landmark ? '| ' + order.delivery_address?.landmark : ''} ${order.delivery_address?.area ? '| ' + order.delivery_address?.area : ''} ${order.delivery_address?.district ? '| ' + order.delivery_address?.district : ''} ${order.delivery_address?.division ? '| ' + order.delivery_address?.division : ''} ${order.delivery_address?.postal_code ? '| ' + order.delivery_address?.postal_code : ''}</span></div>
          </div>
          <div class="section">
            <h2>Items</h2>
            <table class="table">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${order.items?.map(item => `
                  <tr>
                    <td>${item.product_name || '-'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>৳${(item.price || 0).toLocaleString()}</td>
                    <td>৳${((item.price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
          </div>
          <div class="section">
            <div class="row"><span>Subtotal</span><span>৳${(order.subtotal || 0).toLocaleString()}</span></div>
            <div class="row"><span>Discount</span><span>৳${(order.discount_amount || 0).toLocaleString()}</span></div>
            <div class="row"><span>Shipping</span><span>৳${(order.shipping_fee || 0).toLocaleString()}</span></div>
            <div class="row total"><span>Total</span><span>৳${(order.total || 0).toLocaleString()}</span></div>
            <div class="row"><span>Payment</span><span>${order.payment_method || '-'}</span></div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-white font-poppins font-bold text-xl">Orders</h2>
          <p className="text-gray-400 text-sm">{filtered.length} of {orders.length} orders shown</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders, customers..." className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", ...STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} placeholder="Filter by date" className="bg-gray-800 border-gray-700 text-white" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From date" className="bg-gray-800 border-gray-700 text-white" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To date" className="bg-gray-800 border-gray-700 text-white" />
          </div>
          {(dateFilter || dateFrom || dateTo) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>Filters active</span>
              <button type="button" onClick={() => { setDateFilter(""); setDateFrom(""); setDateTo(""); }} className="text-primary hover:underline">Clear date filters</button>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-500">No orders found</td></tr>
                ) : filtered.map(order => (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-primary font-mono font-semibold text-xs">
                      <div>{order.order_number}</div>
                      <div className="text-gray-500 text-[11px] mt-1">{formatOrderDateTime(order.created_date || order.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{order.customer_name}</div>
                      <div className="text-gray-500 text-xs">{order.customer_phone}</div>
                      {order.customer_email && <div className="text-gray-500 text-xs">{order.customer_email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 text-white font-semibold">৳{order.total?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 uppercase text-xs">{order.payment_method}</td>
                    <td className="px-4 py-3">
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[order.status]}`}>
                        {STATUSES.map(s => <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatOrderDateOnly(order.created_date || order.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-800 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail */}
      <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setOrderTab("details"); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle className="text-white font-poppins">Order {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {['details', 'receipt'].map(tab => (
                  <button key={tab} onClick={() => setOrderTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${orderTab === tab ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {tab === 'details' ? 'Details' : 'Receipt'}
                  </button>
                ))}
              </div>

              {orderTab === 'details' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Customer</p><p className="font-semibold">{selectedOrder.customer_name}</p><p className="text-gray-400">{selectedOrder.customer_phone}</p>{selectedOrder.customer_email && <p className="text-gray-400 text-xs">{selectedOrder.customer_email}</p>}</div>
                    <div className="bg-gray-800 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Total</p><p className="font-poppins font-bold text-xl text-primary">৳{selectedOrder.total?.toLocaleString()}</p><p className="text-gray-400 uppercase text-xs">{selectedOrder.payment_method}</p></div>
                    <div className="bg-gray-800 rounded-xl p-3 col-span-2"><p className="text-gray-400 text-xs mb-1">Delivery Address</p>
                      <p>{selectedOrder.delivery_address?.street || '-'}</p>
                      <p>{selectedOrder.delivery_address?.landmark || ''}</p>
                      <p>{selectedOrder.delivery_address?.area || ''}{selectedOrder.delivery_address?.district ? `, ${selectedOrder.delivery_address?.district}` : ''}{selectedOrder.delivery_address?.division ? `, ${selectedOrder.delivery_address?.division}` : ''}{selectedOrder.delivery_address?.postal_code ? `, ${selectedOrder.delivery_address?.postal_code}` : ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Delivery Type</p><p className="font-medium capitalize">{selectedOrder.delivery_address?.address_label || 'home'}</p></div>
                    <div className="bg-gray-800 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Delivery Option</p><p className="font-medium capitalize">{selectedOrder.delivery_option || 'default'}</p></div>
                    {selectedOrder.delivery_address?.office_time && (
                      <div className="bg-gray-800 rounded-xl p-3 col-span-2"><p className="text-gray-400 text-xs mb-1">Office Delivery Time</p><p className="font-medium">{selectedOrder.delivery_address?.office_time}</p></div>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Order Items</p>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl p-2">
                          {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 object-cover rounded" />}
                          <div className="flex-1">
                            <Link to={`/product/${item.product_id}`} className="font-medium line-clamp-1 hover:text-primary transition-colors block">{item.product_name}</Link>
                            <p className="text-gray-400 text-xs">Qty: {item.quantity} × ৳{item.price?.toLocaleString()}</p>
                          </div>
                          <span className="font-semibold">৳{(item.price * item.quantity)?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 space-y-1">
                    {selectedOrder.discount_amount > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-৳{selectedOrder.discount_amount?.toLocaleString()}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-400">Shipping</span><span>৳{selectedOrder.shipping_fee || 0}</span></div>
                    <div className="flex justify-between font-bold text-base border-t border-gray-700 pt-1"><span>Total</span><span className="text-primary">৳{selectedOrder.total?.toLocaleString()}</span></div>
                    {selectedOrder.payment_method !== "cod" && (
                      <div className="flex justify-between text-sm pt-2"><span>Payment</span><span className="capitalize">{selectedOrder.payment_method}</span></div>
                    )}
                    {selectedOrder.transaction_id && (
                      <div className="flex justify-between text-sm pt-2"><span>Transaction ID</span><span className="font-mono text-xs bg-gray-900 px-2 py-1 rounded">{selectedOrder.transaction_id}</span></div>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${selectedOrder.status === s ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Receipt View</p>
                      <p className="font-semibold">Printable order summary</p>
                    </div>
                    <button onClick={() => printReceipt(selectedOrder)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm">Print Receipt</button>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-gray-400 text-xs uppercase">Order #</p><p className="font-semibold">{selectedOrder.order_number}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase">Date</p><p>{formatOrderDateOnly(selectedOrder.created_date || selectedOrder.created_at)}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase">Customer</p><p>{selectedOrder.customer_name}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase">Phone</p><p>{selectedOrder.customer_phone}</p></div>
                    </div>

                    <div className="rounded-2xl border border-gray-700 p-3 bg-gray-900">
                      <p className="text-gray-400 text-xs uppercase mb-2">Delivery Details</p>
                      <p className="text-sm"><span className="font-medium">Type:</span> {selectedOrder.delivery_address?.address_label || 'home'}</p>
                      <p className="text-sm"><span className="font-medium">Option:</span> {selectedOrder.delivery_option || 'default'}</p>
                      {selectedOrder.delivery_address?.office_time && <p className="text-sm"><span className="font-medium">Office Time:</span> {selectedOrder.delivery_address?.office_time}</p>}
                      <p className="text-sm mt-2"><span className="font-medium">Address:</span> {selectedOrder.delivery_address?.street || '-'}{selectedOrder.delivery_address?.landmark ? `, ${selectedOrder.delivery_address?.landmark}` : ''}{selectedOrder.delivery_address?.area ? `, ${selectedOrder.delivery_address?.area}` : ''}{selectedOrder.delivery_address?.district ? `, ${selectedOrder.delivery_address?.district}` : ''}{selectedOrder.delivery_address?.division ? `, ${selectedOrder.delivery_address?.division}` : ''}{selectedOrder.delivery_address?.postal_code ? `, ${selectedOrder.delivery_address?.postal_code}` : ''}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs uppercase">Items</p>
                      <div className="space-y-2">
                        {selectedOrder.items?.map((item, i) => (
                          <div key={i} className="grid grid-cols-6 gap-2 text-sm items-center bg-gray-900 rounded-xl p-2">
                            <div className="col-span-3 font-medium">{item.product_name}</div>
                            <div className="col-span-1 text-right">x{item.quantity}</div>
                            <div className="col-span-1 text-right">৳{item.price?.toLocaleString()}</div>
                            <div className="col-span-1 text-right font-semibold">৳{(item.price * item.quantity)?.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700 p-3 bg-gray-900">
                      <div className="flex justify-between text-sm"><span>Subtotal</span><span>৳{selectedOrder.subtotal?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between text-sm"><span>Discount</span><span>৳{selectedOrder.discount_amount?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between text-sm items-center">
                        <span>Shipping</span>
                        <div className="flex items-center gap-2">
                          {editingFeeOrderId === selectedOrder.id ? (
                            <>
                              <input type="number" value={shippingFeeEditValue ?? selectedOrder.shipping_fee ?? 0} onChange={(e) => setShippingFeeEditValue(e.target.value)} className="w-28 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white text-sm" />
                              <button onClick={() => saveShippingFee(selectedOrder.id, shippingFeeEditValue)} disabled={savingFee} className="px-3 py-1 rounded bg-primary text-white text-sm">{savingFee ? 'Saving...' : 'Save'}</button>
                              <button onClick={() => { setEditingFeeOrderId(null); setShippingFeeEditValue(null); }} className="px-2 py-1 rounded border border-gray-700 text-xs text-gray-300">Cancel</button>
                            </>
                          ) : (
                            <>
                              <span>৳{selectedOrder.shipping_fee || 0}</span>
                              <button onClick={() => { setEditingFeeOrderId(selectedOrder.id); setShippingFeeEditValue(selectedOrder.shipping_fee || 0); }} className="ml-2 px-2 py-1 rounded border border-gray-700 text-xs text-gray-300">Edit</button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-700"><span>Total</span><span>৳{selectedOrder.total?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between text-sm pt-2"><span>Payment</span><span className="capitalize">{selectedOrder.payment_method}</span></div>
                      {selectedOrder.transaction_id && (
                        <div className="flex justify-between text-sm pt-2"><span>Transaction ID</span><span className="font-mono text-xs bg-gray-900 px-2 py-1 rounded">{selectedOrder.transaction_id}</span></div>
                      )}
                      {selectedOrder.payment_method !== "cod" && selectedOrder.status !== "pending" && (
                        <div className="mt-2 p-2 bg-green-900/30 border border-green-800 rounded text-xs text-green-400">✓ Payment verified and confirmed</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

