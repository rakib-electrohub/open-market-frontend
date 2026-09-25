import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import RichTextRenderer from '@/components/RichTextRenderer';

export default function ProductDetailsModal({ isOpen, onClose, productId, product: initialProduct }) {
  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct && !!productId);

  useEffect(() => {
    if (!isOpen || !productId || initialProduct) {
      setLoading(false);
      return;
    }

    setLoading(true);
    apiClient.entities.Product.get(productId)
      .then(p => {
        setProduct(p);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load product:', err);
        setLoading(false);
      });
  }, [isOpen, productId, initialProduct]);

  if (!product && loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Not Found</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Unable to load product details.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-3">
            {product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.slice(1, 5).map((img, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img src={img} alt={`${product.name} ${idx + 2}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                No image available
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary">৳{product.price?.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {product.sold_count ? `${product.sold_count} sold` : 'New product'}
                {product.stock !== undefined && ` · ${product.stock} in stock`}
              </p>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {product.is_active && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              )}
              {product.approval_status && (
                <Badge
                  variant="outline"
                  className={
                    product.approval_status === 'approved'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : product.approval_status === 'pending'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }
                >
                  {product.approval_status?.charAt(0).toUpperCase() + product.approval_status?.slice(1)}
                </Badge>
              )}
            </div>

            {/* Seller info */}
            {product.seller_name && (
              <div>
                <p className="text-xs text-muted-foreground">Seller</p>
                <p className="font-medium">{product.seller_name}</p>
              </div>
            )}

            {/* Rating */}
            {product.rating !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="font-medium">
                  {product.rating > 0 ? `${product.rating.toFixed(1)} / 5` : 'No ratings yet'}
                </p>
              </div>
            )}

            {/* Stock status */}
            {product.stock !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Stock</p>
                <p className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">Description</h3>
            <RichTextRenderer content={product.description} className="text-sm text-muted-foreground" />
          </div>
        )}

        {/* Additional details */}
        {(product.category || product.brand || product.sku) && (
          <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {product.category && (
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{product.category}</p>
              </div>
            )}
            {product.brand && (
              <div>
                <p className="text-xs text-muted-foreground">Brand</p>
                <p className="text-sm font-medium">{product.brand}</p>
              </div>
            )}
            {product.sku && (
              <div>
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="text-sm font-medium">{product.sku}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
