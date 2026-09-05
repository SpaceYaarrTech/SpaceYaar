import Link from "next/link";

type SpaceYaarLogoProps = { light?: boolean; href?: string };

export function SpaceYaarLogo({ light = false, href = "/" }: SpaceYaarLogoProps) {
  return (
    <Link aria-label="SpaceYaar home" className="display-font inline-flex items-center gap-2 text-lg font-extrabold tracking-[-0.04em]" href={href}>
      <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${light ? "bg-white text-[#e53935]" : "bg-[#e53935] text-white"}`}>S</span>
      <span className={light ? "text-white" : "text-[#191817]"}>SpaceYaar</span>
    </Link>
  );
}