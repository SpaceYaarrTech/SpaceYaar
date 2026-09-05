import Link from "next/link";
import { SpaceYaarLogo } from "@/components/branding/SpaceYaarLogo";
import { ROLE_CONFIG } from "@/lib/roles/role-config";

export function OwnerHome() {
  const config = ROLE_CONFIG.owner;
  return <main className="home-page"><header className="home-header"><SpaceYaarLogo /><Link className="text-link focus-ring" href="/role-selection">Change experience</Link></header><section className="home-content"><span className="eyebrow">{config.eyebrow}</span><h1 className="display-font">{config.homeTitle}</h1><p>{config.homeDescription}</p><div className="home-placeholder"><span className="home-placeholder-number">01</span><span>Owner tools are coming into focus here.</span></div></section></main>;
}