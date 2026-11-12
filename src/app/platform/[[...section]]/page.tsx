import { Portal } from "@/components/portal";

export default async function PlatformPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  return <Portal mode="platform" section={section?.[0] || "overview"} />;
}
