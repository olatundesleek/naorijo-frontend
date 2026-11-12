import { Portal } from "@/components/portal";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ company?: string; product?: string; batch?: string; page?: string }>;
}) {
  const [{ section }, query] = await Promise.all([params, searchParams]);
  const page = Number(query.page);
  return <Portal
    mode="company"
    section={section?.[0] || "overview"}
    initialCompanyId={query.company || ""}
    initialProductId={query.product || ""}
    initialBatchId={query.batch || ""}
    initialPage={Number.isSafeInteger(page) && page > 0 ? page : 1}
  />;
}
