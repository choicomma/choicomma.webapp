/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import {
  helpers,
  ShopperBaskets,
  ShopperBasketsTypes,
  ShopperLogin,
  ShopperOrders,
  ShopperOrdersTypes,
  ShopperProducts,
  ShopperSearch,
} from "commerce-sdk-isomorphic";
import { TAGS } from "@/lib/constants";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
  revalidateTag,
} from "next/cache";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { defaultSort, storeCatalog } from "./constants";
import {
  reshapeBasket,
  reshapeCategories,
  reshapeCategory,
  reshapeOrder,
  reshapeProduct,
  reshapeProductItem,
  reshapeProducts,
  reshapeShippingMethods,
} from "./reshape";
import { ensureSDKResponseError } from "./type-guards";
import { Cart, CartItem, Product } from "./types";
import { getCardType, maskCardNumber } from "./utils";
import { mockProducts } from "./mock/products";
import { mockCollections } from "./mock/collections";

const FORCE_MOCK_DATA = false;
const USE_MOCK_DATA =
  FORCE_MOCK_DATA ||
  !Boolean(process.env.SFCC_CLIENT_ID) ||
  !Boolean(process.env.SFCC_ORGANIZATIONID) ||
  !Boolean(process.env.SFCC_SHORTCODE) ||
  !Boolean(process.env.SFCC_SITEID);

if (USE_MOCK_DATA) {
  console.warn("--- Using mock data fallback ---");
}

const apiConfig = {
  throwOnBadResponse: true,
  parameters: {
    clientId: process.env.SFCC_CLIENT_ID || "",
    organizationId: process.env.SFCC_ORGANIZATIONID || "",
    shortCode: process.env.SFCC_SHORTCODE || "",
    siteId: process.env.SFCC_SITEID || "",
  },
};

export async function getSFCCMode() {
  "use cache";
  cacheTag(TAGS.mode);
  cacheLife("days");
  return USE_MOCK_DATA ? "mock" : "live";
}

export async function getCollections() {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");
  try {
    if (USE_MOCK_DATA) {
      return mockCollections.filter(
        (c) => c.handle !== storeCatalog.rootCategoryId && c.handle !== "top-seller"
      );
    }

    return await getSFCCCollections();
  } catch {
    return [];
  }
}

export async function getCollection(id: string) {
  "use cache";
  cacheTag(TAGS.collections, id);
  cacheLife("days");

  try {
    if (USE_MOCK_DATA) {
      return (
        mockCollections
          .filter((c) => c.handle !== storeCatalog.rootCategoryId)
          .find((c) => c.handle === id) ?? null
      );
    }

    return (await getSFCCCollection(id)) ?? null;
  } catch {
    return null;
  }
}

export async function getProduct(handle: string) {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  try {
    if (USE_MOCK_DATA) {
      let decoded = handle;
      try {
        decoded = decodeURIComponent(handle);
      } catch (e) {}
      const product = mockProducts.find(
        (p) =>
          p.handle === handle ||
          p.handle === decoded ||
          p.id === handle ||
          p.id === decoded
      );

      if (!product) {
        return null;
      }

      if (!product.tags || !Array.isArray(product.tags)) {
        (product as any).tags = [];
      }
      if (!product.seo) {
        (product as any).seo = {
          title: product.title,
          description: product.description,
        };
      }
      if (!product.currencyCode) {
        (product as any).currencyCode = product.priceRange?.minVariantPrice?.currencyCode || "KRW";
      }

      if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
        const pPrice = product.priceRange?.minVariantPrice?.amount || "0";
        const pCurr = product.priceRange?.minVariantPrice?.currencyCode || "KRW";
        const variantsList = (product.sizes || ["FREE"]).map((sz: string, idx: number) => ({
          id: `${product.id}-variant-${idx + 1}`,
          title: sz,
          availableForSale: product.availableForSale ?? true,
          selectedOptions: [{ name: "Size", value: sz }],
          price: { amount: String(pPrice), currencyCode: pCurr },
        }));
        (product as any).variants = variantsList;
      }

      return product;
    }

    return null;
  } catch {
    return null;
  }
}

