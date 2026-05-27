declare module "react-compare-image" {
  import type { CSSProperties, ReactNode } from "react";

  export interface ReactCompareImageProps {
    aspectRatio?: "taller" | "wider";
    handle?: ReactNode | null;
    handleSize?: number;
    hover?: boolean;
    leftImage: string;
    leftImageAlt?: string;
    leftImageCss?: CSSProperties;
    leftImageLabel?: string | null;
    onSliderPositionChange?: (position: number) => void;
    rightImage: string;
    rightImageAlt?: string;
    rightImageCss?: CSSProperties;
    rightImageLabel?: string | null;
    skeleton?: ReactNode | null;
    sliderLineColor?: string;
    sliderLineWidth?: number;
    sliderPositionPercentage?: number;
    vertical?: boolean;
  }

  const ReactCompareImage: import("react").FC<ReactCompareImageProps>;
  export default ReactCompareImage;
}
