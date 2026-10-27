import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  redirect(`/customer/upload/${itemId}`);
}