export async function getCollectionProducts({
  collection: collectionHandle,
  limit = 100,
  sortKey,
}: {
  collection: string;
  limit?: number;
  sortKey?: string;
}) {
  try {
    if (USE_MOCK_DATA) {
      const collection = mockCollections.find(
        (c) => c.handle === collectionHandle
      );

      if (!collection) {
        return [];
      }

      if (collectionHandle === "top-seller" || collectionHandle === "main") {
        return mockProducts.filter((p) => (p as any).isMainFeatured === true);
      }

      if (collectionHandle === "choice" || collectionHandle === "timesale" || collectionHandle === "new" || collectionHandle === "special") {
        return mockProducts;
      }

      const categoryProducts = mockProducts.filter(
        (p) => p.categoryId === collectionHandle || ((p as any).categoryIds && (p as any).categoryIds.includes(collectionHandle))
      );

      const uniqueProducts = [
        ...new Set(categoryProducts.map((product) => product.id)),
      ]
        .map((id) => categoryProducts.find((product) => product.id === id))
        .filter(
          (product): product is NonNullable<typeof product> => product != null
        );

      return uniqueProducts;
    }

    return await getSFCCCollectionProducts({
      collection: collectionHandle,
      limit,
      sortKey,
    });
  } catch {
    return [];
  }
}

export async function getProducts({
  query,
  sortKey,
}: {
  query?: string;
  sortKey?: string;
  reverse?: boolean;
}) {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");
  return await getSFCCCollectionProducts({ query, sortKey });
}

function createEmptyMockCart(): Cart {
  return {
    id: "mock-cart-id",
    checkoutUrl: "/checkout",
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "KRW" },
      totalAmount: { amount: "0", currencyCode: "KRW" },
      totalTaxAmount: { amount: "0", currencyCode: "KRW" },
    },
  };
}

async function getMockCart(): Promise<Cart> {
  const cookieStore = await cookies();
  const rawCart = cookieStore.get("mock_cart")?.value;
  if (rawCart) {
    try {
      return JSON.parse(rawCart);
    } catch {
      // ignore
    }
  }
  return createEmptyMockCart();
}

async function saveMockCart(cart: Cart) {
  const cookieStore = await cookies();
  cookieStore.set("mock_cart", JSON.stringify(cart));
}

export async function createCart() {
  if (USE_MOCK_DATA) {
    const empty = createEmptyMockCart();
    await saveMockCart(empty);
    return empty;
  }

  try {
    let guestToken = (await cookies()).get("guest_token")?.value;

    // if there is not a guest token, get one and store it in a cookie
    if (!guestToken) {
      const tokenResponse = await getGuestUserAuthToken();
      guestToken = tokenResponse.access_token;
      if (guestToken) {
        (await cookies()).set("guest_token", guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 30,
          path: "/",
        });
      }
    }

    // get the guest config
    const config = await getGuestUserConfig(guestToken || undefined);

    // initialize the basket client
    const basketClient = new ShopperBaskets(config);

    // create an empty ShopperBaskets.Basket
    const createdBasket = await basketClient.createBasket({
      body: {},
    });

    const cartItems = await getCartItems(createdBasket);

    return reshapeBasket(createdBasket, cartItems);
  } catch {
    return createEmptyMockCart();
  }
}

export async function getCart(): Promise<Cart | null> {
  "use cache";
  cacheTag(TAGS.cart);
  cacheLife("seconds");

  if (USE_MOCK_DATA) {
    return createEmptyMockCart();
  }

  const cartId = (await cookies()).get("cartId")?.value;
  const guestToken = (await cookies()).get("guest_token")?.value;

  if (!cartId) {
    return null;
  }

  try {
    const config = await getGuestUserConfig(guestToken || undefined);
    const basketClient = new ShopperBaskets(config);

    const basket = await basketClient.getBasket({
      parameters: {
        basketId: cartId,
      },
    });

    const cartItems = await getCartItems(basket);

    return reshapeBasket(basket, cartItems);
  } catch (e) {
    const sdkError = await ensureSDKResponseError(e);
    if (sdkError) {
      return null;
    }
    throw e;
  }
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[]
) {
  if (USE_MOCK_DATA) {
    const cart = await getMockCart();
    for (const line of lines) {
      const targetProduct =
        mockProducts.find(
          (p) =>
            p.id === line.merchandiseId ||
            p.handle === line.merchandiseId ||
            p.variants.some((v) => v.id === line.merchandiseId)
        ) || mockProducts[0];

      const price = targetProduct.priceRange.minVariantPrice.amount;
      const existingIdx = cart.lines.findIndex(
        (item) =>
          item.merchandise.id === line.merchandiseId ||
          item.merchandise.product.id === targetProduct.id
      );

      if (existingIdx >= 0) {
        const existing = cart.lines[existingIdx];
        const newQty = existing.quantity + line.quantity;
        cart.lines[existingIdx] = {
          ...existing,
          quantity: newQty,
          cost: {
            totalAmount: {
              amount: (Number(price) * newQty).toString(),
              currencyCode: "KRW",
            },
          },
        };
      } else {
        cart.lines.push({
          id: `item-${Date.now()}-${line.merchandiseId}`,
          quantity: line.quantity,
          cost: {
            totalAmount: {
              amount: (Number(price) * line.quantity).toString(),
              currencyCode: "KRW",
            },
          },
          merchandise: {
            id: line.merchandiseId,
            title: targetProduct.title,
            selectedOptions: [],
            product: targetProduct,
          },
        });
      }
    }

    cart.totalQuantity = cart.lines.reduce((acc, item) => acc + item.quantity, 0);
    const totalCost = cart.lines.reduce(
      (acc, item) => acc + Number(item.cost.totalAmount.amount),
      0
    );
    cart.cost.subtotalAmount.amount = totalCost.toString();
    cart.cost.totalAmount.amount = totalCost.toString();

    await saveMockCart(cart);
    return cart;
  }

  const cartId = (await cookies()).get("cartId")?.value!;
  // get the guest token to get the correct guest cart
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    const basket = await basketClient.addItemToBasket({
      parameters: {
        basketId: cartId,
      },
      body: lines.map((line) => {
        return {
          productId: line.merchandiseId,
          quantity: line.quantity,
        };
      }),
    });

    if (!basket?.basketId) return;

    const cartItems = await getCartItems(basket);
    return reshapeBasket(basket, cartItems);
  } catch (e: any) {
    console.log(await e.response.text());
    return;
  }
}

