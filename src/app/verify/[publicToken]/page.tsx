import { VerificationForm } from "@/components/verification-form";

export default async function PublicVerificationPage({ params }: { params: Promise<{ publicToken: string }> }) {
  const { publicToken } = await params;
  return <VerificationForm publicToken={publicToken} />;
}
