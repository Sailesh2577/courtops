import { ViewHead } from "@/components/ui";
import { PrimitivesGallery } from "@/components/PrimitivesGallery";

export default function NeedsYouPage() {
  return (
    <div className="view">
      <ViewHead
        title="Needs you"
        sub="The decision feed — only what needs you right now. (Phase 0: primitives preview below.)"
      />
      <PrimitivesGallery />
    </div>
  );
}
