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
        aria-label="Close cart"
        className="px-2 text-sm"
      >
        Remove
      </Button>
      <p aria-live="polite" className="sr-only" role="status">
        {message}
      </p>
    </form>
  );
}
