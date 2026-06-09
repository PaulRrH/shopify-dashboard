import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-products',
  imports: [ReactiveFormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private svc = inject(ProductService);
  private fb  = inject(FormBuilder);

  // ── Data ──────────────────────────────────────────────────────────────
  allProducts = signal<any[]>([]);
  loading     = signal(true);
  error       = signal<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────
  search          = signal('');
  minPrice        = signal(0);
  maxPrice        = signal(9999);
  absoluteMin     = signal(0);
  absoluteMax     = signal(9999);
  selectedColors  = signal<string[]>([]);
  selectedSizes   = signal<string[]>([]);
  selectedCategory = signal<string | null>(null);
  sortBy          = signal('popular');
  currentPage     = signal(1);
  sortOpen        = signal(false);

  readonly ITEMS_PER_PAGE = 9;

  readonly colors = [
    { name: 'Green',  hex: '#00C12B' }, { name: 'Red',    hex: '#F50606' },
    { name: 'Yellow', hex: '#F5DD06' }, { name: 'Orange', hex: '#F57906' },
    { name: 'Teal',   hex: '#06CAF4' }, { name: 'Blue',   hex: '#063AF4' },
    { name: 'Purple', hex: '#7D06F4' }, { name: 'Pink',   hex: '#F406A1' },
    { name: 'White',  hex: '#F0F0F0' }, { name: 'Navy',   hex: '#4F6B8A' },
    { name: 'Black',  hex: '#111111' },
  ];
  readonly sizes        = ['XX-Small', 'X-Small', 'Small', 'Medium', 'Large', 'X-Large', 'XX-Large', '3X-Large'];
  readonly categories   = ['T-shirts', 'Shorts', 'Shirts', 'Hoodie', 'Jeans'];
  readonly dressStyles  = ['Casual', 'Formal', 'Party', 'Gym'];
  readonly sortOptions  = [
    { value: 'popular',    label: 'Most Popular'       },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name',       label: 'Name: A to Z'       },
  ];

  private readonly RATINGS    = [3.5,4.5,5.0,3.5,4.5,4.5,5.0,4.0,3.0,4.5,4.0,3.5,5.0,4.5,4.0];
  private readonly BG_COLORS  = ['#F2F0F1','#FAFAFA','#F0EEED','#EBF1EB','#FFF8E7','#EBF2F8','#FCF0F4'];
  private readonly SALE_FLAGS = [false,false,true,true,false,true,false,false,true,false,true,false];

  // ── CRUD modal ────────────────────────────────────────────────────────
  modalOpen      = signal(false);
  modalMode      = signal<'create' | 'edit'>('create');
  editingProduct = signal<any | null>(null);
  saving         = signal(false);
  crudError      = signal<string | null>(null);

  // Delete confirmation
  deleteTarget   = signal<any | null>(null);
  deleting       = signal(false);

  productForm = this.fb.group({
    title:        ['', Validators.required],
    vendor:       ['', Validators.required],
    product_type: [''],
    price:        ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    sku:          [''],
    body_html:    [''],
  });

  // ── Computed ──────────────────────────────────────────────────────────
  filteredProducts = computed(() => {
    let list: any[] = this.allProducts();
    const q = this.search().toLowerCase().trim();
    if (q) list = list.filter(p => p.title?.toLowerCase().includes(q));
    list = list.filter(p => {
      const price = parseFloat(p.price);
      return !isNaN(price) && price >= this.minPrice() && price <= this.maxPrice();
    });
    const cat = this.selectedCategory();
    if (cat) {
      const kw = cat === 'T-shirts' ? 't-shirt' : cat === 'Shorts' ? 'short' :
                 cat === 'Shirts'   ? 'shirt'   : cat === 'Hoodie'  ? 'hoo'   :
                 cat === 'Jeans'    ? 'jean'    : '';
      if (kw) list = list.filter(p => p.title?.toLowerCase().includes(kw));
    }
    switch (this.sortBy()) {
      case 'price-asc':  return [...list].sort((a,b) => parseFloat(a.price) - parseFloat(b.price));
      case 'price-desc': return [...list].sort((a,b) => parseFloat(b.price) - parseFloat(a.price));
      case 'name':       return [...list].sort((a,b) => a.title?.localeCompare(b.title));
      default:           return list;
    }
  });

  totalProducts = computed(() => this.filteredProducts().length);
  totalPages    = computed(() => Math.max(1, Math.ceil(this.totalProducts() / this.ITEMS_PER_PAGE)));
  startItem     = computed(() => this.totalProducts() === 0 ? 0 : (this.currentPage()-1)*this.ITEMS_PER_PAGE+1);
  endItem       = computed(() => Math.min(this.currentPage()*this.ITEMS_PER_PAGE, this.totalProducts()));

  pagedProducts = computed(() => {
    const start = (this.currentPage()-1) * this.ITEMS_PER_PAGE;
    return this.filteredProducts()
      .slice(start, start + this.ITEMS_PER_PAGE)
      .map((p, i) => ({ ...p, _idx: start + i }));
  });

  sortLabel = computed(() => this.sortOptions.find(o => o.value === this.sortBy())?.label ?? 'Most Popular');
  pageTitle = computed(() => this.selectedCategory() ?? 'Casual');

  pageNumbers = computed((): (number | '...')[] => {
    const total = this.totalPages(), cur = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i+1);
    const pages: (number|'...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2,cur-1); i <= Math.min(total-1,cur+1); i++) pages.push(i);
    if (cur < total-2) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  });

  priceLeft  = computed(() => {
    const r = this.absoluteMax()-this.absoluteMin();
    return r === 0 ? 0 : ((this.minPrice()-this.absoluteMin())/r)*100;
  });
  priceWidth = computed(() => {
    const r = this.absoluteMax()-this.absoluteMin();
    return r === 0 ? 100 : ((this.maxPrice()-this.minPrice())/r)*100;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit() { this.loadProducts(); }

  loadProducts() {
    this.loading.set(true);
    this.svc.getProducts().subscribe({
      next: (data) => {
        this.allProducts.set(data);
        const prices = data.map((p:any) => parseFloat(p.price)).filter((n:number) => !isNaN(n));
        if (prices.length) {
          const mn = Math.floor(Math.min(...prices)), mx = Math.ceil(Math.max(...prices));
          this.absoluteMin.set(mn); this.absoluteMax.set(mx);
          this.minPrice.set(mn);    this.maxPrice.set(mx);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los productos.');
        this.loading.set(false);
      },
    });
  }

  // ── CRUD actions ──────────────────────────────────────────────────────
  openCreateModal() {
    this.productForm.reset({ title:'', vendor:'', product_type:'', price:'', sku:'', body_html:'' });
    this.editingProduct.set(null);
    this.modalMode.set('create');
    this.crudError.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(product: any) {
    this.productForm.reset({
      title:        product.title ?? '',
      vendor:       product.vendor ?? '',
      product_type: product.product_type ?? '',
      price:        String(product.price ?? ''),
      sku:          product.sku ?? '',
      body_html:    '',
    });
    this.editingProduct.set(product);
    this.modalMode.set('edit');
    this.crudError.set(null);
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); this.saving.set(false); }

  saveProduct() {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); return; }
    this.saving.set(true);
    this.crudError.set(null);
    const form = this.productForm.value as any;
    const mode = this.modalMode();

    const obs = mode === 'create'
      ? this.svc.createProduct(form)
      : this.svc.updateProduct(
          this.editingProduct()!.product_id,
          form,
          this.editingProduct()!._variant_id
        );

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadProducts();
      },
      error: (err) => {
        this.crudError.set(err?.error?.errors ?? 'Error al guardar el producto.');
        this.saving.set(false);
      },
    });
  }

  confirmDelete(product: any) { this.deleteTarget.set(product); }
  cancelDelete()              { this.deleteTarget.set(null); }

  doDelete() {
    const p = this.deleteTarget();
    if (!p) return;
    this.deleting.set(true);
    this.svc.deleteProduct(p.product_id).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.loadProducts();
      },
      error: (err) => {
        this.crudError.set(err?.error?.errors ?? 'Error al eliminar.');
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────
  getRating(idx: number)  { return this.RATINGS[idx % this.RATINGS.length]; }
  getCardBg(idx: number)  { return this.BG_COLORS[idx % this.BG_COLORS.length]; }
  hasSale(idx: number)    { return this.SALE_FLAGS[idx % this.SALE_FLAGS.length]; }
  getDiscount(idx: number){ return [20,30,40][Math.floor(idx/3) % 3]; }

  originalPrice(price: string, pct: number) {
    return Math.round(parseFloat(price)/(1-pct/100)).toString();
  }

  getStars(rating: number): string[] {
    return Array.from({ length: 5 }, (_,i) =>
      rating >= i+1 ? 'full' : rating >= i+0.5 ? 'half' : 'empty'
    );
  }

  getImageUrl(product: any): string | null {
    return product.image_src ?? product.image ?? product.featured_image ?? null;
  }

  isCurrentPage(page: number | string) {
    return typeof page === 'number' && this.currentPage() === page;
  }

  toggleColor(hex: string) {
    this.selectedColors.update(c => c.includes(hex) ? c.filter(x=>x!==hex) : [...c,hex]);
  }
  toggleSize(s: string) {
    this.selectedSizes.update(arr => arr.includes(s) ? arr.filter(x=>x!==s) : [...arr,s]);
  }
  setCategory(cat: string) { this.selectedCategory.update(c=>c===cat?null:cat); this.currentPage.set(1); }
  setSort(val: string)     { this.sortBy.set(val); this.sortOpen.set(false); this.currentPage.set(1); }

  setPage(page: number | '...') {
    if (typeof page === 'number') {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(e: Event)    { this.search.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onMinChange(e: Event) { const v=parseInt((e.target as HTMLInputElement).value); if(v<this.maxPrice()) this.minPrice.set(v); }
  onMaxChange(e: Event) { const v=parseInt((e.target as HTMLInputElement).value); if(v>this.minPrice()) this.maxPrice.set(v); }

  // Form field getters para errores
  get f() { return this.productForm.controls; }
}
