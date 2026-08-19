"use client";

import { useEffect, useRef, useState } from "react";
import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/sfcc/types";

interface HomeSidebarProps {
  collections: Collection[];
}

export function HomeSidebar({ collections }: HomeSidebarProps) {


  return (
    <aside className="max-md:hidden col-span-4 relative h-full">
      <div className="sticky top-32 left-sides z-30 transition-all duration-150 pt-8">
        <ShopLinks collections={collections} />
      </div>
    </aside>
  );
}