export async function removeFromCart(lineIds: string[]) {
  if (USE_MOCK_DATA) {
    const cart = await getMockCart();
    cart.lines = cart.lines.filter(
      (item) => !lineIds.includes(item.id!) && !lineIds.includes(item.merchandise.id)
    );
    cart.totalQuantity = cart.lines.reduce((acc, item) => acc + item.quantity, 0);
    const totalCost = cart.lines.reduce(
      (acc, item) => acc + Number(item.cost.totalAmount.amount),
      0
    );
    cart.cost.subtotalAmount.amount = totalCost.toString();
    cart.cost.totalAmount.amount = totalCost.toString();
    await saveMockCart(cart);
    return cart;
  }

  const cartId = (await cookies()).get("cartId")?.value!;
  // Next Commerce only sends one lineId at a time
  if (lineIds.length !== 1)
    throw new Error("Invalid number of line items provided");

  // get the guest token to get the correct guest cart
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  const basketClient = new ShopperBaskets(config);

  const basket = await basketClient.removeItemFromBasket({
    parameters: {
      basketId: cartId,
      itemId: lineIds[0]!,
    },
  });

  const cartItems = await getCartItems(basket);
  return reshapeBasket(basket, cartItems);
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[]
) {
  if (USE_MOCK_DATA) {
    const cart = await getMockCart();
    for (const line of lines) {
      const itemIdx = cart.lines.findIndex(
        (item) => item.id === line.id || item.merchandise.id === line.merchandiseId
      );
      if (itemIdx >= 0) {
        if (line.quantity === 0) {
          cart.lines.splice(itemIdx, 1);
        } else {
          const item = cart.lines[itemIdx];
          const singlePrice = Number(item.cost.totalAmount.amount) / item.quantity;
          item.quantity = line.quantity;
          item.cost.totalAmount.amount = (singlePrice * line.quantity).toString();
        }
      }
    }
    cart.totalQuantity = cart.lines.reduce((acc, item) => acc + item.quantity, 0);
    const totalCost = cart.lines.reduce(
      (acc, item) => acc + Number(item.cost.totalAmount.amount),
      0
    );
    cart.cost.subtotalAmount.amount = totalCost.toString();
    cart.cost.totalAmount.amount = totalCost.toString();
    await saveMockCart(cart);
    return cart;
  }
  const cartId = (await cookies()).get("cartId")?.value!;
  // get the guest token to get the correct guest cart
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  const basketClient = new ShopperBaskets(config);

  // ProductItem quantity can not be updated through the API
  // Quantity updates need to remove all items from the cart and add them back with updated quantities
  // See: https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-baskets?meta=updateBasket

  // create removePromises for each line
  const removePromises = lines.map((line) =>
    basketClient.removeItemFromBasket({
      parameters: {
        basketId: cartId,
        itemId: line.id,
      },
    })
  );

  // wait for all removals to resolve
  await Promise.all(removePromises);

  // create addPromises for each line
  const addPromises = lines.map((line) =>
    basketClient.addItemToBasket({
      parameters: {
        basketId: cartId,
      },
      body: [
        {
          productId: line.merchandiseId,
          quantity: line.quantity,
        },
      ],
    })
  );

  // wait for all additions to resolve
  await Promise.all(addPromises);

  // all updates are done, get the updated basket
  const updatedBasket = await basketClient.getBasket({
    parameters: {
      basketId: cartId,
    },
  });

  const cartItems = await getCartItems(updatedBasket);
  return reshapeBasket(updatedBasket, cartItems);
}

