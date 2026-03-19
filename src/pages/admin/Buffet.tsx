import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Trash2, Package, Loader2 } from "lucide-react";
import {
  useBuffetProducts, useCreateBuffetProduct, useUpdateBuffetProduct, useDeleteBuffetProduct, useCreateBuffetSale,
  type BuffetProduct,
} from "@/hooks/use-supabase-data";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Todas", "Bebidas", "Snacks", "Comidas"];

interface CartItem {
  product: BuffetProduct;
  qty: number;
}

const Buffet = () => {
  const { data: products = [], isLoading } = useBuffetProducts();
  const createProduct = useCreateBuffetProduct();
  const updateProduct = useUpdateBuffetProduct();
  const deleteProduct = useDeleteBuffetProduct();
  const createSale = useCreateBuffetSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  // New product form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Bebidas");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");

  /* ── Cart helpers ── */
  const addToCart = (product: BuffetProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  const handleCharge = async () => {
    try {
      await createSale.mutateAsync({
        total: cartTotal,
        items: cart.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.qty,
          unit_price: i.product.price,
        })),
      });
      setCart([]);
      toast({ title: "Venta registrada ✅" });
    } catch {
      toast({ title: "Error al registrar la venta", variant: "destructive" });
    }
  };

  const handleAddProduct = async () => {
    if (!newName || !newPrice) return;
    try {
      await createProduct.mutateAsync({
        name: newName,
        category: newCategory,
        price: Number(newPrice),
        stock: Number(newStock) || 0,
      });
      setNewName("");
      setNewPrice("");
      setNewStock("");
      toast({ title: "Producto agregado ✅" });
    } catch {
      toast({ title: "Error al agregar producto", variant: "destructive" });
    }
  };

  const filteredProducts =
    categoryFilter === "Todas" ? products : products.filter((p) => p.category === categoryFilter);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buffet / Kiosco</h1>
          <p className="text-muted-foreground text-sm">Gestioná las ventas y el inventario de tu buffet.</p>
        </div>

        <Tabs defaultValue="pos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pos">Punto de Venta</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
          </TabsList>

          {/* ─── POS Tab ─── */}
          <TabsContent value="pos">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Product grid */}
              <div className="flex-1 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoryFilter === cat ? "default" : "outline"}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 bg-muted/50 rounded-2xl">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay productos. Agregá desde la pestaña Inventario.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => p.stock > 0 && addToCart(p)}
                        disabled={p.stock <= 0}
                        className="group rounded-xl border bg-card text-card-foreground p-4 text-left transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-3">
                          <Package className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-primary">${p.price.toLocaleString()}</span>
                          <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px]">
                            Stock: {p.stock}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="rounded-xl border bg-card text-card-foreground p-4 sticky top-4 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <ShoppingCart className="w-5 h-5" />
                    Carrito
                    {cart.length > 0 && (
                      <Badge className="ml-auto">{cart.reduce((s, i) => s + i.qty, 0)}</Badge>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Hacé clic en un producto para agregarlo.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${item.product.price.toLocaleString()} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.product.id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQty(item.product.id, 1)}
                              disabled={item.qty >= item.product.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-3 space-y-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">${cartTotal.toLocaleString()}</span>
                    </div>
                    <Button className="w-full h-12 text-base font-bold" disabled={cart.length === 0 || createSale.isPending} onClick={handleCharge}>
                      {createSale.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cobrar ${cartTotal.toLocaleString()}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Inventory Tab ─── */}
          <TabsContent value="inventory">
            <div className="rounded-xl border bg-card text-card-foreground">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Productos</h2>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Agregar producto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo producto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <Label>Nombre</Label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Agua mineral" />
                      </div>
                      <div className="space-y-1">
                        <Label>Categoría</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.filter((c) => c !== "Todas").map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Precio ($)</Label>
                          <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label>Stock</Label>
                          <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button onClick={handleAddProduct} disabled={createProduct.isPending}>Guardar</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${p.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.stock > 5 ? "secondary" : p.stock > 0 ? "outline" : "destructive"}>
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteProduct.mutate(p.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Buffet;
