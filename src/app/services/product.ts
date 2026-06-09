import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductForm {
  title: string;
  vendor: string;
  product_type: string;
  price: string;
  sku: string;
  body_html?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  private readonly shopifyBase =
    `${environment.shopifyProxyBase}/admin/api/${environment.shopifyApiVersion}`;

  /** Lista productos desde la tienda Shopify */
  getProducts(): Observable<any[]> {
    return this.http
      .get<any>(`${this.shopifyBase}/products.json?limit=250`)
      .pipe(map(r => (r.products as any[]).map(p => this.flattenProduct(p))));
  }

  /** Crea un producto en Shopify */
  createProduct(form: ProductForm): Observable<any> {
    const body = {
      product: {
        title: form.title,
        vendor: form.vendor,
        product_type: form.product_type,
        body_html: form.body_html ?? '',
        variants: [{ price: form.price, sku: form.sku }],
      },
    };
    return this.http
      .post<any>(`${this.shopifyBase}/products.json`, body)
      .pipe(map(r => this.flattenProduct(r.product)));
  }

  /** Actualiza un producto en Shopify */
  updateProduct(productId: number, form: ProductForm, variantId?: number): Observable<any> {
    const doPut = (vid: number | undefined) => {
      const body = {
        product: {
          id: productId,
          title: form.title,
          vendor: form.vendor,
          product_type: form.product_type,
          body_html: form.body_html ?? '',
          variants: [{ price: form.price, sku: form.sku, ...(vid ? { id: vid } : {}) }],
        },
      };
      return this.http
        .put<any>(`${this.shopifyBase}/products/${productId}.json`, body)
        .pipe(map(r => this.flattenProduct(r.product)));
    };

    if (variantId) return doPut(variantId);

    // Products loaded from the read API don't carry _variant_id — fetch it first
    return this.http
      .get<any>(`${this.shopifyBase}/products/${productId}.json`)
      .pipe(switchMap(r => doPut(r.product?.variants?.[0]?.id)));
  }

  /** Elimina un producto de Shopify */
  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.shopifyBase}/products/${productId}.json`);
  }

  /** Mapea la respuesta anidada de Shopify al formato plano que usa la UI */
  private flattenProduct(p: any): any {
    const variant = p.variants?.[0] ?? {};
    return {
      product_id: p.id,
      title: p.title,
      vendor: p.vendor,
      product_type: p.product_type,
      price: variant.price ?? '0.00',
      sku: variant.sku ?? '',
      inventory_quantity: variant.inventory_quantity ?? 0,
      image_src: p.images?.[0]?.src ?? null,
      _variant_id: variant.id,
    };
  }
}
