import { getCollections } from "@/lib/sfcc";
import { Header } from "./index";

export async function HeaderWithData() {
  const collections = await getCollections();

  return <Header collections={collections} />;
}
