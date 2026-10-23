import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import { persistCart } from "@/utils/cart";
import { getCartItemKey } from "@/utils/cart";
import { useToast } from "@/components/ui/use-toast";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import { useAppSettings } from "@/hooks/useAppSettings";
import AddressSelector from "@/components/ui/AddressSelector";
import { parseAddressString } from "@/lib/addressUtils";
import StepIndicator from "@/components/checkout/StepIndicator";
import PaymentMethodsDisplay from "@/components/checkout/PaymentMethodsDisplay";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, ChevronLeft, Store, Truck } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery", icon: "💵", desc: "Pay when you receive" },
  { value: "bkash", label: "bKash", icon: "📱", desc: "Mobile banking" },
  { value: "nagad", label: "Nagad", icon: "📲", desc: "Mobile banking" },
  { value: "rocket", label: "Rocket", icon: "🚀", desc: "DBBL mobile banking" },
  { value: "bank", label: "Bank Transfer", icon: "🏦", desc: "Direct bank transfer" },
];
const EMPTY_CART = [];

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const notify = usePersistentToast();
  const settings = useAppSettings();
  const storePickupEnabled = settings.store_pickup_enabled === true
    || String(settings.store_pickup_enabled).toLowerCase() === "true";
  const { cart: navigationCart, discount = 0, coupon } = state || {};
  const directBuyItem = state?.directBuy;
  const [storedCart, setStoredCart] = useState(EMPTY_CART);
  useEffect(() => {
    if (navigationCart !== undefined || directBuyItem) return;
    try {
      const savedCart = JSON.parse(window.localStorage.getItem("cart") || "[]");
      setStoredCart(Array.isArray(savedCart) ? savedCart : EMPTY_CART);
    } catch {
      setStoredCart(EMPTY_CART);
    }
  }, [navigationCart, directBuyItem]);
  const cart = navigationCart ?? storedCart;
  const checkoutItems = useMemo(() => directBuyItem ? [directBuyItem] : cart, [directBuyItem, cart]);
  const adminPickupAddress = String(settings.admin_pickup_address || "").trim();
  const adminPickupStoreName = String(settings.store_name || "Open Market BD").trim();

  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState(1); // 1=Shipping, 2=Payment, 3=Confirm

  // Form & delivery
  const [shippingFee, setShippingFee] = useState(60);
  const [deliveryOption, setDeliveryOption] = useState("default");
  const [fulfillmentMethod, setFulfillmentMethod] = useState("delivery");
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState(null);
  const [pickupData, setPickupData] = useState({ key: "", locations: [], productSellers: {} });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    landmark: "",
    area: "",
    district: "",
    division: "",
    postal_code: "",
    address_label: "home",
    office_time: "",
  });
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const checkoutItemKey = `${checkoutItems.map((item) => `${item.product_id || item.product_name}:${item.seller_id || ""}`).join("|")}|${storePickupEnabled}|${adminPickupAddress}|${adminPickupStoreName}`;

  useEffect(() => {
    let cancelled = false;
    const loadPickupLocations = async () => {
      if (!checkoutItems.length) return;
      try {
        const itemsWithProduct = await Promise.all(checkoutItems.map(async (item) => {
          if (!item.product_id) {
            return { ...item, store_pickup_enabled: false, pickup_reason: "This cart item has no product record." };
          }
          try {
            const product = await apiClient.entities.Product.get(item.product_id);
            return {
              ...item,
              seller_id: product.seller_id ? String(product.seller_id) : "",
              seller_name: product.seller_name,
              store_pickup_enabled: product.seller_id
                ? undefined
                : product.store_pickup_enabled === false
                  || String(product.store_pickup_enabled).toLowerCase() === "false"
                  ? false
                  : true,
            };
          } catch (error) {
            console.error(`Could not load pickup settings for product ${item.product_id}:`, error);
            return {
              ...item,
              store_pickup_enabled: false,
              pickup_reason: `Could not verify pickup settings for ${item.product_name || "a product"}.`,
            };
          }
        }));
        const sellerIds = [...new Set(itemsWithProduct
          .map((item) => item.seller_id)
          .filter(Boolean)
          .map(String))];
        const sellers = await Promise.all(sellerIds.map(async (sellerId) => {
          try {
            return await apiClient.entities.Seller.get(sellerId);
          } catch (error) {
            console.error(`Could not load pickup location for seller ${sellerId}:`, error);
            return null;
          }
        }));
        const sellersById = new Map(sellers.filter(Boolean).map((seller) => [String(seller.id), seller]));
        const pickupItems = itemsWithProduct.map((item) => {
          if (!item.seller_id) {
            if (!item.store_pickup_enabled) {
              return {
                ...item,
                pickup_location: null,
                pickup_reason: `Pickup is turned off for ${item.product_name || "this admin product"}. Enable it in Admin > Products.`,
              };
            }
            return storePickupEnabled && adminPickupAddress
              ? {
                  ...item,
                  store_pickup_enabled: true,
                  pickup_location: { id: "admin-store", store_name: adminPickupStoreName, address: adminPickupAddress },
                  pickup_reason: "",
                }
              : {
                  ...item,
                  store_pickup_enabled: storePickupEnabled,
                  pickup_location: null,
                  pickup_reason: !storePickupEnabled
                    ? "Store pickup is disabled by the marketplace admin."
                    : "Add the admin product pickup address in Admin > Site Settings > General.",
                };
          }

          const seller = sellersById.get(item.seller_id);
          if (!seller) {
            return {
              ...item,
              pickup_location: null,
              pickup_reason: `Could not verify the pickup address for ${item.seller_name || "this seller"}.`,
            };
          }
          const sellerPickupEnabled = seller.store_pickup_enabled === true
            || String(seller.store_pickup_enabled).toLowerCase() === "true";
          if (!sellerPickupEnabled) {
            return {
              ...item,
              store_pickup_enabled: false,
              pickup_location: null,
              pickup_reason: `Store pickup is disabled by ${seller.store_name || "this seller"}.`,
            };
          }
          if (seller.status !== "approved") {
            return {
              ...item,
              pickup_location: null,
              pickup_reason: `${seller.store_name || "This seller"} must be approved before pickup can be offered.`,
            };
          }
          if (!String(seller.address || "").trim()) {
            return {
              ...item,
              pickup_location: null,
              pickup_reason: `Add a pickup address for ${seller.store_name || "this seller"} in Admin > Sellers.`,
            };
          }

          return {
            ...item,
            store_pickup_enabled: true,
            pickup_location: {
              id: item.seller_id,
              store_name: seller.store_name || "Seller store",
              address: String(seller.address).trim(),
            },
            pickup_reason: "",
          };
        });
        if (!cancelled) {
          setPickupData({
            key: checkoutItemKey,
            productSellers: Object.fromEntries(pickupItems
              .filter((item) => item.product_id)
              .map((item) => [item.product_id, {
                seller_id: item.seller_id ? String(item.seller_id) : "",
                seller_name: item.seller_name || "",
                store_pickup_enabled: item.store_pickup_enabled,
                pickup_location: item.pickup_location,
                pickup_reason: item.pickup_reason,
              }])),
            locations: pickupItems.map((item) => item.pickup_location).filter(Boolean)
              .filter((location, index, locations) => locations.findIndex((entry) => entry.id === location.id) === index),
          });
        }
      } catch (error) {
        console.error("Could not load store pickup locations:", error);
        if (!cancelled) setPickupData({ key: checkoutItemKey, locations: [], productSellers: {} });
      }
    };

    loadPickupLocations();
    return () => { cancelled = true; };
  }, [checkoutItems, checkoutItemKey, adminPickupAddress, adminPickupStoreName, storePickupEnabled]);

  const pickupLocationsLoading = checkoutItems.length > 0 && pickupData.key !== checkoutItemKey;
  const pickupLocations = pickupData.key === checkoutItemKey ? pickupData.locations : [];
  const resolvedProductSellers = pickupData.key === checkoutItemKey ? pickupData.productSellers : {};
  const resolvedCheckoutItems = checkoutItems.map((item) => ({
    ...item,
    ...(resolvedProductSellers[item.product_id] || {}),
  }));
  const availablePickupLocations = [
    ...pickupLocations,
    ...resolvedCheckoutItems.map((item) => item.pickup_location).filter(Boolean),
  ].filter((location, index, locations) => locations.findIndex((entry) => entry.id === location.id) === index);
  const pickupSelectable = checkoutItems.length > 0 && storePickupEnabled;
  const pickupAvailable = checkoutItems.length > 0
    && storePickupEnabled
    && resolvedCheckoutItems.every((item) => item.store_pickup_enabled && Boolean(item.pickup_location?.address));
  const pickupUnavailableReasons = !storePickupEnabled
    ? ["Store pickup is disabled. An admin can enable it in Admin > Site Settings > General."]
    : checkoutItems.length === 0
      ? ["Add a product to your cart before choosing store pickup."]
      : [...new Set(resolvedCheckoutItems
      .filter((item) => !item.store_pickup_enabled || !item.pickup_location?.address)
      .map((item) => item.pickup_reason || `Pickup is unavailable for ${item.product_name || "a product"}; check its product pickup setting and store address.`))];

  // Load user data
  useEffect(() => {
    apiClient.auth.me().then((user) => {
      setAuthenticatedUser(user);
      const addressParts = parseAddressString(user.address || "");
      setForm((current) => ({
        name: current.name || user.name || user.full_name || "",
        email: current.email || user.email || "",
        phone: current.phone || user.phone || "",
        street: current.street || addressParts.street || "",
        landmark: current.landmark || "",
        area: current.area || addressParts.area || "",
        district: current.district || addressParts.district || "",
        division: current.division || addressParts.division || "",
        postal_code: current.postal_code || "",
        address_label: current.address_label || "home",
        office_time: current.office_time || "",
      }));
    }).catch(() => setAuthenticatedUser(null));
  }, []);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [ordered, setOrdered] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({});

  // Load payment config from settings
  useEffect(() => {
    try {
      const config = settings.payment_methods_config;
      if (typeof config === "string") {
        setPaymentConfig(JSON.parse(config));
      } else if (config) {
        setPaymentConfig(config);
      }
    } catch (e) {
      console.log("Could not parse payment config:", e);
    }
  }, [settings.payment_methods_config]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddressChange = (addressParts) => {
    setForm(prev => ({
      ...prev,
      street: addressParts.street !== undefined ? addressParts.street : prev.street,
      area: addressParts.area !== undefined ? addressParts.area : prev.area,
      district: addressParts.district !== undefined ? addressParts.district : prev.district,
      division: addressParts.division !== undefined ? addressParts.division : prev.division,
    }));
  };

  const deliveryLocations = useMemo(() => {
    try {
      const raw = settings.delivery_locations_json;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return parsed && Array.isArray(parsed.divisions) ? parsed : null;
    } catch {
      return null;
    }
  }, [settings.delivery_locations_json]);

  const addressData = useMemo(() => {
    if (!deliveryLocations?.divisions?.length) return undefined;

    return deliveryLocations.divisions.map((divisionItem) => ({
      division: divisionItem.name,
      districts: (divisionItem.districts || []).map((districtItem) => ({
        name: districtItem.name,
        subdivisions: (districtItem.areas || []).map((areaItem) => areaItem.name),
      })),
    }));
  }, [deliveryLocations]);

  const orderedItems = resolvedCheckoutItems;
  const subtotal = orderedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const effectiveShippingFee = fulfillmentMethod === "pickup" ? 0 : shippingFee;
  const total = Math.max(0, subtotal - discount + effectiveShippingFee);

  // Calculate shipping fee based on delivery_locations_json (Division -> District -> Area)
  useEffect(() => {
    if (fulfillmentMethod === "pickup") return;

    const defaultFeeFallback = 60;
    const isFastDelivery = deliveryOption === "fast";
    const getFee = (entry) => {
      if (!entry) return null;

      const rawFee = isFastDelivery
        ? entry.fast_fee ?? entry.fast_delivery_fee
        : entry.default_fee ?? entry.delivery_fee;
      const fee = Number(rawFee);

      return Number.isFinite(fee) && fee >= 0 ? fee : null;
    };

    const divisions = deliveryLocations?.divisions || [];
    const unknown = deliveryLocations?.unknown_area_fee || {};

    const norm = (s) => (s ?? "").toString().trim().toLowerCase();

    let matchedArea = null;
    let matchedDistrict = null;

    for (const div of divisions) {
      const divMatch = norm(div?.id) === norm(form.division) || norm(div?.name) === norm(form.division);
      if (!divMatch) continue;

      for (const dis of div?.districts || []) {
        const distMatch = norm(dis?.id) === norm(form.district) || norm(dis?.name) === norm(form.district);
        if (!distMatch) continue;

        matchedDistrict = dis;
        matchedArea = (dis?.areas || []).find(
          (a) => norm(a?.id) === norm(form.area) || norm(a?.name) === norm(form.area)
        );
        break;
      }

      if (matchedDistrict) break;
    }

    const areaFee = getFee(matchedArea);
    const districtFee = getFee(matchedDistrict);
    const unknownFee = getFee(unknown);
    const finalFee = areaFee ?? districtFee ?? unknownFee ?? defaultFeeFallback;
    setShippingFee(finalFee);

    if (areaFee !== null) {
      setDeliveryZoneInfo({
        type: "area",
        label: matchedArea.name,
        default_fee: matchedArea.default_fee ?? matchedArea.delivery_fee,
        fast_fee: matchedArea.fast_fee ?? matchedArea.fast_delivery_fee,
      });
      return;
    }

    if (districtFee !== null) {
      setDeliveryZoneInfo({
        type: "district",
        label: matchedDistrict.name,
        default_fee: matchedDistrict.default_fee ?? matchedDistrict.delivery_fee,
        fast_fee: matchedDistrict.fast_fee ?? matchedDistrict.fast_delivery_fee,
      });
      return;
    }

    if (unknownFee !== null) {
      setDeliveryZoneInfo({
        type: "unknown",
        label: "Other delivery area",
        default_fee: unknown.default_fee ?? unknown.delivery_fee,
        fast_fee: unknown.fast_fee ?? unknown.fast_delivery_fee,
      });
      return;
    }

    setDeliveryZoneInfo(null);
  }, [form.division, form.district, form.area, deliveryOption, deliveryLocations, fulfillmentMethod]);


  const validateShippingInfo = () => {
    if (!form.name || !form.phone) {
      toast({ title: "Please enter your name and phone number", variant: "destructive" });
      return false;
    }
    if (fulfillmentMethod === "pickup") {
      if (!pickupAvailable) {
        toast({ title: "Store pickup is unavailable for one or more products", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (!form.street || !form.district || !form.division || !form.area || !form.address_label) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return false;
    }
    if (form.address_label === "office" && !form.office_time) {
      toast({ title: "Please select office delivery time", variant: "destructive" });
      return false;
    }
    return true;
  };

  const createOrder = async (status = "pending") => {
    const orderNumber = "OMB-" + Date.now().toString().slice(-8);
    const orderPickupLocations = fulfillmentMethod === "pickup"
      ? availablePickupLocations.filter((location) => orderedItems.some((item) => (
        item.seller_id ? String(item.seller_id) === location.id : item.pickup_location?.id === location.id
      )))
      : [];
    const orderShippingFee = fulfillmentMethod === "pickup" ? 0 : shippingFee;
    
    const endpoint = authenticatedUser
      ? "/api/entities/Order"
      : "/api/guest-order";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        order_number: orderNumber,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        fulfillment_method: fulfillmentMethod,
        pickup_locations: orderPickupLocations,
        delivery_address: fulfillmentMethod === "delivery" ? {
            street: form.street,
            landmark: form.landmark,
            area: form.area,
            district: form.district,
            division: form.division,
            postal_code: form.postal_code,
            address_label: form.address_label,
            office_time: form.office_time,
          } : null,
        items: orderedItems.map(({ pickup_location, ...item }) => item),
        subtotal,
        discount,
        shipping_fee: orderShippingFee,
        delivery_option: fulfillmentMethod === "delivery" ? deliveryOption : null,
        total,
        payment_method: paymentMethod,
        status
      })
    });

    const order = await response.json();
    if (!response.ok) {
      throw new Error(order?.message || "Failed to place order");
    }

    // Update coupon
    if (coupon) {
      await apiClient.entities.Coupon.update(coupon.id, { used_count: (coupon.used_count || 0) + 1 }).catch(() => {});
    }

    // Clear cart
    if (!directBuyItem) {
      persistCart([]);
    }

    // Send Slack notification
    apiClient.integrations.Core.InvokeLLM({
      prompt: `Send a Slack notification message (plain text, no markdown) for a new order on Open Market BD:\n      Order: ${orderNumber}\nCustomer: ${form.name} (${form.phone})\nItems: ${orderedItems.length} item(s)\nTotal: ৳${total.toLocaleString()}\nPayment: ${paymentMethod.toUpperCase()}\nFulfillment: ${fulfillmentMethod === "pickup" ? "Store pickup" : "Delivery"}\nStatus: ${status}\n${fulfillmentMethod === "delivery" ? `District: ${form.district}` : `Pickup stores: ${orderPickupLocations.map((location) => location.store_name).join(", ")}`}\n\nFormat it as a brief, professional Slack message starting with 🛒 New Order!`
    }).catch(() => {});

    return order;
  };

  // Step 1: Handle shipping info submission
  const handleContinueToPayment = async () => {
    if (!validateShippingInfo()) return;

    if (paymentMethod === "cod") {
      // Direct order for COD
      setPlacing(true);
      try {
        const order = await createOrder("pending");
        notify?.("Order placed! #" + order.order_number, "success");
        setOrdered(order);
      } catch (err) {
        console.error("ORDER ERROR:", err);

        toast({
          title: err?.message || "Failed to place order",
          description: JSON.stringify(err),
          variant: "destructive"
        });
      }
      finally {
        setPlacing(false);
      }
    } else {
      // Go to payment step for other methods
      setCheckoutStep(2);
    }
  };

  // Step 2: Handle payment confirmation
  const handleConfirmPayment = async (transactionId) => {
    setPlacing(true);
    try {
      // Create order with payment_pending status
      const order = await createOrder("payment_pending");
      
      // Verify payment
      await fetch(`/api/orders/${order.id}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      // Update local order status
      order.status = "payment_confirmed";
      order.transaction_id = transactionId;

      notify?.("Payment confirmed! Order #" + order.order_number, "success");
      setOrdered(order);
      setCheckoutStep(3);
    } catch (error) {
      toast({ title: "Payment verification failed", variant: "destructive" });
      console.error(error);
    } finally {
      setPlacing(false);
    }
  };

  // Success screen
  if (ordered) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar cart={[]} />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-2xl border border-border p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-poppins font-bold text-2xl mb-2">Order Placed! 🎉</h2>
            <p className="text-muted-foreground mb-4">Thank you for shopping with Open Market BD</p>
            <div className="bg-muted rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-poppins font-bold text-xl text-primary">{ordered.order_number}</p>
            </div>
            <div className="space-y-2 text-sm text-left mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-yellow-600">{ordered.status || "Pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <span className="font-medium capitalize">{ordered.fulfillment_method === "pickup" ? "Store pickup" : "Delivery"}</span>
              </div>
              {ordered.fulfillment_method === "pickup" && ordered.pickup_locations?.map((location) => (
                <div key={location.id} className="text-left">
                  <p className="font-medium">{location.store_name}</p>
                  <p className="text-xs text-muted-foreground">{location.address}</p>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium capitalize">{ordered.payment_method?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">৳{ordered.total?.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/orders")}>Track Order</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => navigate("/")}>Continue Shopping</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="font-poppins font-bold text-2xl mb-6">Checkout</h1>

        {/* Step Indicator */}
        <StepIndicator currentStep={checkoutStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* STEP 1: SHIPPING INFO */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-border p-5">
                  <h2 className="font-semibold mb-4">Delivery Information</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input 
                        name="name" 
                        value={form.name} 
                        onChange={handleChange} 
                        placeholder="Your full name" 
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input 
                        name="phone" 
                        value={form.phone} 
                        onChange={handleChange} 
                        placeholder="01XXXXXXXXX" 
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label>Email (optional)</Label>
                      <Input 
                        name="email" 
                        type="email" 
                        value={form.email} 
                        onChange={handleChange} 
                        placeholder="For order updates" 
                        className="mt-1" 
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>How would you like to receive your order?</Label>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition-colors ${fulfillmentMethod === "delivery" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <input
                            type="radio"
                            name="fulfillment_method"
                            value="delivery"
                            checked={fulfillmentMethod === "delivery"}
                            onChange={() => setFulfillmentMethod("delivery")}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4 text-primary" /> Delivery</span>
                          <p className="mt-1 text-xs text-muted-foreground">Deliver to your address. Delivery fee depends on your area.</p>
                        </label>
                        <label className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition-colors ${fulfillmentMethod === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"} ${!pickupSelectable ? "cursor-not-allowed opacity-60" : ""}`}>
                          <input
                            type="radio"
                            name="fulfillment_method"
                            value="pickup"
                            checked={fulfillmentMethod === "pickup"}
                            onChange={() => setFulfillmentMethod("pickup")}
                            disabled={!pickupSelectable}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-2 font-semibold"><Store className="h-4 w-4 text-primary" /> Pick up from store</span>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {pickupLocationsLoading
                              ? "Checking store pickup availability..."
                              : pickupAvailable
                                ? "Collect your order from the listed store location(s). No delivery fee."
                                : pickupUnavailableReasons.join(" ")}
                          </p>
                        </label>
                      </div>
                      {fulfillmentMethod === "pickup" && (
                        <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                          {pickupLocationsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading pickup locations...</p>
                          ) : (
                            <>
                              {availablePickupLocations.map((location) => (
                                <div key={location.id} className="flex items-start gap-2 text-sm">
                                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                  <div><p className="font-semibold">{location.store_name}</p><p className="text-muted-foreground">{location.address}</p></div>
                                </div>
                              ))}
                              {!pickupAvailable && pickupUnavailableReasons.map((reason) => (
                                <p key={reason} className="text-sm text-amber-700">{reason}</p>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {fulfillmentMethod === "delivery" && (
                      <>
                      <div>
                        <Label>Delivery Type *</Label>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                        <label className={`cursor-pointer rounded-xl border px-3 py-3 text-sm ${form.address_label === "home" ? "border-primary bg-primary/10" : "border-border hover:border-primary"}`}>
                          <input 
                            type="radio" 
                            name="address_label" 
                            value="home" 
                            checked={form.address_label === "home"} 
                            onChange={handleChange} 
                            className="sr-only" 
                          />
                          <div className="font-semibold">Home</div>
                          <p className="text-muted-foreground text-xs">Deliver to your home</p>
                        </label>
                        <label className={`cursor-pointer rounded-xl border px-3 py-3 text-sm ${form.address_label === "office" ? "border-primary bg-primary/10" : "border-border hover:border-primary"}`}>
                          <input 
                            type="radio" 
                            name="address_label" 
                            value="office" 
                            checked={form.address_label === "office"} 
                            onChange={handleChange} 
                            className="sr-only" 
                          />
                          <div className="font-semibold">Office</div>
                          <p className="text-muted-foreground text-xs">Office delivery</p>
                        </label>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <Label>Delivery Address *</Label>
                      <div className="mt-1">
                        <AddressSelector
                          value={{ street: form.street, area: form.area, district: form.district, division: form.division }}
                          onChange={handleAddressChange}
                          addressData={addressData}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Colony / Locality / Landmark</Label>
                      <Input 
                        name="landmark" 
                        value={form.landmark} 
                        onChange={handleChange} 
                        placeholder="Suburb or landmark" 
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input 
                        name="postal_code" 
                        value={form.postal_code} 
                        onChange={handleChange} 
                        placeholder="1200" 
                        className="mt-1" 
                      />
                    </div>

                    {form.address_label === "office" && (
                      <div className="lg:col-span-2">
                        <Label>Preferred Office Delivery Time *</Label>
                        <select
                          name="office_time"
                          value={form.office_time}
                          onChange={handleChange}
                          className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Choose a time slot</option>
                          <option value="9:00 AM - 12:00 PM">9:00 AM - 12:00 PM</option>
                          <option value="12:00 PM - 3:00 PM">12:00 PM - 3:00 PM</option>
                          <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM</option>
                        </select>
                      </div>
                    )}

                    <div className="lg:col-span-2">
                      <Label>Delivery Option</Label>
                      <select 
                        value={deliveryOption} 
                        onChange={(e) => setDeliveryOption(e.target.value)} 
                        className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="default">Default Delivery</option>
                        <option value="fast">Fast Delivery</option>
                      </select>
                      {form.district && (
                        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                          {deliveryZoneInfo ? (
                            <>
                              <p className={`font-semibold ${deliveryZoneInfo.type === "unknown" ? "text-yellow-600" : "text-green-600"}`}>
                                {deliveryZoneInfo.type === "area" && `✓ Area delivery fee: ${deliveryZoneInfo.label}`}
                                {deliveryZoneInfo.type === "district" && `✓ District delivery fee: ${deliveryZoneInfo.label}`}
                                {deliveryZoneInfo.type === "unknown" && "ℹ Other delivery area"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Default: ৳{deliveryZoneInfo.default_fee} | Fast: ৳{deliveryZoneInfo.fast_fee}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-yellow-600">ℹ Other delivery area</p>
                              <p className="text-xs text-muted-foreground mt-1">Fee: ৳{shippingFee}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white rounded-xl border border-border p-5">
                  <h2 className="font-semibold mb-4">Payment Method</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(m => (
                      <label 
                        key={m.value} 
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      >
                        <input 
                          type="radio" 
                          name="payment" 
                          value={m.value} 
                          checked={paymentMethod === m.value} 
                          onChange={() => setPaymentMethod(m.value)} 
                          className="accent-primary" 
                        />
                        <span className="text-xl">{m.icon}</span>
                        <div>
                          <div className="font-semibold text-sm">{m.label}</div>
                          <div className="text-xs text-muted-foreground">{m.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PAYMENT DETAILS */}
            {checkoutStep === 2 && paymentMethod !== "cod" && (
              <div className="space-y-4">
                <button
                  onClick={() => setCheckoutStep(1)}
                  className="flex items-center gap-2 text-primary hover:underline text-sm mb-4"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Shipping
                </button>
                <PaymentMethodsDisplay
                  selectedMethod={paymentMethod}
                  onMethodChange={(method) => method === null ? setCheckoutStep(1) : null}
                  paymentConfig={paymentConfig}
                  onConfirmPayment={handleConfirmPayment}
                  isLoading={placing}
                  total={total}
                />
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white rounded-xl border border-border p-4 h-fit">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {checkoutItems.map(item => (
                <div key={getCartItemKey(item)} className="flex items-center gap-2 text-sm">
                  {item.product_image && (
                    <img src={item.product_image} alt="" className="w-10 h-10 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.product_name}</p>
                    {Object.entries(item.selected_variants || {}).map(([name, option]) => (
                      <p key={name} className="text-xs text-muted-foreground">{name}: {option}</p>
                    ))}
                    <p className="text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <span className="font-semibold">৳{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>৳{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fulfillmentMethod === "pickup" ? "Store pickup" : "Shipping"}</span>
                <span>{effectiveShippingFee === 0 ? <span className="text-green-600">FREE</span> : `৳${effectiveShippingFee}`}</span>
              </div>
              {fulfillmentMethod === "pickup" && availablePickupLocations.map((location) => (
                <p key={location.id} className="text-xs text-muted-foreground">{location.store_name}: {location.address}</p>
              ))}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary font-poppins">৳{total.toLocaleString()}</span>
              </div>
            </div>

            {checkoutStep === 1 && (
              <Button 
                onClick={handleContinueToPayment} 
                disabled={placing} 
                className="w-full mt-4 bg-primary hover:bg-primary/90 h-11 font-semibold text-base"
              >
                {placing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : paymentMethod === "cod" ? (
                  "Place Order"
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
