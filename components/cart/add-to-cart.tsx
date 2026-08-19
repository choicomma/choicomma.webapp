"use client";

import { PlusCircleIcon } from "lucide-react";
import { addItem } from "@/components/cart/actions";
import { Product, ProductVariant } from "@/lib/sfcc/types";
import { useActionState, useMemo } from "react";
import { useCart } from "./cart-context";
import { Button, ButtonProps } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { useParams, useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader } from "../ui/loader";

interface AddToCartProps extends ButtonProps {
  product: Product;
  iconOnly?: boolean;
  icon?: ReactNode;
}

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

export function AddToCart({
  product,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartProps) {
  const { variants, availableForSale } = product;
  const { addCartItem, mode } = useCart();
  const [message, formAction, isLoading] = useActionState(addItem, null);
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  const isTargetingProduct =
    pathname.handle === product.id || searchParams.get("pid") === product.id;

  const resolvedVariant = useMemo(() => {
    // If there are no variants, return the base product variant
    if (hasNoVariants) return getBaseProductVariant(product);
    // If the current selection is not targeting the product, and there is no default variant, return undefined
    if (!isTargetingProduct && !defaultVariantId) return undefined;
    // In any other case, resolve the variant
    return variants.find((variant) => variant.id === selectedVariantId);
  }, [
    hasNoVariants,
    product,
    isTargetingProduct,
    defaultVariantId,
    variants,
    selectedVariantId,
  ]);

  const getButtonText = () => {
    if (!availableForSale) return "Out Of Stock";
    if (!resolvedVariant) return "Select an option";
    return "Add To Cart";
  };

  const isDisabled = !availableForSale || !resolvedVariant || isLoading;

  const addItemAction = async (formData: FormData) => {
    if (resolvedVariant) {
      addCartItem(resolvedVariant, product);
    }
    return formAction(resolvedVariant?.id);
  };

  // Map button sizes to loader sizes
  const getLoaderSize = () => {
    const buttonSize = buttonProps.size;
    if (
      buttonSize === "sm" ||
      buttonSize === "icon-sm" ||
      buttonSize === "icon"
    )
      return "sm";
    if (buttonSize === "icon-lg") return "default";
    if (buttonSize === "lg") return "lg";
    return "default"; // default or undefined
  };

  const buttonElement = (
    <Button
      type="submit"
      aria-label={!resolvedVariant ? "Please select an option" : "Add to cart"}
      disabled={isDisabled}
      className={
        iconOnly
          ? undefined
          : "w-full relative flex items-center justify-between"
      }
      {...buttonProps}
    >
      <AnimatePresence initial={false} mode="wait">
        {iconOnly ? (
          <motion.div
            key={isLoading ? "loading" : "icon"}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isLoading ? (
              <Loader size={getLoaderSize()} />
            ) : (
              <span className="inline-block">{icon}</span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={isLoading ? "loading" : getButtonText()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full flex items-center justify-center"
          >
            {isLoading ? (
              <Loader size={getLoaderSize()} />
            ) : (
              <div className="w-full flex items-center justify-between">
                <span>{getButtonText()}</span>
                <PlusCircleIcon />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );

  return (
    <form
      action={async () => {
        if (resolvedVariant) {
          addCartItem(resolvedVariant, product);
          addItemAction();
        }
      }}
      className={className}
    >
      {mode === "mock" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">{buttonElement}</div>
          </TooltipTrigger>
          <TooltipContent portal={false} className="pointer-events-none">
            <span className="relative z-10">
              You need to complete SFCC setup
            </span>
          </TooltipContent>
        </Tooltip>
      ) : (
        buttonElement
      )}
      <p aria-live="polite" className="sr-only" role="status">
        {message}
      </p>
    </form>
  );
}