export async function getProductRecommendations(productId: string) {
  // The Shopper APIs do not provide a recommendation service. This is typically
  // done through Einstein, which isn't available in this environment.
  // For now, we refetch the product and use the categoryId to get recommendations.
  // This fills the need for now and doesn't require changes to the UI.

  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const product = await getProduct(productId);
  const categoryId = product?.categoryId;

  if (!categoryId) return [];

  const products = await getCollectionProducts({
    collection: categoryId,
    limit: 11,
  });

  // Filter out the product we're already looking at.
  return products.filter((product) => product.id !== productId);
}

export async function revalidate(req: NextRequest) {
  const collectionWebhooks = [
    "collections/create",
    "collections/delete",
    "collections/update",
  ];
  const productWebhooks = [
    "products/create",
    "products/delete",
    "products/update",
  ];
  const topic = (await headers()).get("x-sfcc-topic") || "unknown";
  const secret = req.nextUrl.searchParams.get("secret");
  const isCollectionUpdate = collectionWebhooks.includes(topic);
  const isProductUpdate = productWebhooks.includes(topic);

  if (!secret || secret !== process.env.SFCC_REVALIDATION_SECRET) {
    console.error("Invalid revalidation secret.");
    return NextResponse.json({ status: 200 });
  }

  if (!isCollectionUpdate && !isProductUpdate) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 });
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections);
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products);
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}

async function getGuestUserAuthToken() {
  const loginClient = new ShopperLogin(apiConfig);

  try {
    return await (helpers as any).loginGuestUserPrivate(
      loginClient,
      {},
      { clientSecret: process.env.SFCC_SECRET || "" }
    );
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Failed to retrieve access token"
    );
    throw new Error(error);
  }
}

async function getGuestUserConfig(token?: string) {
  const guestToken = token || (await getGuestUserAuthToken()).access_token;
  return {
    ...apiConfig,
    headers: {
      authorization: `Bearer ${guestToken}`,
    },
  };
}

async function getSFCCCollections() {
  if (USE_MOCK_DATA) {
    return [];
  }

  const config = await getGuestUserConfig();
  const productsClient = new ShopperProducts(config);

  const result = await productsClient.getCategories({
    parameters: {
      ids: storeCatalog.ids as any,
    },
  });

  return reshapeCategories(result?.data || []);
}

async function getSFCCCollection(id: string) {
  if (USE_MOCK_DATA) {
    return null;
  }

  const config = await getGuestUserConfig();
  const productsClient = new ShopperProducts(config);
  const result = await productsClient.getCategory({
    parameters: {
      id,
      levels: 2,
    },
  });

  return reshapeCategory(result);
}

async function getSFCCCollectionProducts({
  collection: categoryId,
  limit,
  sortKey,
  query,
}: {
  collection?: string;
  limit?: number;
  sortKey?: string;
  query?: string;
}) {
  if (USE_MOCK_DATA) {
    return [];
  }

  const config = await getGuestUserConfig();

  const searchClient = new ShopperSearch(config);
  const searchResults = await (searchClient as any).productSearch({
    parameters: {
      q: query || "",
      refine: categoryId ? [`cgid=${categoryId}`] : [],
      sort: sortKey,
      limit,
    },
  });

  const uniqueHits = [
    ...new Set(searchResults.hits?.map((hit: any) => hit.productId)),
  ]
    .map((id) => searchResults.hits?.find((hit: any) => hit.productId === id))
    .filter((hit: any): hit is NonNullable<typeof hit> => hit != null);

  const productsClient = new ShopperProducts(config);

  const results = await Promise.all(
    uniqueHits.map((product) => {
      return productsClient.getProduct({
        parameters: {
          id: product.productId,
        },
      });
    })
  );

  return reshapeProducts(results);
}

