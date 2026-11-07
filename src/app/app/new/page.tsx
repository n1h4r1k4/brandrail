import { requireSession } from "@/lib/session";
import { aiEnabled } from "@/lib/ai/client";
import { SAMPLES } from "@/lib/seed/nimbus";
import { PageHeader } from "@/components/ui";
import { NewContentForm } from "./form";

export const maxDuration = 120;

export default async function NewContentPage() {
  await requireSession();
  return (
    <>
      <PageHeader
        title="New content"
        sub="Paste text, upload a DOCX or PDF, or add an image (text in the image is read with OCR). Brandrail runs rule-based checks, then a grounded AI review, before anyone else sees it."
      />
      <NewContentForm samples={SAMPLES} ai={aiEnabled()} />
    </>
  );
}
