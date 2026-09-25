import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Copy, Check } from "lucide-react";

export default function PaymentMethodsDisplay({ 
  selectedMethod = "cod", 
  onMethodChange = () => {}, 
  paymentConfig = {},
  onConfirmPayment = () => {},
  isLoading = false,
  total = 0 
}) {
  const [transactionId, setTransactionId] = useState("");
  const [copied, setCopied] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const methods = {
    bkash: { label: "bKash", icon: "📱", desc: "Mobile banking" },
    nagad: { label: "Nagad", icon: "📲", desc: "Mobile banking" },
    rocket: { label: "Rocket", icon: "🚀", desc: "DBBL mobile banking" },
    bank: { label: "Bank Transfer", icon: "🏦", desc: "Direct bank transfer" },
  };

  const getAccountInfo = (method) => {
    return paymentConfig[method] || {};
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      alert("Please enter transaction ID");
      return;
    }
    setIsConfirming(true);
    try {
      await onConfirmPayment(transactionId);
      setTransactionId("");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Payment Account Details</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {selectedMethod === "bkash" && "Send ৳" + total + " to the bKash account below"}
          {selectedMethod === "nagad" && "Send ৳" + total + " to the Nagad account below"}
          {selectedMethod === "rocket" && "Send ৳" + total + " to the Rocket account below"}
          {selectedMethod === "bank" && "Transfer ৳" + total + " to the bank account below"}
        </p>

        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          {selectedMethod === "bkash" && (
            <>
              {getAccountInfo("bkash")?.account_number && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="font-mono font-semibold">{getAccountInfo("bkash").account_number}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getAccountInfo("bkash").account_number, "bkash-number")}
                    className="p-2 hover:bg-background rounded transition-colors"
                  >
                    {copied === "bkash-number" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              {getAccountInfo("bkash")?.account_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-semibold">{getAccountInfo("bkash").account_name}</p>
                </div>
              )}
            </>
          )}

          {selectedMethod === "nagad" && (
            <>
              {getAccountInfo("nagad")?.account_number && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="font-mono font-semibold">{getAccountInfo("nagad").account_number}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getAccountInfo("nagad").account_number, "nagad-number")}
                    className="p-2 hover:bg-background rounded transition-colors"
                  >
                    {copied === "nagad-number" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              {getAccountInfo("nagad")?.account_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-semibold">{getAccountInfo("nagad").account_name}</p>
                </div>
              )}
            </>
          )}

          {selectedMethod === "rocket" && (
            <>
              {getAccountInfo("rocket")?.account_number && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="font-mono font-semibold">{getAccountInfo("rocket").account_number}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getAccountInfo("rocket").account_number, "rocket-number")}
                    className="p-2 hover:bg-background rounded transition-colors"
                  >
                    {copied === "rocket-number" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              {getAccountInfo("rocket")?.account_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-semibold">{getAccountInfo("rocket").account_name}</p>
                </div>
              )}
            </>
          )}

          {selectedMethod === "bank" && (
            <>
              {getAccountInfo("bank")?.account_number && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="font-mono font-semibold">{getAccountInfo("bank").account_number}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getAccountInfo("bank").account_number, "bank-number")}
                    className="p-2 hover:bg-background rounded transition-colors"
                  >
                    {copied === "bank-number" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              {getAccountInfo("bank")?.bank_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <p className="font-semibold">{getAccountInfo("bank").bank_name}</p>
                </div>
              )}
              {getAccountInfo("bank")?.branch && (
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="font-semibold">{getAccountInfo("bank").branch}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-semibold mb-1">Payment Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Send exactly ৳{total} to the account number above</li>
              <li>Note the transaction ID from your payment app</li>
              <li>Enter it below to confirm your payment</li>
              <li>Your order will be processed once verified</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Transaction ID *</Label>
          <Input
            placeholder="e.g., TXN20260609123456"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your transaction reference number (found in your payment app's confirmation)
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onMethodChange(null)}
          disabled={isConfirming || isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleConfirmPayment}
          disabled={!transactionId.trim() || isConfirming || isLoading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isConfirming ? "Confirming..." : "Confirm Payment"}
        </Button>
      </div>
    </div>
  );
}
