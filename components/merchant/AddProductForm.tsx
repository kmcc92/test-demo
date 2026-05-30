"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  addMerchantProduct,
  generateRandomString,
  type MerchantProduct,
} from "@/lib/merchant-storage";

interface AddProductFormProps {
  onSuccess?: () => void;
  lockedType?: "shop" | "exclusive";
}

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "#e0e0e0";
const RED = "#c0392b";

function FieldLabel({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 9,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: error ? RED : MUTED,
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      style={{
        marginTop: 4,
        fontSize: 10,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: RED,
      }}
    >
      {message}
    </p>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${hasError ? RED : BORDER}`,
  background: "#fff",
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 13,
  color: BLACK,
  outline: "none",
  boxSizing: "border-box",
});

export default function AddProductForm({ onSuccess, lockedType }: AddProductFormProps) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [type, setType] = useState<"shop" | "exclusive">(lockedType ?? "shop");
  const [errors, setErrors] = useState<Partial<Record<"name" | "description" | "price" | "image", string>>>({});
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Required";
    if (!description.trim()) next.description = "Required";
    if (!price.trim()) {
      next.price = "Required";
    } else {
      const n = Number(price);
      if (!Number.isInteger(n) || n <= 0) next.price = "Must be a positive integer";
    }
    if (!image.trim()) {
      next.image = "Required";
    } else if (!image.startsWith("https://")) {
      next.image = "Must start with https://";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;

    const now = Date.now();
    const product: MerchantProduct = {
      id: `merchant-${now}-${generateRandomString(6)}`,
      type,
      name: name.trim(),
      description: description.trim(),
      price: parseInt(price, 10),
      image: image.trim(),
      certificateId:
        type === "exclusive"
          ? `CERT-${now}-${generateRandomString(6)}`
          : undefined,
      createdAt: new Date().toISOString(),
      merchantEmail: user.email,
    };

    addMerchantProduct(product);
    onSuccess?.();
    setSuccess(true);
    setName("");
    setDescription("");
    setPrice("");
    setImage("");
    setType("shop");
    setErrors({});
    setTimeout(() => setSuccess(false), 3000);
  }

  const certPreview =
    type === "exclusive"
      ? `CERT-${Date.now()}-${generateRandomString(6)}`
      : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Name */}
        <div>
          <FieldLabel error={errors.name}>Product Name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
            style={inputStyle(!!errors.name)}
            placeholder="e.g. Leather Jacket"
          />
          <FieldError message={errors.name} />
        </div>

        {/* Description */}
        <div>
          <FieldLabel error={errors.description}>
            Description{" "}
            <span style={{ opacity: 0.5, textTransform: "none", fontSize: 9 }}>
              ({description.length}/300)
            </span>
          </FieldLabel>
          <textarea
            value={description}
            maxLength={300}
            rows={4}
            onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((p) => ({ ...p, description: undefined })); }}
            style={{ ...inputStyle(!!errors.description), resize: "vertical", lineHeight: 1.6 }}
            placeholder="Describe the product…"
          />
          <FieldError message={errors.description} />
        </div>

        {/* Price */}
        <div>
          <FieldLabel error={errors.price}>Price (USD)</FieldLabel>
          <input
            type="number"
            value={price}
            min={1}
            step={1}
            onChange={(e) => { setPrice(e.target.value); if (errors.price) setErrors((p) => ({ ...p, price: undefined })); }}
            style={inputStyle(!!errors.price)}
            placeholder="e.g. 850"
          />
          <FieldError message={errors.price} />
        </div>

        {/* Image URL */}
        <div>
          <FieldLabel error={errors.image}>Image URL</FieldLabel>
          <input
            type="text"
            value={image}
            onChange={(e) => { setImage(e.target.value); if (errors.image) setErrors((p) => ({ ...p, image: undefined })); }}
            style={inputStyle(!!errors.image)}
            placeholder="https://…"
          />
          <FieldError message={errors.image} />
        </div>

        {/* Type selector */}
        <div>
          <FieldLabel>Product Type</FieldLabel>
          {lockedType ? (
            <div
              style={{
                padding: "10px 14px",
                border: `1px solid ${lockedType === "exclusive" ? "rgba(201,168,76,0.35)" : BORDER}`,
                background: lockedType === "exclusive" ? "rgba(201,168,76,0.03)" : "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: lockedType === "exclusive" ? GOLD : MUTED }}>
                {lockedType === "exclusive" ? "Exclusive Piece" : "Shop Product"}
              </span>
              <span style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                Locked
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              {(["shop", "exclusive"] as const).map((t) => {
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      border: `1px solid ${selected ? GOLD : BORDER}`,
                      background: selected ? "rgba(201,168,76,0.05)" : "#fff",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: selected ? BLACK : MUTED,
                      cursor: "pointer",
                      transition: "border-color 0.2s, background 0.2s, color 0.2s",
                    }}
                  >
                    {t === "shop" ? "Shop Product" : "Exclusive Piece"}
                  </button>
                );
              })}
            </div>
          )}

          {/* Certificate preview */}
          {type === "exclusive" && certPreview && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                border: `1px solid rgba(201,168,76,0.35)`,
                background: "rgba(201,168,76,0.03)",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: MUTED,
                  marginBottom: 4,
                }}
              >
                Certificate preview
              </p>
              <p
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace",
                  fontSize: 11,
                  color: GOLD,
                }}
              >
                Certificate will be generated: {certPreview}
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ paddingTop: 4 }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "13px 24px",
              background: GOLD,
              border: "none",
              color: BLACK,
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Add Product
          </button>
        </div>

        {/* Success message */}
        {success && (
          <p
            style={{
              fontSize: 11,
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: GOLD,
              letterSpacing: "0.1em",
              textAlign: "center",
            }}
          >
            Product added successfully
          </p>
        )}
      </div>
    </form>
  );
}
