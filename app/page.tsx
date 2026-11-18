import { GalleryApp } from "@/components/gallery-app";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const models = await getRepository().list();
  return <GalleryApp initialModels={models} />;
}
