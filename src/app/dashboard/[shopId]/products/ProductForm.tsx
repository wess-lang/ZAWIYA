"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, type Category, type Product } from "@/lib/types";
import { Input, Textarea, Select, FormError } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function ProductForm({
  shopId,
  product,
}: {
  shopId: string;
  product?: Product;
}) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<Category>(product?.category ?? "sofa");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "1");
  const [dimensions, setDimensions] = useState(product?.dimensions ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [styleTags, setStyleTags] = useState(product?.styleTags.join(", ") ?? "");
  const [colorTags, setColorTags] = useState(product?.colorTags.join(", ") ?? "");
  const [roomTags, setRoomTags] = useState(product?.roomTags.join(", ") ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function splitTags(s: string) {
    return s.split(",").map((t) => t.trim()).filter(Boolean);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      shopId,
      name,
      category,
      price: Number(price),
      stock: Number(stock),
      dimensions,
      description,
      styleTags: splitTags(styleTags),
      colorTags: splitTags(colorTags),
      roomTags: splitTags(roomTags),
      image: image || undefined,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/products/${product!.id}` : "/api/products",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save product.");
        return;
      }
      router.push(`/dashboard/${shopId}/products`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        required
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Input
          required
          type="number"
          min={0}
          step="0.01"
          placeholder="Price (JOD)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          required
          type="number"
          min={0}
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <Input
          placeholder="Dimensions (e.g. 200 x 90 x 80 cm)"
          value={dimensions}
          onChange={(e) => setDimensions(e.target.value)}
        />
      </div>

      <Textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <Input
        placeholder="Style tags, comma separated (e.g. modern, minimalist)"
        value={styleTags}
        onChange={(e) => setStyleTags(e.target.value)}
      />
      <Input
        placeholder="Colour tags, comma separated (e.g. grey, oak)"
        value={colorTags}
        onChange={(e) => setColorTags(e.target.value)}
      />
      <Input
        placeholder="Room tags, comma separated (e.g. living room)"
        value={roomTags}
        onChange={(e) => setRoomTags(e.target.value)}
      />
      <Input
        placeholder="Image URL (optional - a placeholder is used if left blank)"
        value={image}
        onChange={(e) => setImage(e.target.value)}
      />

      <FormError>{error}</FormError>

      <Button type="submit" disabled={loading} className="mt-2 self-start">
        {loading ? "Saving..." : isEdit ? "Save changes" : "Add product"}
      </Button>
    </form>
  );
}
