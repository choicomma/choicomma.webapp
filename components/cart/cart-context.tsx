"use client";

import { Cart, CartItem, Product, ProductVariant, SFCCMode } from "@/lib/sfcc/types";
import React, {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UpdateType = "plus" | "minus" | "delete";

type CartAction =
  | {
      type: "UPDATE_ITEM";
      payload: { merchandiseId: string; updateType: UpdateType };
    }
  | {
      type: "ADD_ITEM";
      payload: { variant: ProductVariant; product: Product; quantity?: number };
    };

type CartContextValue = {
  cart: Cart;
  updateCartItem: (merchandiseId: string, updateType: UpdateType) => void;
  addCartItem: (variant: ProductVariant, product: Product, quantity?: number) => void;
  mode: SFCCMode;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function calculateItemCost(quantity: number, price: string): string {
  return (Number(price) * quantity).toString();
}

function updateCartItem(
  item: CartItem,
  updateType: UpdateType
): CartItem | null {
  if (updateType === "delete") return null;

  const newQuantity =
    updateType === "plus" ? item.quantity + 1 : item.quantity - 1;
  if (newQuantity === 0) return null;

  const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
  const newTotalAmount = calculateItemCost(
    newQuantity,
    singleItemAmount.toString()
  );

  return {
    ...item,
    quantity: newQuantity,
    cost: {
      ...item.cost,
      totalAmount: {
        ...item.cost.totalAmount,
        amount: newTotalAmount,
      },
    },
  };
}

function createOrUpdateCartItem(
  existingItem: CartItem | undefined,
  variant: ProductVariant,
  product: Product,
  addQuantity: number = 1
): CartItem {
  const quantity = existingItem ? existingItem.quantity + addQuantity : addQuantity;
  const totalAmount = calculateItemCost(quantity, variant.price.amount);

  return {
    id: existingItem?.id || `item-${variant.id}-${Date.now()}`,
    quantity,
    cost: {
      totalAmount: {
        amount: totalAmount,
        currencyCode: variant.price.currencyCode || "KRW",
      },
    },
    merchandise: {
      id: variant.id,
      title: variant.title,
      selectedOptions: variant.selectedOptions,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        featuredImage: product.featuredImage,
        images: product.images,
        variationValues: product.variationValues,
        description: product.description,
      },
    },
  };
}

function updateCartTotals(
  lines: CartItem[]
): Pick<Cart, "totalQuantity" | "cost"> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = lines.reduce(
    (sum, item) => sum + Number(item.cost.totalAmount.amount),
    0
  );
  const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? "KRW";

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
  };
}

function createEmptyCart(): Cart {
  return {
    id: undefined,
    checkoutUrl: "",
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "KRW" },
      totalAmount: { amount: "0", currencyCode: "KRW" },
      totalTaxAmount: { amount: "0", currencyCode: "KRW" },
    },
  };
}

function cartReducer(state: Cart | undefined, action: CartAction): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case "UPDATE_ITEM": {
      const { merchandiseId, updateType } = action.payload;
      const updatedLines = currentCart.lines
        .map((item) =>
          item.merchandise.id === merchandiseId
            ? updateCartItem(item, updateType)
            : item
        )
        .filter(Boolean) as CartItem[];

      if (updatedLines.length === 0) {
        return {
          ...currentCart,
          lines: [],
          totalQuantity: 0,
          cost: {
            ...currentCart.cost,
            totalAmount: { ...currentCart.cost.totalAmount, amount: "0" },
          },
        };
      }

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    case "ADD_ITEM": {
      const { variant, product, quantity = 1 } = action.payload;
      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === variant.id
      );
      const updatedItem = createOrUpdateCartItem(
        existingItem,
        variant,
        product,
        quantity
      );

      const updatedLines = existingItem
        ? currentCart.lines.map((item) =>
            item.merchandise.id === variant.id ? updatedItem : item
          )
        : [...currentCart.lines, updatedItem];

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    default:
      return currentCart;
  }
}

export function CartProvider({
  children,
  cartPromise,
  mode,
}: {
  children: React.ReactNode;
  cartPromise: Promise<Cart | null>;
  mode: SFCCMode;
}) {
  const initialCartFromPromise = cartPromise ? use(cartPromise) : null;

  const [cartState, setCartState] = useState<Cart>(() => {
    return initialCartFromPromise || createEmptyCart();
  });

  // Hydrate from localStorage on client load
  useEffect(() => {
    const saved = localStorage.getItem("choicomma_cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.lines)) {
          setCartState(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const updateCartItemCB = useCallback(
    (merchandiseId: string, updateType: UpdateType) => {
      setCartState((prevCart) => {
        const newCart = cartReducer(prevCart, {
          type: "UPDATE_ITEM",
          payload: { merchandiseId, updateType },
        });
        localStorage.setItem("choicomma_cart", JSON.stringify(newCart));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("choicomma_cart_updated"));
        }, 0);
        return newCart;
      });
    },
    []
  );

  const addCartItemCB = useCallback(
    (variant: ProductVariant, product: Product, quantity: number = 1) => {
      setCartState((prevCart) => {
        const newCart = cartReducer(prevCart, {
          type: "ADD_ITEM",
          payload: { variant, product, quantity },
        });
        localStorage.setItem("choicomma_cart", JSON.stringify(newCart));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("choicomma_cart_updated"));
        }, 0);
        return newCart;
      });
    },
    []
  );

  useEffect(() => {
    const syncCartFromStorage = () => {
      const saved = localStorage.getItem("choicomma_cart");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.lines)) {
            setCartState(parsed);
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", syncCartFromStorage);
    window.addEventListener("choicomma_cart_updated", syncCartFromStorage);
    return () => {
      window.removeEventListener("storage", syncCartFromStorage);
      window.removeEventListener("choicomma_cart_updated", syncCartFromStorage);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      cart: cartState,
      updateCartItem: updateCartItemCB,
      addCartItem: addCartItemCB,
      mode,
    }),
    [cartState, updateCartItemCB, addCartItemCB, mode]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
