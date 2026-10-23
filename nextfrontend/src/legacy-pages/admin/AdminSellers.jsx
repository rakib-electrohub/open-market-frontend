import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Loader2, Users, Store } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { SELLER_DASHBOARD_SECTIONS, getSellerDashboardPermissions } from "@/utils/sellerPermissions";

const STATUS_STYLE = {
  pending: "bg-yellow-900/50 text-yellow-400",
  approved: "bg-green-900/50 text-green-400",
  rejected: "bg-red-900/50 text-red-400",
  suspended: "bg-gray-700 text-gray-400",
};

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pickupAddressDrafts, setPickupAddressDrafts] = useState({});
  const [savingPickupAddressId, setSavingPickupAddressId] = useState(null);
  const [permissionDrafts, setPermissionDrafts] = useState({});
  const [savingPermissionsId, setSavingPermissionsId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    apiClient.entities.Seller.list("-created_date").then((sellerList) => {
      setSellers(sellerList);
      setPickupAddressDrafts(Object.fromEntries(sellerList.map((seller) => [seller.id, seller.address || ""])));
      setPermissionDrafts(Object.fromEntries(sellerList.map((seller) => [seller.id, getSellerDashboardPermissions(seller)])));
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to load sellers:", error);
      toast({ title: "Could not load sellers", variant: "destructive" });
      setLoading(false);
    });
  }, [toast]);

  const updateStatus = async (id, status) => {
    const updated = await apiClient.entities.Seller.update(id, { status });
    setSellers(sellers.map(s => s.id === id ? updated : s));
    toast({ title: `Seller ${status}` });
  };

  const savePickupAddress = async (seller) => {
    setSavingPickupAddressId(seller.id);
    try {
      const updated = await apiClient.entities.Seller.update(seller.id, {
        address: (pickupAddressDrafts[seller.id] || "").trim(),
      });
      setSellers((current) => current.map((entry) => entry.id === seller.id ? updated : entry));
      toast({ title: "Store pickup address saved" });
    } catch (error) {
      toast({ title: error.message || "Could not save store address", variant: "destructive" });
    } finally {
      setSavingPickupAddressId(null);
    }
  };

  const saveDashboardPermissions = async (seller) => {
    setSavingPermissionsId(seller.id);
    try {
      const updated = await apiClient.entities.Seller.update(seller.id, {
        dashboard_permissions: permissionDrafts[seller.id] || [],
      });
      setSellers((current) => current.map((entry) => entry.id === seller.id ? updated : entry));
      toast({ title: "Seller dashboard access saved" });
    } catch (error) {
      toast({ title: error.message || "Could not save dashboard access", variant: "destructive" });
    } finally {
      setSavingPermissionsId(null);
    }
  };

  const filtered = sellers.filter(s => {
    const matchSearch = !search || s.store_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const pending = sellers.filter(s => s.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Sellers</h2>
            <p className="text-gray-400 text-sm">{sellers.length} total • {pending > 0 ? <span className="text-yellow-400">{pending} pending approval</span> : "All reviewed"}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sellers..." className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected", "suspended"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-3 flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : filtered.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-500">No sellers found</div>
            : filtered.map(seller => (
              <div key={seller.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                    {seller.logo ? <img src={seller.logo} alt="" className="w-full h-full object-cover" /> : <Store className="w-6 h-6 m-3 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold line-clamp-1">{seller.store_name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[seller.status]}`}>{seller.status}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{seller.email}</p>
                    {seller.phone && <p className="text-gray-500 text-xs">{seller.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-800 rounded-xl p-2.5 text-center"><div className="text-white font-poppins font-bold">{seller.total_products || 0}</div><div className="text-gray-500 text-xs">Products</div></div>
                  <div className="bg-gray-800 rounded-xl p-2.5 text-center"><div className="text-primary font-poppins font-bold">৳{(seller.total_sales || 0).toLocaleString()}</div><div className="text-gray-500 text-xs">Sales</div></div>
                </div>

                {seller.store_description && <p className="text-gray-500 text-xs mb-4 line-clamp-2">{seller.store_description}</p>}

                <div className="mb-4">
                  <label htmlFor={`pickup-address-${seller.id}`} className="mb-1 block text-xs font-medium text-gray-300">Store pickup address</label>
                  <Input
                    id={`pickup-address-${seller.id}`}
                    value={pickupAddressDrafts[seller.id] ?? seller.address ?? ""}
                    onChange={(event) => setPickupAddressDrafts((current) => ({ ...current, [seller.id]: event.target.value }))}
                    placeholder="Add the address customers should visit"
                    className="bg-gray-800 border-gray-700 text-white text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => savePickupAddress(seller)}
                    disabled={savingPickupAddressId === seller.id}
                    className="mt-2 w-full border-gray-700 text-xs text-gray-300"
                  >
                    {savingPickupAddressId === seller.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Save pickup address
                  </Button>
                </div>

                <div className="mb-4 rounded-xl border border-gray-800 bg-gray-800/50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-300">Seller dashboard access</p>
                  <p className="mb-3 text-[11px] text-gray-500">Sellers can always view their product reviews. This permission only allows approving or hiding them.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SELLER_DASHBOARD_SECTIONS.map(({ id, label }) => (
                      <label key={id} className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={(permissionDrafts[seller.id] || []).includes(id)}
                          onChange={(event) => setPermissionDrafts((current) => {
                            const permissions = current[seller.id] || [];
                            return {
                              ...current,
                              [seller.id]: event.target.checked
                                ? [...permissions, id]
                                : permissions.filter((permission) => permission !== id),
                            };
                          })}
                          className="accent-primary"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveDashboardPermissions(seller)}
                    disabled={savingPermissionsId === seller.id}
                    className="mt-3 w-full border-gray-700 text-xs text-gray-300"
                  >
                    {savingPermissionsId === seller.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Save dashboard access
                  </Button>
                </div>

                <div className="flex gap-2">
                  {seller.status === "pending" && (<>
                    <Button size="sm" onClick={() => updateStatus(seller.id, "approved")} className="flex-1 bg-green-600 hover:bg-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(seller.id, "rejected")} className="flex-1 border-red-900 text-red-400 hover:bg-red-900/30 text-xs"><XCircle className="w-3 h-3 mr-1" /> Reject</Button>
                  </>)}
                  {seller.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(seller.id, "suspended")} className="w-full border-yellow-900 text-yellow-400 hover:bg-yellow-900/20 text-xs">Suspend</Button>
                  )}
                  {(seller.status === "rejected" || seller.status === "suspended") && (
                    <Button size="sm" onClick={() => updateStatus(seller.id, "approved")} className="w-full bg-green-600 hover:bg-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Re-approve</Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </AdminLayout>
  );
}
