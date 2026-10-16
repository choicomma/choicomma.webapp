"use client";

import { removeItem } from "@/components/cart/actions";
import { CartItem } from "@/lib/sfcc/types";
import { useActionState } from "react";
import { Button } from "../ui/button";

export function DeleteItemButton({
  item,
  optimisticUpdate,
}: {
  item: CartItem;
  optimisticUpdate: any;
}) {
  const [message, formAction] = useActionState(removeItem, null);
  const merchandiseId = item.merchandise.id;
  const removeItemAction = formAction.bind(null, merchandiseId);

  return (
    <form
      className="-mr-1 -mb-1 opacity-70"
      action={async () => {
        optimisticUpdate(merchandiseId, "delete");
        removeItemAction();
      }}
    >
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        aria-label="상품 삭제"
        className="px-2 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
      >
        삭제
      </Button>
      <p aria-live="polite" className="sr-only" role="status">
        {message}
      </p>
    </form>
  );
}
