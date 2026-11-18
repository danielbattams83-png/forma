import { notFound } from "next/navigation";
import { FrameStage } from "@/components/frame-stage";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function FramePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getRepository().get(id);
  if (!model) notFound();
  return <FrameStage src={model.src} />;
}
