import { ImgHTMLAttributes } from "react";

export function LazyImg({
  loading = "lazy",
  decoding = "async",
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>) {
  return <img loading={loading} decoding={decoding} {...rest} />;
}

export default LazyImg;
