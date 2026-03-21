import { useState, useEffect, useCallback, useRef } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Trash2, Package, Loader2, Search, ImageIcon, Upload, RefreshCcw, Pencil, AlertTriangle } from "lucide-react";
import {
  useBuffetProducts, useCreateBuffetProduct, useUpdateBuffetProduct, useDeleteBuffetProduct, useCreateBuffetSale,
  type BuffetProduct, useUploadBuffetImage,
} from "@/hooks/use-supabase-data";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Todas", "Bebidas", "Snacks", "Comidas"];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

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
  
  const { uploadImage, uploadingImage } = useUploadBuffetImage(); 

  const [cart, setCart] = useState<CartItem[]>([]);
  
  // --- NUEVOS ESTADOS DE FILTRO GLOBAL ---
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");

  // --- ESTADOS DEL MODAL (Nuevo y Edición) ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Bebidas");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newImageUrl, setNewImageUrl] = useState(""); 
  const [newLowStockLimit, setNewLowStockLimit] = useState("10");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageResults, setImageResults] = useState<string[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  
  const debouncedName = useDebounce(newName, 800); 

  const searchImages = useCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn("Falta VITE_UNSPLASH_ACCESS_KEY en el .env.");
      return;
    }
    setSearchingImages(true);
    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(query)}&per_page=3&client_id=${accessKey}`);
      const data = await response.json();
      setImageResults(data.results.map((r: any) => r.urls.small)); 
    } catch {
      console.error("Error al buscar imagenes en Unsplash");
    } finally {
      setSearchingImages(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedName && debouncedName.trim().length > 2) {
      if (!uploadingImage && !newImageUrl.includes('supabase')) {
          searchImages(debouncedName.trim());
      }
    } else {
      setImageResults([]);
      setNewImageUrl(""); 
    }
  }, [debouncedName, searchImages, uploadingImage, newImageUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast({ title: "Error", description: "El archivo debe ser una imagen", variant: "destructive" });
    if (file.size > 2 * 1024 * 1024) return toast({ title: "Error", description: "La imagen es muy pesada (max 2MB)", variant: "destructive" });

    try {
        const publicUrl = await uploadImage(file);
        setNewImageUrl(publicUrl);
        setImageResults([]);
        toast({ title: "Imagen subida ✅" });
    } catch {
        toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
    } finally {
        event.target.value = '';
    }
  };

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
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));
  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  const handleCharge = async () => {
    try {
      await createSale.mutateAsync({
        total: cartTotal,
        items: cart.map((i) => ({ product_id: i.product.id, product_name: i.product.name, quantity: i.qty, unit_price: i.product.price })),
      });
      setCart([]);
      toast({ title: "Venta registrada ✅" });
    } catch {
      toast({ title: "Error al registrar la venta", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName("");
    setNewCategory("Bebidas");
    setNewPrice("");
    setNewStock("");
    setNewImageUrl("");
    setNewLowStockLimit("10");
    setImageResults([]);
  };

  const openModal = (product?: BuffetProduct) => {
    if (product) {
        setEditingId(product.id);
        setNewName(product.name);
        setNewCategory(product.category);
        setNewPrice(product.price.toString());
        setNewStock(product.stock.toString());
        setNewImageUrl(product.image_url || "");
        // @ts-ignore
        setNewLowStockLimit((product.low_stock_limit || 10).toString());
    } else {
        resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newName || !newPrice) return toast({ title: "Faltan datos obligatorios", variant: "destructive" });
    try {
      const payload = {
        name: newName,
        category: newCategory,
        price: Number(newPrice),
        stock: Number(newStock) || 0,
        image_url: newImageUrl,
        low_stock_limit: Number(newLowStockLimit) || 10
      };

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Producto actualizado ✅" });
      } else {
        await createProduct.mutateAsync(payload as any);
        toast({ title: "Producto agregado ✅" });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error al guardar el producto", variant: "destructive" });
    }
  };

  // --- FILTRADO GLOBAL (Categoría + Búsqueda) ---
  const filteredProducts = products.filter((p) => {
    const matchCategory = categoryFilter === "Todas" || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const getStockStatus = (stock: number, limit: number) => {
      const safeLimit = limit || 10;
      if (stock === 0) return "bg-destructive hover:bg-destructive/90 text-destructive-foreground";
      if (stock <= safeLimit) return "bg-orange-500 hover:bg-orange-600 text-white";
      return "bg-secondary text-secondary-foreground";
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
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

          {/* BARRA DE HERRAMIENTAS GLOBAL (Filtros + Buscador) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-2">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button key={cat} size="sm" variant={categoryFilter === cat ? "default" : "outline"} onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
            
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar producto..." 
                  className="pl-9 bg-card"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          {/* ─── POS Tab ─── */}
          <TabsContent value="pos" className="mt-0">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-4">
                
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 bg-muted/50 rounded-2xl border border-border">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                    {filteredProducts.map((p) => {
                      const isOutOfStock = p.stock <= 0;
                      // @ts-ignore
                      const limit = p.low_stock_limit || 10;
                      const hasLowStock = !isOutOfStock && p.stock <= limit;

                      return (
                        <button
                          key={p.id}
                          onClick={() => !isOutOfStock && addToCart(p)}
                          disabled={isOutOfStock}
                          className="group rounded-xl border bg-card text-card-foreground p-3 text-left transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed flex flex-col h-full"
                        >
                          <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-3 overflow-hidden border border-border relative">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                            ) : (
                              <Package className="w-8 h-8 text-muted-foreground/40" />
                            )}

                            {isOutOfStock && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                    <span className="font-bold text-white text-xs uppercase tracking-widest bg-destructive px-2 py-1 rounded-md">Sin Stock</span>
                                </div>
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-end">
                              <p className="font-semibold text-sm truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground mb-2">{p.category}</p>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="font-bold text-primary text-lg">${p.price.toLocaleString()}</span>
                                {/* ALERTA MOVIDA ABAJO A LA DERECHA */}
                                {hasLowStock && (
                                    <div className="p-1.5 rounded-full bg-orange-500 shadow-sm text-white animate-pulse" title="Poco stock">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                )}
                              </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="w-full lg:w-80 shrink-0 sticky top-4 self-start">
                <div className="rounded-xl border bg-card text-card-foreground p-4 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <ShoppingCart className="w-5 h-5 text-primary" /> Carrito
                    {cart.length > 0 && <Badge className="ml-auto bg-primary text-primary-foreground">{cart.reduce((s, i) => s + i.qty, 0)}</Badge>}
                  </div>

                  {cart.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl text-center py-8 bg-muted/30">
                        <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2"/>
                        <p className="text-muted-foreground text-xs px-4">Hacé clic en un producto para agregarlo.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-2 pb-2 border-b border-border last:border-0 last:pb-0">
                          <div className="w-9 h-9 rounded bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                              {item.product.image_url ? (
                                <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" loading="lazy"/>
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground/40" />
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">${item.product.price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1 border border-border rounded-full p-0.5">
                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => updateQty(item.product.id, -1)}><Minus className="w-3 h-3" /></Button>
                            <span className="w-6 text-center text-xs font-semibold">{item.qty}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => updateQty(item.product.id, 1)} disabled={item.qty >= item.product.stock}><Plus className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-3 space-y-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">${cartTotal.toLocaleString()}</span>
                    </div>
                    <Button className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={cart.length === 0 || createSale.isPending} onClick={handleCharge}>
                      {createSale.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cobrar ${cartTotal.toLocaleString()}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Inventory Tab ─── */}
          <TabsContent value="inventory" className="mt-0">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden border-border">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                <h2 className="font-semibold">Inventario de Productos</h2>

                <Button size="sm" onClick={() => openModal()}>
                  <Plus className="w-4 h-4 mr-1.5" /> Agregar producto
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
                      <DialogDescription className="hidden">Completa los datos del producto del buffet.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2 px-1 scrollbar-thin max-h-[80vh] overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <Label>Nombre del producto</Label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Agua mineral" />
                      </div>

                      <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                          <div className="flex items-center gap-2 mb-1.5">
                              <Search className="w-4 h-4 text-muted-foreground" />
                              <Label className="text-xs text-muted-foreground font-medium flex-1 truncate">
                                  Imagen del producto (Subí una o pica de internet)
                              </Label>
                              {searchingImages && <Loader2 className="w-3 h-3 animate-spin ml-auto text-primary"/>}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-1">
                              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                                  className={cn("aspect-square rounded-lg border-2 border-dashed border-border overflow-hidden transition-all flex flex-col items-center justify-center bg-card text-center text-xs text-muted-foreground p-3 hover:border-primary hover:bg-muted/30 group",
                                      newImageUrl && newImageUrl.includes('supabase') && "border-primary shadow-lg border-solid"
                                  )}>
                                  {uploadingImage ? (<Loader2 className="w-6 h-6 animate-spin text-primary"/>) : (
                                      <>
                                          {newImageUrl && newImageUrl.includes('supabase') ? (
                                              <img src={newImageUrl} alt="Propia" className="w-full h-full object-cover rounded" loading="lazy" />
                                          ) : (
                                              <>
                                                  <Upload className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary"/>
                                                  <span>Subir propia</span>
                                              </>
                                          )}
                                      </>
                                  )}
                              </button>
                              
                              {imageResults.length === 0 && !searchingImages && !newName ? (
                                  <div className="aspect-square text-center py-3 border-2 border-dashed border-border rounded-lg bg-card flex flex-col items-center justify-center text-muted-foreground">
                                      <ImageIcon className="w-5 h-5 mx-auto text-muted-foreground/30 mb-1" />
                                      <p className="text-[10px] px-2 leading-tight">Escribí el nombre para ver fotos de internet</p>
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-2 gap-1.5 h-full">
                                    {imageResults.map((url) => (
                                        <button key={url} onClick={() => { if (!uploadingImage) setNewImageUrl(url); }}
                                            className={cn("aspect-square rounded-lg border-2 overflow-hidden transition-all", newImageUrl === url ? "border-primary shadow-lg scale-105" : "border-border hover:border-primary/50" )}>
                                            <img src={url} alt="Internet" className="w-full h-full object-cover" loading="lazy" />
                                        </button>
                                    ))}
                                    {newName.length >= 3 && imageResults.length === 0 && !searchingImages && (
                                        <button onClick={() => searchImages(newName)} className="aspect-square flex flex-col items-center justify-center border border-border bg-card rounded-lg text-muted-foreground text-center text-[10px] hover:bg-muted transition-colors">
                                            <RefreshCcw className="w-4 h-4 mb-0.5" /> Reintentar fotos
                                        </button>
                                    )}
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Categoría</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger><SelectValue placeholder="Bebidas" /></SelectTrigger>
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
                          <Label>Stock actual</Label>
                          <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                          <Label className="text-orange-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> Alerta de poco stock</Label>
                          <Input type="number" value={newLowStockLimit} onChange={(e) => setNewLowStockLimit(e.target.value)} placeholder="Ej: 10" className="border-orange-500/30 focus-visible:ring-orange-500" />
                          <p className="text-[10px] text-muted-foreground">Avisar cuando queden esta cantidad o menos.</p>
                      </div>
                    </div>
                    
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveProduct} disabled={createProduct.isPending || updateProduct.isPending || searchingImages || uploadingImage}>
                            {(createProduct.isPending || updateProduct.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {editingId ? "Actualizar" : "Guardar"}
                        </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No se encontraron productos en el inventario.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      // @ts-ignore
                      const stockClass = getStockStatus(p.stock, p.low_stock_limit);
                      return (
                          <TableRow key={p.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden border border-border shrunk-0">
                                  {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                      <Package className="w-4 h-4 text-muted-foreground/40" />
                                  )}
                              </div>
                              <p>{p.name}</p>
                          </TableCell>
                          <TableCell>
                              <Badge variant="outline" className="text-xs h-5 px-1.5">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">${p.price.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                              <Badge className={cn("text-[11px] h-5 px-1.5 border-0", stockClass)}>
                              {p.stock} un.
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary mr-1" onClick={() => openModal(p)}>
                              <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive rounded-full hover:bg-destructive/10" onClick={() => deleteProduct.mutate(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                          </TableCell>
                          </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Buffet;