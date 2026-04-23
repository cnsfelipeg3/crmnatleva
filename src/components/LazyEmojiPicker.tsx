import { lazy, Suspense } from "react";

// Lazy-loaded emoji picker. The @emoji-mart/data JSON (~1.2 MB) and
// @emoji-mart/react are only fetched when the picker is actually rendered,
// keeping it out of the initial bundle for LiveChat / Inbox routes.
const EmojiPickerInner = lazy(async () => {
  const [{ default: Picker }, { default: data }] = await Promise.all([
    import("@emoji-mart/react"),
    import("@emoji-mart/data"),
  ]);
  return {
    default: (props: any) => <Picker data={data} {...props} />,
  };
});

export default function LazyEmojiPicker(props: any) {
  return (
    <Suspense fallback={null}>
      <EmojiPickerInner {...props} />
    </Suspense>
  );
}