async function getCartItems(createdBasket: ShopperBasketsTypes.Basket) {
  const cartItems: CartItem[] = [];

  if (createdBasket.productItems) {
    const productsInCart: Product[] = [];

    // Fetch all matching products for items in the cart
    await Promise.all(
      createdBasket.productItems
        .filter((l) => l.productId)
        .map(async (l) => {
          const product = await getProduct(l.productId!);

          if (product) {
            productsInCart.push(product);
          }
        })
    );

    // Reshape the sfcc items and push them onto the cartItems
    createdBasket.productItems.map((productItem) => {
      cartItems.push(
        reshapeProductItem(
          productItem,
          createdBasket.currency || "USD",
          productsInCart.find((p) => p.id === productItem.productId)!
        )
      );
    });
  }

  return cartItems;
}

export async function updateCustomerInfo(email: string) {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    await basketClient.updateCustomerForBasket({
      parameters: {
        basketId: cartId,
      },
      body: {
        email: email,
      },
    });
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error updating basket email"
    );
    throw new Error(error);
  }
}

export async function updateShippingAddress(
  shippingAddress: ShopperBasketsTypes.OrderAddress
) {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    // Use 'me' as the shipment ID, which refers to the current customer's default shipment
    await basketClient.updateShippingAddressForShipment({
      parameters: {
        basketId: cartId,
        shipmentId: "me",
      },
      body: shippingAddress,
    });
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error updating basket shipping address"
    );
    throw new Error(error);
  }
}

export async function updateBillingAddress(
  billingAddress: ShopperBasketsTypes.OrderAddress
) {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    await basketClient.updateBillingAddressForBasket({
      parameters: {
        basketId: cartId,
      },
      body: billingAddress,
    });
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error updating basket billing address"
    );
    throw new Error(error);
  }
}

export async function updateShippingMethod(shippingMethodId: string) {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    // Use 'me' as the shipment ID, which refers to the current customer's default shipment
    await basketClient.updateShippingMethodForShipment({
      parameters: {
        basketId: cartId,
        shipmentId: "me",
      },
      body: {
        id: shippingMethodId,
      },
    });
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error updating shipping method"
    );
    throw new Error(error);
  }
}

export async function addPaymentMethod(paymentData: {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
}) {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    // Using the simplest example with credit card payment type for demo purposes.
    // Real implementations might also incorporate 3p payment providers as well.
    await basketClient.addPaymentInstrumentToBasket({
      parameters: {
        basketId: cartId,
      },
      body: {
        amount: 0, // Calculated by server based on basket total
        paymentMethodId: "CREDIT_CARD",
        paymentCard: {
          cardType: getCardType(paymentData.cardNumber),
          maskedNumber: maskCardNumber(paymentData.cardNumber),
          expirationMonth: paymentData.expirationMonth,
          expirationYear: paymentData.expirationYear,
        },
      },
    });

    // In a real implementation, the security code would be handled by the payment processor
    // and not stored in the commerce system
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error adding payment instrument to basket"
    );
    throw new Error(error);
  }
}

export async function getShippingMethods() {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const basketClient = new ShopperBaskets(config);

    // Use 'me' as the shipment ID, which refers to the current customer's default shipment
    const shippingMethods = await basketClient.getShippingMethodsForShipment({
      parameters: {
        basketId: cartId,
        shipmentId: "me",
      },
    });

    return reshapeShippingMethods(shippingMethods);
  } catch (e) {
    const error = await ensureSDKResponseError(
      e,
      "Error fetching shipping methods"
    );
    throw new Error(error);
  }
}

export async function placeOrder() {
  const cartId = (await cookies()).get("cartId")?.value!;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  try {
    const ordersClient = new ShopperOrders(config);

    // NOTE: Need to cast to the proper type. Looks like a bug in the SDK's typedefs.
    const order = (await ordersClient.createOrder({
      body: { basketId: cartId },
    })) as ShopperOrdersTypes.Order;

    const cartItems = await getCartItems(order as any);
    return reshapeOrder(order, cartItems);
  } catch (e) {
    const error = await ensureSDKResponseError(e, "Error placing order");
    throw new Error(error);
  }
}

export async function getCheckoutOrder() {
  const orderId = (await cookies()).get("orderId")?.value;
  const guestToken = (await cookies()).get("guest_token")?.value;
  const config = await getGuestUserConfig(guestToken);

  if (!orderId) {
    return;
  }

  try {
    const ordersClient = new ShopperOrders(config);

    // NOTE: Need to cast to the proper type. Looks like a bug in the SDK's typedefs.
    const order = (await ordersClient.getOrder({
      parameters: {
        orderNo: orderId,
      },
    })) as ShopperOrdersTypes.Order;

    const cartItems = await getCartItems(order as any);
    return reshapeOrder(order, cartItems);
  } catch (e) {
    const sdkError = await ensureSDKResponseError(e);
    if (sdkError) {
      return;
    }
    throw e;
  }
}
