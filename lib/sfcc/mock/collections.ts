import { Collection } from "../types";

export const mockCollections: Collection[] = [
  {
    handle: "joyco-root",
    title: "Joyco root catalog",
    description: "",
    seo: {
      title: "",
      description: "",
    },
    parentCategoryTree: [],
    updatedAt: "",
    path: "/search",
  },
  {
    handle: "timesale",
    title: "TIMESALE",
    description: "Choicomma Time Sale Collection",
    seo: {
      title: "TIMESALE",
      description: "Choicomma Time Sale Collection",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "timesale",
        name: "TIMESALE",
      },
    ],
    updatedAt: "",
    path: "/shop/timesale",
  },
  {
    handle: "outer",
    title: "OUTER",
    description: "Outerwear",
    seo: {
      title: "OUTER",
      description: "Outerwear",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "outer",
        name: "OUTER",
      },
    ],
    updatedAt: "",
    path: "/search/outer",
  },
  {
    handle: "top",
    title: "TOP",
    description: "Tops & Shirts",
    seo: {
      title: "TOP",
      description: "Tops & Shirts",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "top",
        name: "TOP",
      },
    ],
    updatedAt: "",
    path: "/search/top",
  },
  {
    handle: "bottom",
    title: "BOTTOM",
    description: "Pants & Skirts",
    seo: {
      title: "BOTTOM",
      description: "Pants & Skirts",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "bottom",
        name: "BOTTOM",
      },
    ],
    updatedAt: "",
    path: "/search/bottom",
  },
  {
    handle: "bag",
    title: "BAG",
    description: "Bags & Leather goods",
    seo: {
      title: "BAG",
      description: "Bags & Leather goods",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "bag",
        name: "BAG",
      },
    ],
    updatedAt: "",
    path: "/search/bag",
  },
  {
    handle: "shoes",
    title: "SHOES",
    description: "Footwear",
    seo: {
      title: "SHOES",
      description: "Footwear",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "shoes",
        name: "SHOES",
      },
    ],
    updatedAt: "",
    path: "/search/shoes",
  },
  {
    handle: "accessory",
    title: "ACCESSORY",
    description: "Accessories",
    seo: {
      title: "ACCESSORY",
      description: "Accessories",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "accessory",
        name: "ACCESSORY",
      },
    ],
    updatedAt: "",
    path: "/search/accessory",
  },
  {
    handle: "top-seller",
    title: "Top Seller",
    description: "",
    seo: {
      title: "",
      description: "",
    },
    parentCategoryTree: [
      {
        id: "joyco-root",
        name: "Joyco root catalog",
      },
      {
        id: "top-seller",
        name: "Top Seller",
      },
    ],
    updatedAt: "",
    path: "/search/top-seller",
  },
];
