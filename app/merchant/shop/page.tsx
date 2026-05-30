"use client";

import { useState, useEffect } from "react";
import AddProductForm from "@/components/merchant/AddProductForm";
import {
  getMerchantProducts,
  updateMerchantProduct,
  deleteMerchantProduct,
  type MerchantProduct,
} from "@/lib/merchant-storage";
import { formatPrice } from "@/lib/utils";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_SOLID = "#e0e0e0";
const RED = "#c0392b";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${BORDER_SOLID}`,
  background: "#fff",
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 12,
  color: BLACK,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontFamily: "var(--font-dm-sans), sans-serif",
  color: MUTED,
  marginBottom: 4,
};

type EditForm = {
  name: string;
  description: string;
  price: string;
  image: string;
};

export default function MerchantShopPage() {
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    description: "",
    price: "",
    image: "",
  });

  function refresh() {
    setProducts(getMerchantProducts());
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(p: MerchantProduct) {
    setEditingId(p.id);
    setConfirmDeleteId(null);
    setEditForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      image: p.image,
    });
  }

  function saveEdit(id: string) {
    const parsedPrice = parseInt(editForm.price, 10);
    updateMerchantProduct(id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      image: editForm.image.trim(),
    });
    setEditingId(null);
    refresh();
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function confirmDelete(id: string) {
    deleteMerchantProduct(id);
    setConfirmDeleteId(null);
    refresh();
  }

  const reversed = [...products].reverse();

  return (
    <div className="flex flex-1">
      {/* Left: add form */}
      <div
        style={{ width: 420, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}
        className="px-10 py-10"
      >
        <p
          style={{ color: MUTED, marginBottom: 8 }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
        >
          Merchant Portal
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Add New Product
        </h2>
        <AddProductForm onSuccess={refresh} />
      </div>

      {/* Right: catalog with CRUD */}
      <div className="flex-1 px-10 py-10 overflow-y-auto">
        <p
          style={{ color: MUTED, marginBottom: 8 }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
        >
          Merchant Catalog
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Products
        </h2>

        {products.length === 0 ? (
          <div
            style={{ border: `1px solid ${BORDER}`, padding: "48px 32px", textAlign: "center" }}
          >
            <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[#8a8a8a] tracking-wide">
              No products added yet
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reversed.map((product) => {
              const isEditing = editingId === product.id;
              const isConfirmingDelete = confirmDeleteId === product.id;

              if (isEditing) {
                return (
                  <div
                    key={product.id}
                    style={{
                      border: `1px solid ${GOLD}`,
                      padding: "20px 24px",
                      background: "rgba(201,168,76,0.02)",
                    }}
                  >
                    {/* Edit mode header */}
                    <p
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        color: GOLD,
                        marginBottom: 16,
                      }}
                    >
                      Editing
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Name */}
                      <div>
                        <label style={labelStyle}>Product Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                          value={editForm.description}
                          maxLength={300}
                          rows={3}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label style={labelStyle}>Price (USD)</label>
                        <input
                          type="number"
                          value={editForm.price}
                          min={1}
                          step={1}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>

                      {/* Image */}
                      <div>
                        <label style={labelStyle}>Image URL</label>
                        <input
                          type="text"
                          value={editForm.image}
                          onChange={(e) => setEditForm((f) => ({ ...f, image: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>

                      {/* Read-only: type */}
                      <div>
                        <label style={labelStyle}>
                          Type{" "}
                          <span style={{ opacity: 0.5, textTransform: "none" }}>
                            — cannot be changed
                          </span>
                        </label>
                        <p
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            color: product.type === "exclusive" ? GOLD : MUTED,
                            padding: "8px 10px",
                            border: `1px solid ${BORDER_SOLID}`,
                            background: "#fafafa",
                          }}
                        >
                          {product.type === "exclusive" ? "Exclusive" : "Shop"}
                        </p>
                      </div>

                      {/* Read-only: certificateId */}
                      {product.certificateId && (
                        <div>
                          <label style={labelStyle}>
                            Certificate ID{" "}
                            <span style={{ opacity: 0.5, textTransform: "none" }}>
                              — cannot be changed
                            </span>
                          </label>
                          <p
                            style={{
                              fontFamily: "var(--font-ibm-mono), monospace",
                              fontSize: 10,
                              color: GOLD,
                              padding: "8px 10px",
                              border: `1px solid ${BORDER_SOLID}`,
                              background: "#fafafa",
                              wordBreak: "break-all",
                            }}
                          >
                            {product.certificateId}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        <button
                          onClick={() => saveEdit(product.id)}
                          style={{
                            padding: "9px 20px",
                            background: BLACK,
                            border: "none",
                            color: "#fff",
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            fontSize: 9,
                            letterSpacing: "0.25em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: "9px 20px",
                            background: "#fff",
                            border: `1px solid ${BORDER_SOLID}`,
                            color: MUTED,
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            fontSize: 9,
                            letterSpacing: "0.25em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // VIEW MODE
              const date = new Date(product.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={product.id}
                  style={{
                    border: `1px solid ${BORDER_SOLID}`,
                    padding: "18px 24px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Thumbnail */}
                    {product.image && (
                      <div
                        style={{
                          width: 48,
                          height: 60,
                          flexShrink: 0,
                          background: "#f0ede8",
                          overflow: "hidden",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <p
                          style={{
                            fontFamily: "var(--font-cormorant), serif",
                            fontSize: 17,
                            fontWeight: 300,
                            color: BLACK,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.name}
                        </p>
                        <span
                          style={{
                            fontSize: 8,
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            color: product.type === "exclusive" ? GOLD : MUTED,
                            border: `1px solid ${product.type === "exclusive" ? "rgba(201,168,76,0.4)" : BORDER_SOLID}`,
                            padding: "2px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {product.type === "exclusive" ? "Exclusive" : "Shop"}
                        </span>
                      </div>

                      {product.description && (
                        <p
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            color: MUTED,
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.description}
                        </p>
                      )}

                      {product.certificateId && (
                        <p
                          style={{
                            fontFamily: "var(--font-ibm-mono), monospace",
                            fontSize: 10,
                            color: GOLD,
                            marginBottom: 4,
                          }}
                        >
                          {product.certificateId}
                        </p>
                      )}

                      <p
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          color: MUTED,
                        }}
                      >
                        {date}
                      </p>
                    </div>

                    {/* Price + actions */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-mono), monospace",
                          fontSize: 13,
                          color: BLACK,
                        }}
                      >
                        {formatPrice(product.price)}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => startEdit(product)}
                          style={{
                            padding: "5px 12px",
                            background: "#fff",
                            border: `1px solid ${BORDER_SOLID}`,
                            color: MUTED,
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            fontSize: 8,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDeleteId(isConfirmingDelete ? null : product.id)
                          }
                          style={{
                            padding: "5px 12px",
                            background: "#fff",
                            border: `1px solid ${isConfirmingDelete ? RED : BORDER_SOLID}`,
                            color: isConfirmingDelete ? RED : MUTED,
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            fontSize: 8,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {isConfirmingDelete && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: `1px solid ${BORDER_SOLID}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          color: RED,
                          flex: 1,
                        }}
                      >
                        Remove this product from your catalog?
                      </p>
                      <button
                        onClick={() => confirmDelete(product.id)}
                        style={{
                          padding: "6px 14px",
                          background: RED,
                          border: "none",
                          color: "#fff",
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: "6px 14px",
                          background: "#fff",
                          border: `1px solid ${BORDER_SOLID}`,
                          color: MUTED,
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
