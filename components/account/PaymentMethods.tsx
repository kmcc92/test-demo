"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  readCards,
  addCard,
  removeCard,
  detectCardType,
  type SavedCard,
} from "@/lib/payment-storage";
import GoldButton from "@/components/ui/GoldButton";

interface PaymentMethodsProps {
  email: string;
}

const CARD_LABEL: Record<SavedCard["cardType"], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  other: "Card",
};

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})(?=.)/g, "$1 ");
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const INPUT_CLASS =
  "w-full h-11 px-4 border border-[var(--border)] bg-transparent font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors";

const LABEL_CLASS =
  "block text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1.5";

export default function PaymentMethods({ email }: PaymentMethodsProps) {
  const reduced = useReducedMotion();
  const formId = useId();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setCards(readCards(email));
    setLoaded(true);
  }, [email]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (digits.length < 13) { setFormError("Enter a valid card number."); return; }
    if (!name.trim()) { setFormError("Name on card is required."); return; }
    if (expiry.replace(/\D/g, "").length !== 4) { setFormError("Enter expiry as MM/YY."); return; }
    const cvvClean = cvv.replace(/\D/g, "");
    if (cvvClean.length < 3) { setFormError("Enter a valid CVV."); return; }

    const card: SavedCard = {
      id: `card-${Date.now()}`,
      lastFour: digits.slice(-4),
      cardType: detectCardType(digits),
      nameOnCard: name.trim(),
      expiry,
      addedAt: new Date().toISOString(),
    };

    addCard(email, card);
    setCards(readCards(email));
    setNumber(""); setName(""); setExpiry(""); setCvv(""); setFormError("");
    setShowForm(false);
  }

  function handleDelete(id: string) {
    removeCard(email, id);
    setCards(readCards(email));
  }

  if (!loaded) return null;

  return (
    <div>
      {/* Saved cards list */}
      {cards.length > 0 && (
        <div className="border border-[var(--border)] mb-6">
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={reduced ? {} : { opacity: 0, height: 0 }}
                animate={reduced ? {} : { opacity: 1, height: "auto" }}
                exit={reduced ? {} : { opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className={`flex items-center justify-between px-6 py-4 ${
                  i < cards.length - 1 ? "border-b border-[var(--border)]" : ""
                }`}
              >
                <div className="flex items-center gap-5">
                  <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] w-20">
                    {CARD_LABEL[card.cardType]}
                  </span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
                    •••• {card.lastFour}
                  </span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-muted)]">
                    {card.expiry}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(card.id)}
                  className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-red-400 transition-colors duration-200"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {cards.length === 0 && !showForm && (
        <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-6">
          No payment methods saved.
        </p>
      )}

      {/* Add card form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            key="card-form"
            initial={reduced ? {} : { opacity: 0, y: -8 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            exit={reduced ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleAdd}
            noValidate
            className="border border-[var(--border)] p-6 mb-6"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor={`${formId}-num`} className={LABEL_CLASS}>
                  Card Number
                </label>
                <input
                  id={`${formId}-num`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={number}
                  onChange={(e) => { setNumber(formatCardNumber(e.target.value)); setFormError(""); }}
                  placeholder="0000 0000 0000 0000"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-name`} className={LABEL_CLASS}>
                  Name on Card
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  autoComplete="cc-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormError(""); }}
                  placeholder="Full name"
                  className={INPUT_CLASS.replace("var(--font-ibm-mono)", "var(--font-dm-sans)")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${formId}-exp`} className={LABEL_CLASS}>
                    Expiry
                  </label>
                  <input
                    id={`${formId}-exp`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => { setExpiry(formatExpiry(e.target.value)); setFormError(""); }}
                    placeholder="MM/YY"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-cvv`} className={LABEL_CLASS}>
                    CVV
                  </label>
                  <input
                    id={`${formId}-cvv`}
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={(e) => { setCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); setFormError(""); }}
                    placeholder="•••"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-[11px] text-red-400 font-[family-name:var(--font-dm-sans)]">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <GoldButton type="submit" variant="primary" size="sm">
                  Save Card
                </GoldButton>
                <GoldButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowForm(false); setFormError(""); }}
                >
                  Cancel
                </GoldButton>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!showForm && (
        <GoldButton variant="outline" size="sm" onClick={() => setShowForm(true)}>
          Add Payment Method
        </GoldButton>
      )}
    </div>
  );
}
